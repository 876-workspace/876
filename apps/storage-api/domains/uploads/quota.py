from __future__ import annotations

from dataclasses import dataclass

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from core.bytes import format_bytes
from core.config import Settings
from core.errors import AppHTTPException, quota_exceeded, quota_suspended
from core.observability import StorageOperationContext, log_storage_event
from db.models import File, StorageQuota, UploadSession
from db.repositories.files import FileRepository
from db.repositories.quotas import QuotaRepository
from db.repositories.upload_sessions import UploadSessionRepository
from db.repositories.usage import QuotaSubject, UsageRepository
from domains.uploads.routes import UploadRoute
from domains.uploads.schemas import UploadCreate


@dataclass(frozen=True)
class QuotaAdmission:
    quota_org_id: str | None
    subjects: tuple[QuotaSubject, ...]


def quota_org_id_for_upload(body: UploadCreate) -> str | None:
    if body.owner_type == "organization":
        return body.owner_id
    return body.quota_org_id


def quota_subjects(
    *,
    owner_type: str,
    owner_id: str,
    quota_org_id: str | None,
) -> tuple[QuotaSubject, ...]:
    subjects: set[QuotaSubject] = {(owner_type, owner_id)}
    if quota_org_id is not None and owner_type != "organization":
        subjects.add(("organization", quota_org_id))
    return tuple(sorted(subjects))


async def admit_upload(
    db: AsyncSession,
    *,
    body: UploadCreate,
    route: UploadRoute,
    settings: Settings,
    context: StorageOperationContext,
    now: int,
) -> QuotaAdmission:
    quota_org_id = quota_org_id_for_upload(body)
    subjects = quota_subjects(
        owner_type=route.owner_type,
        owner_id=body.owner_id,
        quota_org_id=quota_org_id,
    )
    usage_rows = await UsageRepository(db).lock_for_update(
        subjects,
        updated_at=now,
    )
    quotas = await _resolve_quotas(
        db,
        subjects=subjects,
        quota_org_id=quota_org_id,
        settings=settings,
        context=context,
        now=now,
    )

    quota_by_subject = {
        (quota.subject_type, quota.subject_id): quota for quota in quotas
    }
    for subject in subjects:
        quota = quota_by_subject.get(subject)
        if quota is not None and quota.status == "suspended":
            _log_quota_rejection(
                context,
                subject=subject,
                error_code="storage/quota-suspended",
                limit_bytes=quota.limit_bytes,
                used_bytes=0,
                requested_bytes=body.size_bytes,
            )
            raise quota_suspended()

    max_file_bytes = min(
        [
            route.max_size_bytes,
            *[
                quota.max_file_bytes
                for quota in quotas
                if quota.max_file_bytes is not None
            ],
        ]
    )
    if body.size_bytes > max_file_bytes:
        _log_quota_rejection(
            context,
            subject=subjects[0],
            error_code="storage/file-too-large",
            limit_bytes=max_file_bytes,
            used_bytes=0,
            requested_bytes=body.size_bytes,
        )
        raise AppHTTPException(
            code="storage/file-too-large",
            message="The file exceeds the size allowed for this upload.",
            http_status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        )

    usage_by_subject = {
        (row.subject_type, row.subject_id): row for row in usage_rows
    }
    for subject in subjects:
        quota = quota_by_subject.get(subject)
        if quota is None or quota.limit_bytes is None:
            continue

        usage = usage_by_subject[subject]
        used_bytes = usage.bytes_used + usage.bytes_reserved
        if used_bytes + body.size_bytes <= quota.limit_bytes:
            continue

        remaining_bytes = max(quota.limit_bytes - used_bytes, 0)
        _log_quota_rejection(
            context,
            subject=subject,
            error_code="storage/quota-exceeded",
            limit_bytes=quota.limit_bytes,
            used_bytes=used_bytes,
            requested_bytes=body.size_bytes,
        )
        raise quota_exceeded(
            "This upload needs "
            f"{format_bytes(body.size_bytes)} but only "
            f"{format_bytes(remaining_bytes)} of "
            f"{_subject_possessive(subject[0])} "
            f"{format_bytes(quota.limit_bytes)} storage remains."
        )

    await UsageRepository(db).reserve(
        usage_rows,
        bytes_to_reserve=body.size_bytes,
        updated_at=now,
    )

    return QuotaAdmission(
        quota_org_id=quota_org_id,
        subjects=subjects,
    )


async def finalize_reservation(
    db: AsyncSession,
    *,
    upload_session: UploadSession,
    file_row: File,
    context: StorageOperationContext,
    now: int,
    verified_size_bytes: int | None,
) -> bool:
    claimed = await UploadSessionRepository(db).claim_reservation_release(
        upload_session,
        released_at=now,
    )
    if not claimed:
        return False

    subjects = quota_subjects(
        owner_type=file_row.owner_type,
        owner_id=file_row.owner_id,
        quota_org_id=file_row.quota_org_id,
    )
    usage_repository = UsageRepository(db)
    usage_rows = await usage_repository.lock_for_update(
        subjects,
        updated_at=now,
    )
    if verified_size_bytes is None:
        underflows = await usage_repository.release_reservation(
            usage_rows,
            reserved_bytes=upload_session.declared_size_bytes,
            updated_at=now,
        )
    else:
        underflows = await usage_repository.commit_reservation(
            usage_rows,
            reserved_bytes=upload_session.declared_size_bytes,
            used_bytes=verified_size_bytes,
            updated_at=now,
        )

    _log_underflows(
        context,
        underflows,
        released_bytes=upload_session.declared_size_bytes,
    )

    return True


async def release_file_usage(
    db: AsyncSession,
    *,
    file_row: File,
    context: StorageOperationContext,
    now: int,
) -> bool:
    """Return a stored file's bytes to its quota subjects, at most once.

    Called when a file stops counting -- a delete, soft or hard. The space is
    freed the moment the delete is recorded rather than when the object is
    actually reclaimed from R2, because a user who deletes a file expects the
    room back immediately; the sweep catches up with the bytes later.
    """
    claimed = await FileRepository(db).claim_quota_release(file_row, released_at=now)
    if not claimed:
        return False

    subjects = quota_subjects(
        owner_type=file_row.owner_type,
        owner_id=file_row.owner_id,
        quota_org_id=file_row.quota_org_id,
    )
    usage_repository = UsageRepository(db)
    usage_rows = await usage_repository.lock_for_update(subjects, updated_at=now)
    underflows = await usage_repository.release_usage(
        usage_rows,
        used_bytes=file_row.size_bytes,
        files_count=1,
        updated_at=now,
    )
    _log_underflows(context, underflows, released_bytes=file_row.size_bytes)

    return True


async def release_expired_reservation(
    db: AsyncSession,
    *,
    upload_session: UploadSession,
    file_row: File,
    context: StorageOperationContext,
    now: int,
) -> bool:
    """Release the bytes an abandoned upload session is still holding.

    A signed upload the browser never completed would otherwise hold its
    reservation forever, permanently shrinking the pool it was drawn from.
    """
    return await finalize_reservation(
        db,
        upload_session=upload_session,
        file_row=file_row,
        context=context,
        now=now,
        verified_size_bytes=None,
    )


def _log_underflows(
    context: StorageOperationContext,
    underflows: list[QuotaSubject],
    *,
    released_bytes: int,
) -> None:
    for subject_type, subject_id in underflows:
        log_storage_event(
            "storage.usage.underflow",
            context,
            error_code=None,
            level="warning",
            subject_type=subject_type,
            subject_id=subject_id,
            released_bytes=released_bytes,
        )


async def _resolve_quotas(
    db: AsyncSession,
    *,
    subjects: tuple[QuotaSubject, ...],
    quota_org_id: str | None,
    settings: Settings,
    context: StorageOperationContext,
    now: int,
) -> list[StorageQuota]:
    repository = QuotaRepository(db)
    quotas = await repository.get_many(subjects)
    quota_by_subject = {
        (quota.subject_type, quota.subject_id): quota for quota in quotas
    }

    for subject_type, subject_id in subjects:
        if subject_type == "platform" or (
            subject_type,
            subject_id,
        ) in quota_by_subject:
            continue

        log_storage_event(
            "storage.quota.missing_entitlement",
            context,
            error_code=None,
            level="warning",
            subject_type=subject_type,
            subject_id=subject_id,
        )
        quota = await repository.ensure_default(
            subject_type=subject_type,
            subject_id=subject_id,
            parent_org_id=(
                quota_org_id if subject_type == "user" else None
            ),
            limit_bytes=settings.default_org_limit_bytes,
            now=now,
        )
        quota_by_subject[(subject_type, subject_id)] = quota

    return [
        quota_by_subject[subject]
        for subject in subjects
        if subject in quota_by_subject
    ]


def _log_quota_rejection(
    context: StorageOperationContext,
    *,
    subject: QuotaSubject,
    error_code: str,
    limit_bytes: int | None,
    used_bytes: int,
    requested_bytes: int,
) -> None:
    log_storage_event(
        "storage.quota_rejected",
        context,
        error_code=error_code,
        level="warning",
        subject_type=subject[0],
        subject_id=subject[1],
        limit_bytes=limit_bytes,
        used_bytes=used_bytes,
        requested_bytes=requested_bytes,
    )


def _subject_possessive(subject_type: str) -> str:
    if subject_type == "organization":
        return "the organization's"
    if subject_type == "user":
        return "the user's"
    return "the subject's"
