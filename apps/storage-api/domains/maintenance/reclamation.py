from dataclasses import dataclass
from functools import partial

from sqlalchemy.ext.asyncio import AsyncSession

from core.audit import record_audit_event
from core.observability import StorageOperationContext, log_storage_event, observe_provider_call
from db.models import File, UploadSession
from db.repositories.files import FileRepository
from db.repositories.upload_sessions import UploadSessionRepository
from db.repositories.usage import UsageRepository
from domains.uploads.quota import release_expired_reservation
from providers.base import DeleteObjectInput, ObjectStorageProvider

ABANDONED_AFTER_SECONDS = 24 * 60 * 60


@dataclass(frozen=True)
class ReclamationResult:
    soft_deleted: int
    abandoned: int

    @property
    def total(self) -> int:
        return self.soft_deleted + self.abandoned


@dataclass(frozen=True)
class ReservationReleaseResult:
    sessions: int
    bytes_released: int


@dataclass(frozen=True)
class DriftRepairResult:
    subjects: int
    repaired: int
    delta_bytes: int


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


async def release_expired_reservations(
    db: AsyncSession,
    *,
    apply: bool,
    limit: int,
    now: int,
) -> ReservationReleaseResult:
    """Free the bytes held by upload sessions that expired without completing.

    Admission reserves declared bytes before signing a URL. A browser that
    never finishes the PUT leaves that reservation behind, and nothing else
    will clear it -- the completion endpoint is the only other release path and
    it is never called for these. Left alone, the pool shrinks permanently.
    """
    session_repository = UploadSessionRepository(db)
    sessions = await session_repository.list_expired_reservations(
        before=now,
        limit=limit,
        lock=apply,
    )
    if not sessions or not apply:
        return ReservationReleaseResult(
            sessions=len(sessions),
            bytes_released=sum(session.declared_size_bytes for session in sessions),
        )

    file_repository = FileRepository(db)
    released = 0
    bytes_released = 0
    for session in sessions:
        file_row = await file_repository.get_by_id(session.file_id, include_deleted=True)
        if file_row is None:
            # The file is gone, so no counter references these bytes any more.
            # Claim the release anyway so the session stops being re-selected.
            await session_repository.claim_reservation_release(session, released_at=now)
            continue

        context = _context(file_row, session)
        if not await release_expired_reservation(
            db,
            upload_session=session,
            file_row=file_row,
            context=context,
            now=now,
        ):
            continue

        if session.status == "created":
            await session_repository.mark_status(session, status="expired", updated_at=now)
        released += 1
        bytes_released += session.declared_size_bytes
        log_storage_event(
            "storage.reservation_expired",
            context,
            error_code=None,
            metric_name="reservations_expired",
            metric_value=1,
            released_bytes=session.declared_size_bytes,
        )

    return ReservationReleaseResult(sessions=released, bytes_released=bytes_released)


async def repair_usage_drift(
    db: AsyncSession,
    *,
    apply: bool,
    limit: int,
    now: int,
) -> DriftRepairResult:
    """Re-derive the least recently verified usage counters from the files.

    The counters are a cache kept by increments and decrements, so a bug or a
    partial failure can leave them wrong. Recomputing oldest-first verifies
    every subject on a rotation instead of only the ones someone thought to
    check, and a non-zero delta in production is a defect worth chasing.
    """
    repository = UsageRepository(db)
    subjects = await repository.list_stale_subjects(limit=limit)
    if not apply:
        return DriftRepairResult(subjects=len(subjects), repaired=0, delta_bytes=0)

    repaired = 0
    delta_bytes = 0
    for subject_type, subject_id in subjects:
        result = await repository.recompute(
            subject_type=subject_type,
            subject_id=subject_id,
            now=now,
        )
        if result.delta_bytes == 0 and result.files_count == result.before_files_count:
            continue

        repaired += 1
        delta_bytes += result.delta_bytes
        log_storage_event(
            "storage.usage.drift_repaired",
            _subject_context(subject_type, subject_id),
            error_code=None,
            level="warning",
            subject_type=subject_type,
            subject_id=subject_id,
            delta_bytes=result.delta_bytes,
            bytes_used=result.bytes_used,
            bytes_reserved=result.bytes_reserved,
            files_count=result.files_count,
        )

    return DriftRepairResult(subjects=len(subjects), repaired=repaired, delta_bytes=delta_bytes)


def _subject_context(subject_type: str, subject_id: str) -> StorageOperationContext:
    return StorageOperationContext(
        source_app_id=None,
        actor_id=None,
        owner_id=subject_id if subject_type == "organization" else None,
        file_id=None,
        upload_session_id=None,
        route_key=None,
    )
