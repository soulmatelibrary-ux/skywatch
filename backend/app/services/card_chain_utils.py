from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import CardLink, Log, LogCard
from app.models.user import User
from app.schemas.log import CardChainNode

_LINK_MIN = datetime.min.replace(tzinfo=timezone.utc)


@dataclass(frozen=True)
class ChainCardData:
    card_id: int
    card_title: str
    status: str
    log_id: int
    log_date: str
    log_title: str | None
    log_shift_type: str | None
    log_author: str | None


def link_sort_key(link: CardLink) -> tuple[datetime, int]:
    return (link.created_at or _LINK_MIN, link.id)


def load_ordered_links(db: Session, node_ids: set[int] | None = None) -> list[CardLink]:
    query = select(CardLink)
    if node_ids is not None:
        query = query.where(
            CardLink.source_card_id.in_(node_ids),
            CardLink.target_card_id.in_(node_ids),
        )
    links = list(db.scalars(query).all())
    links.sort(key=link_sort_key)
    return links


def build_adjacency(links: list[CardLink]) -> tuple[dict[int, set[int]], dict[int, list[int]], dict[int, list[int]]]:
    adjacency: dict[int, set[int]] = defaultdict(set)
    forward_map: dict[int, list[int]] = defaultdict(list)
    backward_map: dict[int, list[int]] = defaultdict(list)

    for link in links:
        adjacency[link.source_card_id].add(link.target_card_id)
        adjacency[link.target_card_id].add(link.source_card_id)
        forward_map[link.source_card_id].append(link.target_card_id)
        backward_map[link.target_card_id].append(link.source_card_id)

    return adjacency, forward_map, backward_map


def get_component_for_card(
    card_id: int,
    adjacency: dict[int, set[int]],
    node_ids: set[int],
) -> set[int]:
    if card_id not in node_ids:
        return set()

    visited: set[int] = set()
    queue: deque[int] = deque([card_id])
    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)
        queue.extend(adjacency.get(node, set()) - visited)
    return visited


def get_components(node_ids: set[int], adjacency: dict[int, set[int]]) -> list[set[int]]:
    components: list[set[int]] = []
    visited: set[int] = set()

    for start in sorted(node_ids):
        if start in visited:
            continue
        queue: deque[int] = deque([start])
        component: set[int] = set()
        while queue:
            node = queue.popleft()
            if node in component:
                continue
            component.add(node)
            visited.add(node)
            queue.extend(adjacency.get(node, set()) - component)
        components.append(component)

    return components


def pick_root_card_id(component: set[int], links: list[CardLink]) -> int | None:
    if not component:
        return None

    incoming: dict[int, int] = defaultdict(int)
    outgoing: dict[int, int] = defaultdict(int)
    first_outgoing_key: dict[int, tuple[datetime, int]] = {}
    for link in links:
        if link.source_card_id not in component or link.target_card_id not in component:
            continue
        incoming[link.target_card_id] += 1
        outgoing[link.source_card_id] += 1
        key = link_sort_key(link)
        prev = first_outgoing_key.get(link.source_card_id)
        if prev is None or key < prev:
            first_outgoing_key[link.source_card_id] = key

    source_only = [
        node for node in component
        if outgoing.get(node, 0) > 0 and incoming.get(node, 0) == 0
    ]
    if source_only:
        return min(source_only, key=lambda node: first_outgoing_key.get(node, (_LINK_MIN, 0)))

    component_links = [
        link for link in links
        if link.source_card_id in component and link.target_card_id in component
    ]
    if not component_links:
        return min(component)
    return component_links[0].source_card_id


def load_chain_card_map(db: Session, node_ids: set[int]) -> dict[int, ChainCardData]:
    if not node_ids:
        return {}

    rows = db.execute(
        select(
            LogCard.id.label("card_id"),
            LogCard.title.label("card_title"),
            LogCard.status,
            Log.id.label("log_id"),
            Log.date.label("log_date"),
            Log.title.label("log_title"),
            Log.shift_type.label("log_shift_type"),
            User.name.label("log_author"),
        )
        .join(Log, Log.id == LogCard.log_id)
        .join(User, User.id == Log.author_id)
        .where(
            LogCard.id.in_(node_ids),
            LogCard.is_deleted.is_(False),
            Log.is_deleted.is_(False),
        )
    ).all()

    return {
        row.card_id: ChainCardData(
            card_id=row.card_id,
            card_title=row.card_title,
            status=row.status,
            log_id=row.log_id,
            log_date=row.log_date.isoformat(),
            log_title=row.log_title,
            log_shift_type=row.log_shift_type,
            log_author=row.log_author,
        )
        for row in rows
    }


def build_chain_tree(
    root_card_id: int,
    card_map: dict[int, ChainCardData],
    forward_map: dict[int, list[int]],
) -> CardChainNode | None:
    if root_card_id not in card_map:
        return None

    seen: set[int] = set()

    def walk(card_id: int) -> CardChainNode | None:
        if card_id in seen:
            return None
        card = card_map.get(card_id)
        if not card:
            return None

        seen.add(card_id)
        children: list[CardChainNode] = []
        for child_id in forward_map.get(card_id, []):
            child = walk(child_id)
            if child:
                children.append(child)

        return CardChainNode(
            card_id=card.card_id,
            card_title=card.card_title,
            log_id=card.log_id,
            log_date=card.log_date,
            log_title=card.log_title,
            log_shift_type=card.log_shift_type,
            log_author=card.log_author,
            status=card.status,
            children=children,
        )

    return walk(root_card_id)
