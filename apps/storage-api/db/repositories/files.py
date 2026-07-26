from sqlalchemy import select
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
