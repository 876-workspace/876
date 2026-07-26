from dataclasses import dataclass
from functools import partial

from sqlalchemy.ext.asyncio import AsyncSession

from core.audit import record_audit_event
from core.observability import StorageOperationContext, log_storage_event, observe_provider_call
from db.models import File, UploadSession
from db.repositories.files import FileRepository
from db.repositories.upload_sessions import UploadSessionRepository
from providers.base import DeleteObjectInput, ObjectStorageProvider

ABANDONED_AFTER_SECONDS = 24 * 60 * 60


@dataclass(frozen=True)
class ReclamationResult:
    soft_deleted: int
    abandoned: int

    @property
    def total(self) -> int:
        return self.soft_deleted + self.abandoned


def _context(row: File, upload_session: UploadSession | None) -> StorageOperationContext:
    return StorageOperationContext(
        source_app_id=row.source_app_id,
        actor_id=row.created_by,
        owner_id=row.owner_id,
        file_id=row.id,
        upload_session_id=upload_session.id if upload_session else None,
        route_key=upload_session.route_key if upload_session else None,
    )


async def _reclaim_rows(
    db: AsyncSession,
    provider: ObjectStorageProvider,
    rows: list[File],
    upload_sessions: dict[str, UploadSession],
    *,
    apply: bool,
    now: int,
    reason: str,
) -> None:
    if not apply:
        return

    repository = FileRepository(db)
    for row in rows:
        context = _context(row, upload_sessions.get(row.id))
        await observe_provider_call(
            "delete_object",
            context,
            partial(
                provider.delete_object,
                DeleteObjectInput(bucket=row.bucket, object_key=row.object_key),
            ),
        )
        await repository.mark_purged(row, purged_at=now)
        await record_audit_event(
            db,
            context,
            owner_type=row.owner_type,
            action="file.purged",
            outcome="succeeded",
            error_code=None,
            created_at=now,
        )
        log_storage_event(
            "storage.object_reclaimed",
            context,
            error_code=None,
            metric_name="objects_reclaimed",
            metric_value=1,
            reclamation_reason=reason,
        )


async def reclaim_objects(
    db: AsyncSession,
    provider: ObjectStorageProvider,
    *,
    apply: bool,
    limit: int,
    now: int,
) -> ReclamationResult:
    repository = FileRepository(db)
    soft_deleted = await repository.list_reclaimable(limit=limit, lock=apply)
    abandoned = await repository.list_abandoned(
        before=now - ABANDONED_AFTER_SECONDS,
        limit=limit,
        lock=apply,
    )
    sessions = await UploadSessionRepository(db).latest_by_file_ids([row.id for row in (*soft_deleted, *abandoned)])

    await _reclaim_rows(
        db,
        provider,
        soft_deleted,
        sessions,
        apply=apply,
        now=now,
        reason="soft_deleted",
    )
    await _reclaim_rows(
        db,
        provider,
        abandoned,
        sessions,
        apply=apply,
        now=now,
        reason="abandoned",
    )
    return ReclamationResult(
        soft_deleted=len(soft_deleted),
        abandoned=len(abandoned),
    )
