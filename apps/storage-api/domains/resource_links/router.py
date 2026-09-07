import re
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from db.repositories.files import FileRepository
from db.repositories.resource_links import ResourceLinkRepository
from db.session import get_db
from domains.resource_links.schemas import (
    DeletedResourceLinkResponse,
    ResourceLinkCreate,
    ResourceLinkListResponse,
    ResourceLinkResponse,
)

router = APIRouter(prefix="/resource-links", tags=["Resource links"])
OPAQUE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$")
TOKEN_PATTERN = re.compile(r"^[a-z][a-z0-9-]{0,127}$")


def _error(code: str, message: str, http_status_code: int) -> AppHTTPException:
    return AppHTTPException(code=code, message=message, http_status_code=http_status_code)


def _serialize(row: object) -> ResourceLinkResponse:
    return ResourceLinkResponse(
        id=getattr(row, "id"),
        file_id=getattr(row, "file_id"),
        app_id=getattr(row, "app_id"),
        resource_type=getattr(row, "resource_type"),
        resource_id=getattr(row, "resource_id"),
        relation=getattr(row, "relation"),
        created_by=getattr(row, "created_by"),
        created_at=getattr(row, "created_at"),
    )


@router.post("", response_model=ResourceLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_link(
    body: ResourceLinkCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ResourceLinkResponse:
    opaque_ids = (
        body.file_id,
        body.app_id,
        body.resource_id,
        body.owner_id,
        body.actor_user_id,
    )
    if not all(OPAQUE_ID_PATTERN.fullmatch(value) for value in opaque_ids):
        raise _error(
            "storage/invalid-request",
            "The resource link contains an invalid opaque identifier.",
            status.HTTP_400_BAD_REQUEST,
        )
    if not TOKEN_PATTERN.fullmatch(body.resource_type) or not TOKEN_PATTERN.fullmatch(body.relation):
        raise _error(
            "storage/invalid-request",
            "Resource type and relation must use kebab-case tokens.",
            status.HTTP_400_BAD_REQUEST,
        )

    file_row = await FileRepository(db).get_by_id(body.file_id)
    if file_row is None:
        raise _error(
            "storage/file-not-found",
            "The file was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    if file_row.status != "ready":
        raise _error(
            "storage/file-not-ready",
            "Only a verified ready file can be linked to a resource.",
            status.HTTP_409_CONFLICT,
        )
    if file_row.owner_type != body.owner_type or file_row.owner_id != body.owner_id:
        raise _error(
            "storage/forbidden",
            "The file does not belong to the asserted owner.",
            status.HTTP_403_FORBIDDEN,
        )

    row = await ResourceLinkRepository(db).create(
        id=generate_id("resource_link"),
        file_id=body.file_id,
        app_id=body.app_id,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        relation=body.relation,
        created_by=body.actor_user_id,
        created_at=int(time.time()),
    )
    return _serialize(row)


@router.get("", response_model=ResourceLinkListResponse)
async def list_resource_links(
    db: Annotated[AsyncSession, Depends(get_db)],
    app_id: Annotated[str, Query(min_length=1)],
    resource_type: Annotated[str, Query(min_length=1, max_length=128)],
    resource_id: Annotated[str, Query(min_length=1)],
    relation: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
) -> ResourceLinkListResponse:
    rows = await ResourceLinkRepository(db).list_for_resource(
        app_id=app_id,
        resource_type=resource_type,
        resource_id=resource_id,
        relation=relation,
    )
    return ResourceLinkListResponse(data=[_serialize(row) for row in rows])


@router.delete("/{link_id}", response_model=DeletedResourceLinkResponse)
async def delete_resource_link(
    link_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeletedResourceLinkResponse:
    if not OPAQUE_ID_PATTERN.fullmatch(link_id):
        raise _error(
            "storage/invalid-request",
            "The resource link identifier is invalid.",
            status.HTTP_400_BAD_REQUEST,
        )
    deleted = await ResourceLinkRepository(db).delete(link_id)
    if not deleted:
        raise _error(
            "storage/resource-link-not-found",
            "The resource link was not found.",
            status.HTTP_404_NOT_FOUND,
        )
    return DeletedResourceLinkResponse(id=link_id)
