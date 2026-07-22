#!/usr/bin/env python3
"""Exit successfully only when the Billing database is at the expected revision."""

from __future__ import annotations

import asyncio
import json

from core.config import get_settings
from db.schema_ownership import HEAD_REVISION, current_revision
from db.session import make_engine


async def run() -> int:
    settings = get_settings()
    if not settings.database_url:
        print(json.dumps({"object": "billing_migration", "current": False, "error": "Database URL is missing."}))
        return 2

    engine = make_engine(settings.database_url)
    try:
        async with engine.connect() as connection:
            revision = await current_revision(connection)
    except Exception as exc:
        print(
            json.dumps(
                {
                    "object": "billing_migration",
                    "current": False,
                    "error": f"Migration check failed ({type(exc).__name__}).",
                }
            )
        )
        return 2
    finally:
        await engine.dispose()

    current = revision == HEAD_REVISION
    print(
        json.dumps(
            {
                "object": "billing_migration",
                "current": current,
                "expected_revision": HEAD_REVISION,
                "actual_revision": revision,
            },
            separators=(",", ":"),
        )
    )
    return 0 if current else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
