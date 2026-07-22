#!/usr/bin/env python3
"""Run one bounded, provider-neutral recurring Billing sweep."""

from __future__ import annotations

import argparse
import asyncio
import json

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from db.session import make_engine
from domains.billing.workflows.engine import MAX_SWEEP_LIMIT, run_billing_sweep


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=int)
    parser.add_argument("--limit", type=int, default=100)
    return parser.parse_args()


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    if settings.billing_writer != "fastapi" or not settings.database_url:
        print(
            json.dumps(
                {
                    "object": "billing_engine_run",
                    "error": "BILLING_WRITER=fastapi and BILLING_DATABASE_URL are required.",
                }
            )
        )
        return 2
    if args.as_of is not None and args.as_of < 1 or args.limit < 1 or args.limit > MAX_SWEEP_LIMIT:
        print(json.dumps({"object": "billing_engine_run", "error": "Invalid sweep bounds."}))
        return 2

    engine = make_engine(settings.database_url)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session:
            result = await run_billing_sweep(session, as_of=args.as_of, limit=args.limit)
            await session.commit()
    except Exception as exc:
        print(
            json.dumps(
                {
                    "object": "billing_engine_run",
                    "error": f"Billing sweep failed ({type(exc).__name__}).",
                }
            )
        )
        return 2
    finally:
        await engine.dispose()

    print(json.dumps(result, separators=(",", ":")))
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
