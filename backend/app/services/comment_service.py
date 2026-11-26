"""댓글 CRUD 및 반응 서비스."""
import asyncio
import re
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import Comment, CommentReaction
from app.models.user import User
from app.schemas.log import CommentOut, CommentWithRepliesOut, ReactionGroup


def _build_reaction_map(db: Session, comment_ids: list[int]) -> dict[int, list[ReactionGroup]]:
    if not comment_ids:
        return {}
    rows = db.execute(
        select(CommentReaction.comment_id, CommentReaction.emoji, CommentReaction.user_id, User.name)
        .join(User, User.id == CommentReaction.user_id)
        .where(CommentReaction.comment_id.in_(comment_ids))
    ).all()
    raw: dict[int, dict[str, tuple[list[int], list[str]]]] = {}
    for cid, emoji, uid, name in rows:
        raw.setdefault(cid, {}).setdefault(emoji, ([], []))
        raw[cid][emoji][0].append(uid)
        raw[cid][emoji][1].append(name)
    return {
        cid: [ReactionGroup(emoji=e, user_ids=v[0], user_names=v[1]) for e, v in emojis.items()]
        for cid, emojis in raw.items()
    }


def _to_out(c: Comment, author_name: str | None, reactions: list[ReactionGroup]) -> CommentOut:
    return CommentOut(
        id=c.id, log_id=c.log_id, author_id=c.author_id, author_name=author_name,
        parent_id=c.parent_id, body=c.body, created_at=c.created_at, updated_at=c.updated_at,
        is_deleted=c.is_deleted, reactions=reactions,
    )


def get_comments(db: Session, log_id: int) -> list[CommentWithRepliesOut]:
    comments = db.scalars(
        select(Comment)
        .where(
            Comment.log_id == log_id,
            Comment.is_deleted.is_(False),
        )
        .order_by(Comment.created_at)
    ).all()
    if not comments:
        return []
    author_ids = list({c.author_id for c in comments})
    users = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_(author_ids))).all()}
    reactions = _build_reaction_map(db, [c.id for c in comments])

    top_level: list[CommentWithRepliesOut] = []
    reply_map: dict[int, list[CommentOut]] = {}
    for c in comments:
        out = _to_out(c, users.get(c.author_id), reactions.get(c.id, []))
        if c.parent_id is None:
            top_level.append(CommentWithRepliesOut(**out.model_dump()))
        else:
            reply_map.setdefault(c.parent_id, []).append(out)
    for top in top_level:
        top.replies = reply_map.get(top.id, [])
    return top_level


def create_comment(db: Session, log_id: int, author_id: int, body: str,
                   parent_id: int | None) -> CommentOut:
    comment = Comment(log_id=log_id, author_id=author_id, body=body, parent_id=parent_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    author = db.get(User, author_id)
    result = _to_out(comment, author.name if author else None, [])
    _push_comment_notifications(db, comment, author)
    return result


def _push_comment_notifications(db: Session, comment: Comment, author: User | None) -> None:
    """@멘션 파싱 + 알림 생성/WebSocket 푸시."""
    from app.services.notification_service import create_notification
    from app.websocket.manager import manager

    author_name = author.name if author else "알 수 없음"
    mentioned_names = set(re.findall(r'@([a-zA-Z0-9_-]+)', comment.body or ''))
    notified: set[int] = set()

    for name in mentioned_names:
        user = db.scalars(select(User).where(User.name == name)).first()
        if user and user.id != comment.author_id:
            body = f"[멘션] {author_name}님이 댓글에서 회원님을 언급했습니다."
            notif = create_notification(db, user.id, "mention", body,
                                        ref_type="comment", ref_id=comment.id)
            _ws_push(user.id, notif.id, body)
            notified.add(user.id)

    # 일지 작성자에게 댓글 알림 (멘션이 아닌 경우)
    from app.models.log import Log
    log = db.get(Log, comment.log_id)
    if log and log.author_id != comment.author_id and log.author_id not in notified:
        body = f"[댓글] {author_name}님이 일지에 댓글을 작성했습니다."
        notif = create_notification(db, log.author_id, "comment", body,
                                    ref_type="comment", ref_id=comment.id)
        _ws_push(log.author_id, notif.id, body)


def _ws_push(user_id: int, notif_id: int, body: str) -> None:
    from app.websocket.manager import manager
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(
                manager.send_to_user(user_id, {"type": "notification", "id": notif_id, "body": body})
            )
    except RuntimeError:
        pass


def delete_comment(db: Session, comment_id: int, user_id: int, is_admin: bool) -> bool:
    comment = db.get(Comment, comment_id)
    if not comment or comment.is_deleted:
        return False
    if comment.author_id != user_id and not is_admin:
        return False
    comment.is_deleted = True
    comment.deleted_by = user_id
    db.commit()
    return True


def toggle_reaction(db: Session, comment_id: int, user_id: int, emoji: str) -> bool:
    """반응 추가/제거 토글. True=추가, False=제거."""
    existing = db.get(CommentReaction, (comment_id, user_id, emoji))
    if existing:
        db.delete(existing)
        db.commit()
        return False
    db.add(CommentReaction(comment_id=comment_id, user_id=user_id, emoji=emoji))
    db.commit()
    return True
