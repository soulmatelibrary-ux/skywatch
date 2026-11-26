"""
Backfill CardLink rows from existing card HTML content.

Usage:
  python sync_card_links.py --dry
  python sync_card_links.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.log import CardLink, LogCard
from app.utils.html_links import extract_card_ids_in_order


def run(dry_run: bool = False):
    db = SessionLocal()
    ok = skipped = 0

    try:
        cards = db.scalars(
            select(LogCard).where(LogCard.is_deleted.is_(False), LogCard.content.isnot(None))
        ).all()

        for card in cards:
            target_ids = extract_card_ids_in_order(card.content)
            existing = set(db.scalars(
                select(CardLink.target_card_id).where(CardLink.source_card_id == card.id)
            ).all())

            new_ids = [tid for tid in target_ids if tid != card.id and tid not in existing]
            if not new_ids:
                skipped += 1
                continue

            if dry_run:
                print(f"DRY card#{card.id} -> {new_ids}")
                ok += len(new_ids)
                continue

            for tid in new_ids:
                db.add(CardLink(
                    source_card_id=card.id,
                    target_card_id=tid,
                    created_by=card.created_by,
                ))
            db.commit()
            print(f"OK  card#{card.id} -> {new_ids}")
            ok += len(new_ids)

    finally:
        db.close()

    label = "(DRY RUN)" if dry_run else ""
    print(f"\n{label} complete - new links {ok}, skipped cards {skipped}")


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    print("=== DRY RUN ===\n" if dry else "=== Sync Card Links ===\n")
    run(dry_run=dry)
