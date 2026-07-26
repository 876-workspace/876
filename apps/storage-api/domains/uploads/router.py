import re
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.audit import record_audit_event
from core.errors import AppHTTPException
from core.id import generate_id
from core.observability import StorageOperationContext, log_storage_event, observe_provider_call
from db.repositories.files import FileRepository
from db.repositories.upload_sessions import UploadSessionRepository
from db.session import get_db
from domains.files.schemas import FileResponse
from domains.files.serialization import serialize_file
from domains.uploads import docs
from domains.uploads.routes import UPLOAD_ROUTES, UploadRoute
from domains.uploads.schemas import UploadComplete, UploadCreate, UploadSessionResponse
from providers.base import CreateUploadUrlInput, DeleteObjectInput, HeadObjectInput
from providers.dependencies import StorageProviderDep

router = APIRouter(prefix="/uploads", tags=["Uploads"])
OPAQUE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$")


def _error(code: str, message: str, http_status_code: int) -> AppHTTPException:
    return AppHTTPException(code=code, message=message, http_status_code=http_status_code)


def _validate_upload(body: UploadCreate) -> UploadRoute:
    route = UPLOAD_ROUTES.get(body.route_key)
    if route is None:
        raise _error(
            "storage/route-not-found",
            "The upload route was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if body.owner_type != route.owner_type:
        raise _error(
            "storage/invalid-owner",
            "The owner type is not valid for this upload.",
            status.HTTP_400_BAD_REQUEST,
        )
    if body.content_type not in route.allowed_content_types:
        raise _error(
            "storage/mime-not-allowed",
            "This file type is not allowed for this upload.",
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )
    if body.size_bytes <= 0 or body.size_bytes > route.max_size_bytes:
        raise _error(
            "storage/file-too-large",
            "The file exceeds the size allowed for this upload.",
            status.HTTP_413_CONTENT_TOO_LARGE,
        )
    if not all(OPAQUE_ID_PATTERN.fullmatch(value) for value in (body.owner_id, body.actor_user_id, body.source_app_id)):
        raise _error(
            "storage/invalid-request",
            "The request contains an invalid opaque identifier.",
            status.HTTP_400_BAD_REQUEST,
        )
    return route


def _log_completion_rejected(
    context: StorageOperationContext,
    *,
    error_code: str,
    reason: str,
) -> None:
    log_storage_event(
        "storage.completion_rejected",
        context,
        error_code=error_code,
        level="warning",
        metric_name="completions_rejected",
        metric_value=1,
        rejection_reason=reason,
    )


def _verification_rejection_reason(
    *,
    content_length: int | None,
    content_type: str | None,
    declared_size_bytes: int,
    declared_content_type: str,
    route: UploadRoute,
) -> str | None:
    if content_length is None:
        return "missing_content_length"
    if content_type is None:
        return "missing_content_type"
    if content_type not in route.allowed_content_types:
        return "content_type_not_allowed"
    if content_length <= 0 or content_length > route.max_size_bytes:
        return "invalid_size"
    if content_length != declared_size_bytes:
        return "size_mismatch"
    if content_type != declared_content_type:
        return "content_type_mismatch"
    return None


@router.post(
    "",
    response_model=UploadSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_UPLOAD_SUMMARY,
    description=docs.CREATE_UPLOAD_DESCRIPTION,
    responses=docs.CREATE_UPLOAD_RESPONSES,
)
async def create_upload(
    body: UploadCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    provider: StorageProviderDep,
) -> UploadSessionResponse:
    route = _validate_upload(body)
    settings = request.app.state.settings
    now = int(time.time())
    expires_at = now + settings.upload_ttl_seconds
    file_id = generate_id("file")
    session_id = generate_id("upload_session")
    version_id = generate_id("version")
    object_key = route.key_template.format(
        owner_id=body.owner_id,
        file_id=file_id,
        version_id=version_id,
    )
    bucket = settings.r2_assets_bucket if route.audience == "public" else settings.r2_files_bucket

    file_row = await FileRepository(db).create(
        id=file_id,
        owner_type=route.owner_type,
        owner_id=body.owner_id,
        source_app_id=body.source_app_id,
        purpose=route.purpose,
        category=route.category,
        audience=route.audience,
        provider="r2",
        bucket=bucket,
        object_key=object_key,
        version_id=version_id,
        original_name=body.file_name,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
        status="pending",
        created_by=body.actor_user_id,
        created_at=now,
        updated_at=now,
    )
    upload_session = await UploadSessionRepository(db).create(
        id=session_id,
        file_id=file_row.id,
        route_key=route.key,
        status="created",
        declared_content_type=body.content_type,
        declared_size_bytes=body.size_bytes,
        expires_at=expires_at,
        created_by=body.actor_user_id,
        created_at=now,
        updated_at=now,
    )
    context = StorageOperationContext(
        source_app_id=body.source_app_id,
        actor_id=body.actor_user_id,
        owner_id=body.owner_id,
        file_id=file_row.id,
        upload_session_id=upload_session.id,
        route_key=route.key,
    )
    output = await observe_provider_call(
        "create_upload_url",
        context,
        lambda: provider.create_upload_url(
            CreateUploadUrlInput(
                bucket=bucket,
                object_key=object_key,
                content_type=body.content_type,
                content_length=body.size_bytes,
                expires_in=settings.upload_ttl_seconds,
            )
        ),
    )
    await record_audit_event(
        db,
        context,
        owner_type=file_row.owner_type,
        action="upload_session.created",
        outcome="succeeded",
        error_code=None,
        created_at=now,
    )
    log_storage_event(
        "storage.upload_created",
        context,
        error_code=None,
        metric_name="uploads_created",
        metric_value=1,
    )
    return UploadSessionResponse(
        id=upload_session.id,
        file_id=file_row.id,
        upload_url=output.url,
        headers=output.headers,
        expires_at=upload_session.expires_at,
    )


@router.post(
    "/{session_id}/complete",
    response_model=FileResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.COMPLETE_UPLOAD_SUMMARY,
    description=docs.COMPLETE_UPLOAD_DESCRIPTION,
    responses=docs.COMPLETE_UPLOAD_RESPONSES,
)
async def complete_upload(
    session_id: str,
    _body: UploadComplete,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    provider: StorageProviderDep,
) -> FileResponse:
    session_repository = UploadSessionRepository(db)
    file_repository = FileRepository(db)
    upload_session = await session_repository.get_by_id(session_id, for_update=True)
    if upload_session is None:
        _log_completion_rejected(
            StorageOperationContext(
                source_app_id=None,
                actor_id=None,
                owner_id=None,
                file_id=None,
                upload_session_id=session_id,
                route_key=None,
            ),
            error_code="storage/upload-not-found",
            reason="upload_session_not_found",
        )
        raise _error(
            "storage/upload-not-found",
            "The upload session was not found.",
            status.HTTP_404_NOT_FOUND,
        )

    file_row = await file_repository.get_by_id(upload_session.file_id, include_deleted=True)
    if file_row is None:
        _log_completion_rejected(
            StorageOperationContext(
                source_app_id=None,
                actor_id=upload_session.created_by,
                owner_id=None,
                file_id=upload_session.file_id,
                upload_session_id=upload_session.id,
                route_key=upload_session.route_key,
            ),
            error_code="storage/file-not-found",
            reason="file_not_found",
        )
        raise _error(
            "storage/file-not-found",
            "The file was not found.",
            status.HTTP_404_NOT_FOUND,
        )

    context = StorageOperationContext(
        source_app_id=file_row.source_app_id,
        actor_id=upload_session.created_by,
        owner_id=file_row.owner_id,
        file_id=file_row.id,
        upload_session_id=upload_session.id,
        route_key=upload_session.route_key,
    )

    # Deleted rows are loaded above only so a stale session resolves to a clear
    # 404 rather than a confusing not-found-by-id. Completing one would revive
    # it -- flipping status back to ready and handing out a URL while deleted_at
    # stays populated -- so a deleted file is terminal for this session.
    if file_row.deleted_at is not None:
        _log_completion_rejected(
            context,
            error_code="storage/file-not-found",
            reason="file_deleted",
        )
        raise _error(
            "storage/file-not-found",
            "The file was not found.",
            status.HTTP_404_NOT_FOUND,
        )

    if upload_session.status == "completed":
        return serialize_file(file_row, request.app.state.settings)

    now = int(time.time())
    if now > upload_session.expires_at:
        await session_repository.mark_status(upload_session, status="expired", updated_at=now)
        await db.commit()
        _log_completion_rejected(
            context,
            error_code="storage/upload-expired",
            reason="upload_expired",
        )
        raise _error(
            "storage/upload-expired",
            "The upload session has expired.",
            status.HTTP_410_GONE,
        )

    route = UPLOAD_ROUTES[upload_session.route_key]
    try:
        head = await observe_provider_call(
            "head_object",
            context,
            lambda: provider.head_object(HeadObjectInput(bucket=file_row.bucket, object_key=file_row.object_key)),
        )
    except AppHTTPException:
        _log_completion_rejected(
            context,
            error_code="storage/provider-error",
            reason="provider_error",
        )
        raise
    if not head.exists:
        await session_repository.mark_status(upload_session, status="failed", updated_at=now)
        await file_repository.mark_status(file_row, status="failed", updated_at=now)
        await record_audit_event(
            db,
            context,
            owner_type=file_row.owner_type,
            action="file.verification_failed",
            outcome="failed",
            error_code="storage/upload-incomplete",
            created_at=now,
        )
        await db.commit()
        _log_completion_rejected(
            context,
            error_code="storage/upload-incomplete",
            reason="object_missing",
        )
        raise _error(
            "storage/upload-incomplete",
            "The uploaded object was not found.",
            status.HTTP_409_CONFLICT,
        )

    rejection_reason = _verification_rejection_reason(
        content_length=head.content_length,
        content_type=head.content_type,
        declared_size_bytes=upload_session.declared_size_bytes,
        declared_content_type=upload_session.declared_content_type,
        route=route,
    )
    if rejection_reason is not None:
        try:
            await observe_provider_call(
                "delete_object",
                context,
                lambda: provider.delete_object(
                    DeleteObjectInput(bucket=file_row.bucket, object_key=file_row.object_key)
                ),
            )
        finally:
            await session_repository.mark_status(upload_session, status="failed", updated_at=now)
            await file_repository.mark_status(file_row, status="failed", updated_at=now)
            await record_audit_event(
                db,
                context,
                owner_type=file_row.owner_type,
                action="file.verification_failed",
                outcome="failed",
                error_code="storage/upload-verification-failed",
                created_at=now,
            )
            await db.commit()
            _log_completion_rejected(
                context,
                error_code="storage/upload-verification-failed",
                reason=rejection_reason,
            )
        raise _error(
            "storage/upload-verification-failed",
            "The uploaded object did not match the signed declaration.",
            status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    await session_repository.mark_status(
        upload_session,
        status="completed",
        updated_at=now,
        completed_at=now,
    )
    await file_repository.mark_status(file_row, status="ready", updated_at=now)
    await record_audit_event(
        db,
        context,
        owner_type=file_row.owner_type,
        action="file.ready",
        outcome="succeeded",
        error_code=None,
        created_at=now,
    )
    log_storage_event(
        "storage.completion_verified",
        context,
        error_code=None,
        metric_name="completions_verified",
        metric_value=1,
    )
    log_storage_event(
        "storage.bytes_uploaded",
        context,
        error_code=None,
        metric_name="bytes_uploaded",
        metric_value=file_row.size_bytes,
    )
    return serialize_file(file_row, request.app.state.settings)
