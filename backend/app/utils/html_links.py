"""HTML card-link parsing helpers."""
import re

_CARD_LINK_RE = re.compile(
    r'data-card-id="(?P<data_id>\d+)"|href="[^"]*#card-(?P<href_id>\d+)"'
)


def extract_card_ids_in_order(html: str | None) -> list[int]:
    """Return unique linked card ids in the order they appear in the HTML."""
    if not html:
        return []

    ordered: list[int] = []
    seen: set[int] = set()
    for match in _CARD_LINK_RE.finditer(html):
        raw = match.group("data_id") or match.group("href_id")
        if not raw:
            continue
        card_id = int(raw)
        if card_id in seen:
            continue
        seen.add(card_id)
        ordered.append(card_id)
    return ordered


def extract_card_ids(html: str | None) -> set[int]:
    """Return unique linked card ids as a set."""
    return set(extract_card_ids_in_order(html))
