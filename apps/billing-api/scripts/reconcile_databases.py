#!/usr/bin/env python3
"""Compare frozen legacy and FastAPI Billing databases without exposing URLs."""

from __future__ import annotations

import argparse
import asyncio
import json

from core.config import get_settings
from db.reconciliation import compare_snapshots, snapshot_database


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--table", action="append", dest="tables", help="Limit comparison to a table; repeatable.")
    parser.add_argument("--batch-size", type=int, default=500)
    return parser.parse_args()


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    if not settings.legacy_database_url or not settings.database_url:
        print(
            json.dumps(
                {
                    "object": "billing_reconciliation",
                    "matches": False,
                    "error": "BILLING_LEGACY_DATABASE_URL and BILLING_DATABASE_URL are required.",
                }
            )
        )
        return 2
    if settings.billing_writer != "none":
        print(
            json.dumps(
                {
                    "object": "billing_reconciliation",
                    "matches": False,
                    "error": "BILLING_WRITER must be none during reconciliation.",
                }
            )
        )
        return 2
    if args.batch_size < 1:
        print(json.dumps({"object": "billing_reconciliation", "matches": False, "error": "Invalid batch size."}))
        return 2

    try:
        source = await snapshot_database(
            settings.legacy_database_url,
            tables=args.tables,
            batch_size=args.batch_size,
        )
        target = await snapshot_database(
            settings.database_url,
            tables=args.tables,
            batch_size=args.batch_size,
        )
        report = compare_snapshots(source, target)
        print(json.dumps(report.as_dict(), separators=(",", ":")))
        return 0 if report.matches else 1
    except Exception as exc:
        print(
            json.dumps(
                {
                    "object": "billing_reconciliation",
                    "matches": False,
                    "error": f"Reconciliation failed ({type(exc).__name__}).",
                }
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
