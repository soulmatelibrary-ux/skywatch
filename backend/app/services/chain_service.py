"""Card chain list service."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.log import CardStatus
from app.schemas.log import ChainInfo, ChainLogInfo
from app.schemas.log import CardChainNode
from app.services.card_chain_utils import (
    build_adjacency,
    build_chain_tree,
    get_components,
    load_chain_card_map,
    load_ordered_links,
    pick_root_card_id,
)


def _flatten(root: CardChainNode) -> list[CardChainNode]:
    result: list[CardChainNode] = []
    stack = [root]
    while stack:
        node = stack.pop(0)
        result.append(node)
        stack[:0] = node.children
    return result


def get_all_chains(db: Session) -> list[ChainInfo]:
    """Return all connected card chains with deterministic root ordering."""
    links = load_ordered_links(db)
    if not links:
        return []

    adjacency, forward_map, _ = build_adjacency(links)
    node_ids = {link.source_card_id for link in links} | {link.target_card_id for link in links}
    components = get_components(node_ids, adjacency)

    # CardStatus 조회 (key → 객체)
    status_map = {
        s.key: s
        for s in db.query(CardStatus).filter(CardStatus.is_deleted.is_(False)).all()
    }

    chains: list[ChainInfo] = []
    for component in components:
        if len(component) < 2:
            continue

        root_id = pick_root_card_id(component, links)
        if root_id is None:
            continue

        card_map = load_chain_card_map(db, component)
        if root_id not in card_map:
            continue

        root = build_chain_tree(root_id, card_map, forward_map)
        if not root:
            continue

        ordered_nodes = _flatten(root)

        seen_log_ids: set[int] = set()
        log_list: list[ChainLogInfo] = []
        for node in ordered_nodes:
            if node.log_id in seen_log_ids:
                continue
            seen_log_ids.add(node.log_id)
            log_list.append(
                ChainLogInfo(
                    log_id=node.log_id,
                    log_date=node.log_date,
                    log_title=node.log_title,
                    log_shift_type=node.log_shift_type,
                )
            )

        # 미완료 카드 중 가장 최근 일지 기준 상태 결정 (모두 완료면 "done")
        not_done = [n for n in ordered_nodes if n.status != "done"]
        if not_done:
            recent_node = max(not_done, key=lambda n: n.log_date)
            recent_key = recent_node.status
        else:
            recent_key = "done"

        status_obj = status_map.get(recent_key)
        recent_label = (status_obj.label if status_obj and status_obj.label else None)
        recent_color = status_obj.color if status_obj else None

        if recent_key == "done":
            recent_label = recent_label or "완료"
            recent_color = recent_color or "#16a34a"
        else:
            recent_label = recent_label or recent_key

        log_list.sort(
            key=lambda item: (item.log_date, item.log_shift_type or "", item.log_id),
            reverse=True,
        )

        chains.append(
            ChainInfo(
                root_card_id=root.card_id,
                root_card_title=root.card_title,
                logs=log_list,
                total_cards=len(ordered_nodes),
                completed_cards=sum(1 for node in ordered_nodes if node.status == "done"),
                recent_status_key=recent_key,
                recent_status_label=recent_label,
                recent_status_color=recent_color,
            )
        )

    chains.sort(key=lambda x: x.root_card_title)
    return chains
