"""Prune superseded `customer.ensure` rows from the Billing customer outbox.

Before payload-hash deduplication, every reconcile enqueued a fresh event per
organization whether or not anything had changed, so the outbox accumulated
many delivered duplicates per subject. Deduplication stops the growth; this
script clears the backlog it left behind.

Only `delivered` rows are considered, and the most recent delivered row per
subject is always kept, so the delivery history for each party survives.
Pending, processing, and failed rows are never touched.

Dry run (default) — reports what would be removed and changes nothing:
    .venv/bin/python -m scripts.prune_billing_customer_outbox

Apply:
    .venv/bin/python -m scripts.prune_billing_customer_outbox --apply
"""

from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import func, select

from core.config import get_settings
from db.models import BillingCustomerOutbox
from db.session import AsyncSessionLocal, _make_engine


async def _superseded_ids(session: object) -> list[str]:
    """Delivered event ids that are not the newest for their subject."""
    newest = (
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
        select(BillingCustomerOutbox.id)
        .join(
            newest,
            (BillingCustomerOutbox.subject_type == newest.c.subject_type)
            & (BillingCustomerOutbox.subject_id == newest.c.subject_id),
        )
        .where(
            BillingCustomerOutbox.status == "delivered",
            BillingCustomerOutbox.created_at < newest.c.newest_created_at,
        )
    )
    return list((await session.scalars(statement)).all())  # type: ignore[attr-defined]


async def main(apply: bool) -> None:
    engine = _make_engine(get_settings().database_url)
    AsyncSessionLocal.configure(bind=engine)

    async with AsyncSessionLocal() as session:
        total = await session.scalar(select(func.count()).select_from(BillingCustomerOutbox))
        stale = await _superseded_ids(session)

        print(f"[prune-customer-outbox] total={total} superseded_delivered={len(stale)}")
        if not stale:
            print("[prune-customer-outbox] nothing to prune")
            return

        if not apply:
            print("[prune-customer-outbox] dry run — re-run with --apply to delete")
            return

        for event_id in stale:
            event = await session.get(BillingCustomerOutbox, event_id)
            if event is not None:
                await session.delete(event)
        await session.commit()
        print(f"[prune-customer-outbox] deleted={len(stale)} remaining={(total or 0) - len(stale)}")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Delete instead of reporting.")
    asyncio.run(main(parser.parse_args().apply))
