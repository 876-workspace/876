"""Capture legacy flag state and optionally import local flags into PostHog.

Usage from apps/api:
    python scripts/migrate_feature_flags_to_posthog.py
    python scripts/migrate_feature_flags_to_posthog.py --apply
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

from dotenv import load_dotenv

_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_root)
load_dotenv(os.path.join(_api_root, ".env.development"), override=False)
load_dotenv(os.path.join(_api_root, ".env"), override=False)

from sqlalchemy.ext.asyncio import async_sessionmaker  # noqa: E402

from core.config import get_settings  # noqa: E402
from db.models import Base, FeatureFlagMigrationArchive  # noqa: E402
from db.session import _make_engine  # noqa: E402
from services.feature_flag_migration import (  # noqa: E402
    capture_legacy_feature_snapshot,
    import_snapshot_to_posthog,
    remove_legacy_feature_columns,
)


async def run(*, apply: bool) -> None:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required.")

    engine = _make_engine(settings.database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(
                lambda sync_connection: Base.metadata.create_all(
                    sync_connection,
                    tables=[FeatureFlagMigrationArchive.__table__],
                    checkfirst=True,
                )
            )

        async with sessions() as session:
            archive = await capture_legacy_feature_snapshot(session)
            await session.commit()
            print(
                json.dumps(
                    {
                        "archive_id": archive.id,
                        "checksum": archive.checksum,
                        "counts": archive.counts,
                        "status": archive.status,
                    },
                    sort_keys=True,
                )
            )

            if not apply:
                return

            result = await import_snapshot_to_posthog(session, archive)
            await session.commit()
            await remove_legacy_feature_columns(session)
            await session.commit()
            print(json.dumps(result, sort_keys=True))
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Create/reconcile PostHog flags, switch local mappings, and remove "
            "legacy provider columns after the archive is committed."
        ),
    )
    args = parser.parse_args()
    asyncio.run(run(apply=args.apply))


if __name__ == "__main__":
    main()
