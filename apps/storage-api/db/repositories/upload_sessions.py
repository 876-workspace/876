from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import UploadSession


class UploadSessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        id: str,
        file_id: str,
        route_key: str,
        status: str,
        declared_content_type: str,
        declared_size_bytes: int,
        expires_at: int,
        created_by: str,
        created_at: int,
        updated_at: int,
    ) -> UploadSession:
        row = UploadSession(
            id=id,
            file_id=file_id,
            route_key=route_key,
            status=status,
            declared_content_type=declared_content_type,
            declared_size_bytes=declared_size_bytes,
            expires_at=expires_at,
            created_by=created_by,
            created_at=created_at,
            updated_at=updated_at,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def get_by_id(self, session_id: str, *, for_update: bool = False) -> UploadSession | None:
        statement = select(UploadSession).where(UploadSession.id == session_id)
        if for_update:
            statement = statement.with_for_update()
        return (await self.db.scalars(statement)).first()

    async def mark_status(
        self,
        row: UploadSession,
        *,
        status: str,
        updated_at: int,
        completed_at: int | None = None,
    ) -> UploadSession:
        row.status = status
        row.updated_at = updated_at
        row.completed_at = completed_at
        await self.db.flush()
        return row
