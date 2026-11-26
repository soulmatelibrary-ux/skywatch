# -*- coding: utf-8 -*-
from app.db.session import SessionLocal
from app.services.vector_service import backfill_log_vectors

db = SessionLocal()

print("=" * 60)
print("[OK] Starting backfill for existing logs...")
print("=" * 60)

try:
    result = backfill_log_vectors(db, batch_size=50)
    print(f"\nBackfill Result:")
    print(f"  Total logs without vectors: {result['total']}")
    print(f"  Processed: {result['processed']}")
    print(f"  Total chunks created: {result['chunks']}")
    print(f"\n[OK] Backfill complete!")
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
