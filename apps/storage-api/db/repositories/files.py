from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import File


class FileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        id: str,
        owner_type: str,
        owner_id: str,
        source_app_id: str,
        purpose: str,
        category: str,
        audience: str,
        provider: str,
        bucket: str,
        object_key: str,
        version_id: str,
        original_name: str,
        content_type: str,
        size_bytes: int,
        status: str,
        created_by: str,
        created_at: int,
        updated_at: int,
        quota_org_id: str | None = None,
    ) -> File:
        row = File(
            id=id,
            owner_type=owner_type,
            owner_id=owner_id,
            source_app_id=source_app_id,
            purpose=purpose,
            category=category,
            audience=audience,
            provider=provider,
            bucket=bucket,
            object_key=object_key,
            version_id=version_id,
            original_name=original_name,
            content_type=content_type,
            size_bytes=size_bytes,
            status=status,
            created_by=created_by,
            quota_org_id=quota_org_id,
            created_at=created_at,
            updated_at=updated_at,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def get_by_id(self, file_id: str, *, include_deleted: bool = False) -> File | None:
        statement = select(File).where(File.id == file_id)
        if not include_deleted:
            statement = statement.where(File.deleted_at.is_(None))
        return (await self.db.scalars(statement)).first()

    async def mark_status(self, row: File, *, status: str, updated_at: int) -> File:
        row.status = status
        row.updated_at = updated_at
        await self.db.flush()
        return row

    async def delete(
        self,
        row: File,
        *,
        deletion_mode: str,
        deleted_at: int,
        deleted_by: str | None,
        deletion_reason: str | None,
    ) -> None:
        if deletion_mode == "hard":
            await self.db.delete(row)
            await self.db.flush()
            return
        row.status = "deleted"
        row.deleted_at = deleted_at
        row.deleted_by = deleted_by
        row.deletion_reason = deletion_reason
        row.updated_at = deleted_at
        await self.db.flush()

    async def list_reclaimable(self, *, limit: int = 100, lock: bool = False) -> list[File]:
        """Soft-deleted files whose R2 object has not been reclaimed yet.

        `status == "deleted"` is the terminal marker set once the object is
        gone, so this stays correct across repeated runs without a separate
        bookkeeping column.
        """
        stmt = (
            select(File)
            .where(File.deleted_at.is_not(None))
            .where(File.purged_at.is_(None))
            .order_by(File.deleted_at)
            .limit(limit)
        )
        if lock:
            stmt = stmt.with_for_update(skip_locked=True)
        return list((await self.db.scalars(stmt)).all())

    async def list_abandoned(self, *, before: int, limit: int = 100, lock: bool = False) -> list[File]:
        """Files whose bytes may exist in R2 but which never became ready.

        A signed upload that is never completed leaves an object with no live
        metadata pointing at it; those are only safe to reclaim once the
        session that could still complete them has expired.
        """
        stmt = (
            select(File)
            .where(File.deleted_at.is_(None))
            .where(File.purged_at.is_(None))
            .where(File.status.in_(("pending", "failed")))
            .where(File.updated_at < before)
            .order_by(File.updated_at)
            .limit(limit)
        )
        if lock:
            stmt = stmt.with_for_update(skip_locked=True)
        return list((await self.db.scalars(stmt)).all())

    async def list_for_admin(
        self,
        *,
        owner_type: str | None = None,
        owner_id: str | None = None,
        created_by: str | None = None,
        source_app_id: str | None = None,
        purpose: str | None = None,
        category: str | None = None,
        status: str | None = None,
        quota_org_id: str | None = None,
        include_deleted: bool = False,
        limit: int = 25,
        starting_after: str | None = None,
    ) -> list[File]:
        """Files matching an administrator's filters, newest first.

        Deleted rows are excluded unless asked for, so a Console list cannot
        show a tombstone by accident -- `.claude/rules/deletions.md` requires an
        explicit opt-in.
        """
        statement = select(File)
        if not include_deleted:
            statement = statement.where(File.deleted_at.is_(None))
        for column, value in (
            (File.owner_type, owner_type),
            (File.owner_id, owner_id),
            (File.created_by, created_by),
            (File.source_app_id, source_app_id),
            (File.purpose, purpose),
            (File.category, category),
            (File.status, status),
            (File.quota_org_id, quota_org_id),
        ):
            if value is not None:
                statement = statement.where(column == value)
        if starting_after is not None:
            statement = statement.where(File.id > starting_after)
        statement = statement.order_by(File.created_at.desc(), File.id.desc()).limit(limit)
        return list((await self.db.scalars(statement)).all())

    async def mark_purged(self, row: File, *, purged_at: int) -> File:
        row.purged_at = purged_at
        row.updated_at = purged_at
        await self.db.flush()
        return row

    async def claim_quota_release(self, row: File, *, released_at: int) -> bool:
        """Claim the right to return this file's bytes to its quota subjects.

        Decrementing twice would hand the owner free storage, so the claim is a
        conditional UPDATE and only the caller that wins it may decrement.
        """
        claimed_id = await self.db.scalar(
            update(File)
            .where(File.id == row.id)
            .where(File.quota_released_at.is_(None))
            .values(quota_released_at=released_at)
            .returning(File.id)
        )
        if claimed_id is None:
            return False

        await self.db.refresh(row)
        return True
