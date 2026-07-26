import time
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.repositories.files import FileRepository
from db.session import get_db
from domains.files import docs
from domains.files.schemas import FileDeleteResponse, FileResponse, ReadUrlRequest, ReadUrlResponse
from domains.files.serialization import public_asset_url, serialize_file
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
    await repository.delete(
        row,
        deletion_mode=request.app.state.settings.deletion_mode,
        deleted_at=int(time.time()),
        deleted_by=None,
        deletion_reason=None,
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
    output = await provider.create_read_url(
        CreateReadUrlInput(bucket=row.bucket, object_key=row.object_key, expires_in=body.expires_in)
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
