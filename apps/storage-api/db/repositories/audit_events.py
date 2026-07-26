from sqlalchemy.ext.asyncio import AsyncSession

from db.models import AuditEvent


class AuditEventRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        id: str,
        actor_id: str | None,
        source_app_id: str,
        owner_type: str,
        owner_id: str,
        file_id: str,
        upload_session_id: str | None,
        request_id: str | None,
        action: str,
        outcome: str,
        error_code: str | None,
        created_at: int,
    ) -> AuditEvent:
        row = AuditEvent(
            id=id,
            actor_id=actor_id,
            source_app_id=source_app_id,
            owner_type=owner_type,
            owner_id=owner_id,
            file_id=file_id,
            upload_session_id=upload_session_id,
            request_id=request_id,
            action=action,
            outcome=outcome,
            error_code=error_code,
            created_at=created_at,
        )
        self.db.add(row)
        await self.db.flush()
        return row
