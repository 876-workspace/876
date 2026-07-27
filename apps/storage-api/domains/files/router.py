import time
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.audit import record_audit_event
from core.errors import AppHTTPException
from core.observability import StorageOperationContext, log_storage_event, observe_provider_call
from db.repositories.files import FileRepository
from db.repositories.upload_sessions import UploadSessionRepository
from db.session import get_db
from domains.files import docs
from domains.files.schemas import FileDeleteResponse, FileResponse, ReadUrlRequest, ReadUrlResponse
from domains.files.serialization import public_asset_url, serialize_file
from domains.uploads.quota import release_file_usage
from providers.base import CreateReadUrlInput
from providers.dependencies import StorageProviderDep

router = APIRouter(prefix="/files", tags=["Files"])


def _not_found() -> AppHTTPException:
    return AppHTTPException(
        code="storage/file-not-found",
        message="The file was not found.",
        http_status_code=status.HTTP_404_NOT_FOUND,
    )


@router.delete(
    "/{file_id}",
    response_model=FileDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_FILE_SUMMARY,
    description=docs.DELETE_FILE_DESCRIPTION,
    responses=docs.DELETE_FILE_RESPONSES,
)
async def delete_file(
    file_id: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileDeleteResponse:
    repository = FileRepository(db)
    row = await repository.get_by_id(file_id)
    if row is None:
        raise _not_found()
    upload_session = (await UploadSessionRepository(db).latest_by_file_ids([row.id])).get(row.id)
    context = StorageOperationContext(
        source_app_id=row.source_app_id,
        actor_id=row.created_by,
        owner_id=row.owner_id,
        file_id=row.id,
        upload_session_id=upload_session.id if upload_session else None,
        route_key=upload_session.route_key if upload_session else None,
    )
    now = int(time.time())
    deletion_mode = request.app.state.settings.deletion_mode

    # Only a ready file was ever counted, and the release has to happen before
    # a hard delete removes the row the byte count is read from.
    if row.status == "ready":
        await release_file_usage(db, file_row=row, context=context, now=now)

    await repository.delete(
        row,
        deletion_mode=deletion_mode,
        deleted_at=now,
        deleted_by=None,
        deletion_reason=None,
    )
    action = "file.soft_deleted" if deletion_mode == "soft" else "file.hard_deleted"
    await record_audit_event(
        db,
        context,
        owner_type=row.owner_type,
        action=action,
        outcome="succeeded",
        error_code=None,
        created_at=now,
    )
    log_storage_event(
        "storage.file_soft_deleted" if deletion_mode == "soft" else "storage.file_hard_deleted",
        context,
        error_code=None,
    )
    return FileDeleteResponse(id=file_id)


@router.post(
    "/{file_id}/read-url",
    response_model=ReadUrlResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.READ_FILE_URL_SUMMARY,
    description=docs.READ_FILE_URL_DESCRIPTION,
    responses=docs.READ_FILE_URL_RESPONSES,
)
async def create_file_read_url(
    file_id: str,
    body: ReadUrlRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    provider: StorageProviderDep,
) -> ReadUrlResponse:
    row = await FileRepository(db).get_by_id(file_id)
    if row is None or row.status != "ready":
        raise _not_found()
    settings = request.app.state.settings
    if row.audience == "public":
        return ReadUrlResponse(url=public_asset_url(settings, row), expires_at=None)
    upload_session = (await UploadSessionRepository(db).latest_by_file_ids([row.id])).get(row.id)
    context = StorageOperationContext(
        source_app_id=row.source_app_id,
        actor_id=row.created_by,
        owner_id=row.owner_id,
        file_id=row.id,
        upload_session_id=upload_session.id if upload_session else None,
        route_key=upload_session.route_key if upload_session else None,
    )
    output = await observe_provider_call(
        "create_read_url",
        context,
        lambda: provider.create_read_url(
            CreateReadUrlInput(bucket=row.bucket, object_key=row.object_key, expires_in=body.expires_in)
        ),
    )
    return ReadUrlResponse(url=output.url, expires_at=int(time.time()) + body.expires_in)


@router.get(
    "/{file_id}",
    response_model=FileResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_FILE_SUMMARY,
    description=docs.RETRIEVE_FILE_DESCRIPTION,
    responses=docs.RETRIEVE_FILE_RESPONSES,
)
async def retrieve_file(
    file_id: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    row = await FileRepository(db).get_by_id(file_id)
    if row is None:
        raise _not_found()
    return serialize_file(row, request.app.state.settings)
