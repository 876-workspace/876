import secrets

from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_request_id
from core.observability import StorageOperationContext, log_storage_event
from db.repositories.audit_events import AuditEventRepository


async def record_audit_event(
    db: AsyncSession,
    context: StorageOperationContext,
    *,
    owner_type: str,
    action: str,
    outcome: str,
    error_code: str | None,
    created_at: int,
) -> None:
    try:
        if context.source_app_id is None or context.owner_id is None or context.file_id is None:
            raise ValueError("Audit events require source app, owner, and file identifiers.")
        async with db.begin_nested():
            await AuditEventRepository(db).create(
                id=f"aud_{secrets.token_urlsafe(18)}",
                actor_id=context.actor_id,
                source_app_id=context.source_app_id,
                owner_type=owner_type,
                owner_id=context.owner_id,
                file_id=context.file_id,
                upload_session_id=context.upload_session_id,
                request_id=get_request_id() or None,
                action=action,
                outcome=outcome,
                error_code=error_code,
                created_at=created_at,
            )
    except Exception as exc:
        log_storage_event(
            "storage.audit_write_failed",
            context,
            error_code="storage/audit-write-failed",
            level="error",
            audit_action=action,
            audit_error_type=type(exc).__name__,
        )
