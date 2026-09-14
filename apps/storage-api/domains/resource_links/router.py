import re
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from db.models import ResourceLink
from db.repositories.files import FileRepository
from db.repositories.resource_links import ResourceLinkRepository
from db.session import get_db
from domains.files.authorization import (
    CallerDep,
    authorize_file_delete,
    authorize_file_read,
)
from domains.resource_links.schemas import (
    DeletedResourceLinkResponse,
    ResourceLinkCreate,
    ResourceLinkListResponse,
    ResourceLinkResponse,
)

router = APIRouter(prefix="/resource-links", tags=["Resource links"])
OPAQUE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$")
TOKEN_PATTERN = re.compile(r"^[a-z][a-z0-9-]{0,127}$")


def _error(code: str) -> AppHTTPException:
    return AppHTTPException(code=code)


def _link_not_found() -> AppHTTPException:
    """One opaque error for "no such link" and "not yours" alike.

    A link names a file plus somebody else's resource id. Answering 403 for a
    link that exists and 404 for one that does not would let any internal-key
    holder enumerate which items, invoices, or conversations in another
    organization carry media.
    """
    return _error("storage/resource-link-not-found")


def _serialize(row: ResourceLink) -> ResourceLinkResponse:
    return ResourceLinkResponse(
        id=row.id,
        file_id=row.file_id,
        app_id=row.app_id,
        resource_type=row.resource_type,
        resource_id=row.resource_id,
        relation=row.relation,
        created_by=row.created_by,
        created_at=row.created_at,
    )


@router.post("", response_model=ResourceLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_link(
    body: ResourceLinkCreate,
    caller: CallerDep,
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
        raise _error("storage/invalid-request")
    if not TOKEN_PATTERN.fullmatch(body.resource_type) or not TOKEN_PATTERN.fullmatch(body.relation):
        raise _error("storage/invalid-request")

    file_row = await FileRepository(db).get_by_id(body.file_id)
    if file_row is None:
        raise _error("storage/file-not-found")
    if file_row.status != "ready":
        raise _error("storage/file-not-ready")
    if file_row.owner_type != body.owner_type or file_row.owner_id != body.owner_id:
        raise _error("storage/forbidden")

    # The owner in the body is the caller's own claim about the file. Matching it
    # proves the caller guessed the owner correctly, not that it is that owner —
    # so the file's real disclosure rule still has to be satisfied before its
    # bytes can be attached to a resource the caller chose.
    authorize_file_read(file_row, caller)

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
    caller: CallerDep,
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

    # Storage knows who owns a *file*; it cannot know who owns another app's
    # *resource*. So the only check available here is per-file disclosure, and a
    # caller with no right to any of them sees an empty list rather than a
    # denial — identical to a resource that genuinely has no media.
    files = FileRepository(db)
    visible: list[ResourceLinkResponse] = []
    for row in rows:
        file_row = await files.get_by_id(row.file_id)
        if file_row is None:
            continue
        try:
            authorize_file_read(file_row, caller)
        except AppHTTPException:
            continue
        visible.append(_serialize(row))

    return ResourceLinkListResponse(data=visible)


@router.delete("/{link_id}", response_model=DeletedResourceLinkResponse)
async def delete_resource_link(
    link_id: str,
    caller: CallerDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeletedResourceLinkResponse:
    if not OPAQUE_ID_PATTERN.fullmatch(link_id):
        raise _error("storage/invalid-request")
    links = ResourceLinkRepository(db)
    row = await links.get_by_id(link_id)
    if row is None:
        raise _link_not_found()

    file_row = await FileRepository(db).get_by_id(row.file_id)
    if file_row is None:
        raise _link_not_found()

    # Detaching an image is not destroying it, but it still removes an
    # organization's branding from its own record, so the bar is the same one
    # the files domain sets for removal: act as the owner.
    try:
        authorize_file_delete(file_row, caller)
    except AppHTTPException:
        raise _link_not_found() from None

    if not await links.delete(link_id):
        raise _link_not_found()

    return DeletedResourceLinkResponse(id=link_id)
