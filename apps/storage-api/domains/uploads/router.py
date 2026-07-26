import re
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
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
    output = await provider.create_upload_url(
        CreateUploadUrlInput(
            bucket=bucket,
            object_key=object_key,
            content_type=body.content_type,
            content_length=body.size_bytes,
            expires_in=settings.upload_ttl_seconds,
        )
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
        raise _error(
            "storage/upload-not-found",
            "The upload session was not found.",
            status.HTTP_404_NOT_FOUND,
        )

    file_row = await file_repository.get_by_id(upload_session.file_id, include_deleted=True)
    if file_row is None:
        raise _error(
            "storage/file-not-found",
            "The file was not found.",
            status.HTTP_404_NOT_FOUND,
        )

    # Deleted rows are loaded above only so a stale session resolves to a clear
    # 404 rather than a confusing not-found-by-id. Completing one would revive
    # it -- flipping status back to ready and handing out a URL while deleted_at
    # stays populated -- so a deleted file is terminal for this session.
    if file_row.deleted_at is not None:
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
        raise _error(
            "storage/upload-expired",
            "The upload session has expired.",
            status.HTTP_410_GONE,
        )

    route = UPLOAD_ROUTES[upload_session.route_key]
    head = await provider.head_object(HeadObjectInput(bucket=file_row.bucket, object_key=file_row.object_key))
    if not head.exists:
        await session_repository.mark_status(upload_session, status="failed", updated_at=now)
        await file_repository.mark_status(file_row, status="failed", updated_at=now)
        await db.commit()
        raise _error(
            "storage/upload-incomplete",
            "The uploaded object was not found.",
            status.HTTP_409_CONFLICT,
        )

    verified = (
        head.content_length == upload_session.declared_size_bytes
        and head.content_type == upload_session.declared_content_type
        and head.content_type in route.allowed_content_types
        and head.content_length is not None
        and 0 < head.content_length <= route.max_size_bytes
    )
    if not verified:
        try:
            await provider.delete_object(DeleteObjectInput(bucket=file_row.bucket, object_key=file_row.object_key))
        finally:
            await session_repository.mark_status(upload_session, status="failed", updated_at=now)
            await file_repository.mark_status(file_row, status="failed", updated_at=now)
            await db.commit()
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
    return serialize_file(file_row, request.app.state.settings)
