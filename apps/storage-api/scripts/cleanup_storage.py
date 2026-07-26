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
from db.repositories.files import FileRepository
from db.session import make_engine
from providers.base import DeleteObjectInput, ObjectStorageProvider
from providers.r2 import R2ObjectStorageProvider

# An upload session lives for minutes; a file still pending well past that is
# never going to complete. The generous margin keeps a slow client from having
# its bytes deleted out from under an in-flight upload.
ABANDONED_AFTER_SECONDS = 24 * 60 * 60


async def _reclaim(
    provider: ObjectStorageProvider,
    bucket: str,
    object_key: str,
    *,
    apply: bool,
) -> None:
    if not apply:
        return
    await provider.delete_object(DeleteObjectInput(bucket=bucket, object_key=object_key))


async def run(*, apply: bool, limit: int) -> int:
    settings = get_settings()
    engine = make_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    provider = R2ObjectStorageProvider(settings)

    deleted = 0
    abandoned = 0

    async with session_factory() as db:
        files = FileRepository(db)

        for row in await files.list_reclaimable(limit=limit):
            await _reclaim(provider, row.bucket, row.object_key, apply=apply)
            if apply:
                await files.mark_purged(row, purged_at=int(time.time()))
            deleted += 1

        cutoff = int(time.time()) - ABANDONED_AFTER_SECONDS
        for row in await files.list_abandoned(before=cutoff, limit=limit):
            await _reclaim(provider, row.bucket, row.object_key, apply=apply)
            if apply:
                await files.mark_purged(row, purged_at=int(time.time()))
            abandoned += 1

        if apply:
            await db.commit()

    await engine.dispose()

    mode = "reclaimed" if apply else "would reclaim"
    print(f"{mode}: {deleted} soft-deleted, {abandoned} abandoned")
    if not apply:
        print("dry run — pass --apply to delete objects")
    return deleted + abandoned


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Actually delete objects.")
    parser.add_argument("--limit", type=int, default=100, help="Max rows per category.")
    args = parser.parse_args()

    asyncio.run(run(apply=args.apply, limit=args.limit))


if __name__ == "__main__":
    main()
