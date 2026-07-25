"""Prune superseded `customer.ensure` rows from the Billing customer outbox.

Before payload-hash deduplication, every reconcile enqueued a fresh event per
organization whether or not anything had changed, so the outbox accumulated
many delivered duplicates per subject. Deduplication stops the growth; this
script clears the backlog it left behind.

A row is superseded when a *newer delivered* row exists for the same subject:

- `delivered` duplicates — the party synced again afterwards, so the older
  delivery record is redundant.
- `failed` rows older than that delivery — the work they represent has since
  succeeded, so retrying them is pointless. Worse, a `failed` row queued
  before the party snapshot existed carries only a name and email, so a retry
  would re-sync the customer from a poorer payload.

The newest delivered row per subject is always kept, so every party retains a
delivery record. `pending` and `processing` rows, and any `failed` row that is
the newest event for its subject (real undelivered work), are never touched.

Dry run (default) — reports what would be removed and changes nothing:
    .venv/bin/python -m scripts.prune_billing_customer_outbox

Write the rows to be removed to a JSON backup, then delete them:
    .venv/bin/python -m scripts.prune_billing_customer_outbox \\
        --backup outbox-backup.json --apply
"""

from __future__ import annotations

import argparse
import asyncio
import json
from collections import Counter
from pathlib import Path
from typing import Any

from sqlalchemy import func, select

from core.config import get_settings
from db.models import BillingCustomerOutbox
from db.session import AsyncSessionLocal, _make_engine


async def _superseded_rows(session: Any) -> list[BillingCustomerOutbox]:
    """Rows made redundant by a newer successful delivery for the same subject."""
    newest_delivery = (
        select(
            BillingCustomerOutbox.subject_type,
            BillingCustomerOutbox.subject_id,
            func.max(BillingCustomerOutbox.created_at).label("newest_created_at"),
        )
        .where(BillingCustomerOutbox.status == "delivered")
        .group_by(BillingCustomerOutbox.subject_type, BillingCustomerOutbox.subject_id)
        .subquery()
    )

    statement = (
        select(BillingCustomerOutbox)
        .join(
            newest_delivery,
            (BillingCustomerOutbox.subject_type == newest_delivery.c.subject_type)
            & (BillingCustomerOutbox.subject_id == newest_delivery.c.subject_id),
        )
        .where(
            # `pending` and `processing` are live work and are never pruned.
            BillingCustomerOutbox.status.in_(("delivered", "failed")),
            BillingCustomerOutbox.created_at < newest_delivery.c.newest_created_at,
        )
        .order_by(BillingCustomerOutbox.created_at, BillingCustomerOutbox.id)
    )
    return list((await session.scalars(statement)).all())


def _as_dict(row: BillingCustomerOutbox) -> dict[str, Any]:
    return {
        column.key: getattr(row, column.key) for column in row.__mapper__.column_attrs
    }


async def main(apply: bool, backup_path: str | None) -> None:
    engine = _make_engine(get_settings().database_url)
    AsyncSessionLocal.configure(bind=engine)

    try:
        async with AsyncSessionLocal() as session:
            total = await session.scalar(select(func.count()).select_from(BillingCustomerOutbox))
            stale = await _superseded_rows(session)

            by_status = Counter(row.status for row in stale)
            summary = ", ".join(f"{status}={count}" for status, count in sorted(by_status.items()))
            print(f"[prune-customer-outbox] total={total} superseded={len(stale)} ({summary or 'none'})")

            if not stale:
                print("[prune-customer-outbox] nothing to prune")
                return

            if backup_path:
                payload = [_as_dict(row) for row in stale]
                Path(backup_path).write_text(json.dumps(payload, indent=2, default=str))
                print(f"[prune-customer-outbox] wrote backup of {len(payload)} rows to {backup_path}")

            if not apply:
                print("[prune-customer-outbox] dry run — re-run with --apply to delete")
                return

            for row in stale:
                await session.delete(row)
            await session.commit()

            remaining = await session.scalar(select(func.count()).select_from(BillingCustomerOutbox))
            print(f"[prune-customer-outbox] deleted={len(stale)} remaining={remaining}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Delete instead of reporting.")
    parser.add_argument("--backup", help="Write the rows to be removed to this JSON file first.")
    args = parser.parse_args()
    asyncio.run(main(args.apply, args.backup))
