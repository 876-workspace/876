"""Reclaim R2 objects that no live metadata points at.

Files are soft-deleted per `.claude/rules/deletions.md`, so deleting a file
only writes tombstone columns — the bytes stay in R2. A signed upload that is
never completed leaves bytes behind the same way. Both are reclaimed here,
never inline in a request, so a delete stays fast and a provider outage cannot
fail a user-facing call.

Run with no arguments for a dry run; pass ``--apply`` to actually delete.

    python -m scripts.cleanup_storage            # report only
    python -m scripts.cleanup_storage --apply
"""

import argparse
import asyncio
import time

from sqlalchemy.ext.asyncio import async_sessionmaker

from core.config import get_settings
from db.session import make_engine
from domains.maintenance.reclamation import reclaim_objects
from providers.r2 import R2ObjectStorageProvider


async def run(*, apply: bool, limit: int) -> int:
    settings = get_settings()
    engine = make_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    provider = R2ObjectStorageProvider(settings)

    async with session_factory() as db:
        result = await reclaim_objects(
            db,
            provider,
            apply=apply,
            limit=limit,
            now=int(time.time()),
        )
        if apply:
            await db.commit()

    await engine.dispose()

    mode = "reclaimed" if apply else "would reclaim"
    print(f"{mode}: {result.soft_deleted} soft-deleted, {result.abandoned} abandoned")
    if not apply:
        print("dry run — pass --apply to delete objects")
    return result.total


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Actually delete objects.")
    parser.add_argument("--limit", type=int, default=100, help="Max rows per category.")
    args = parser.parse_args()

    asyncio.run(run(apply=args.apply, limit=args.limit))


if __name__ == "__main__":
    main()
