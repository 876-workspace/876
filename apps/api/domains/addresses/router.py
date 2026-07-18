from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.repositories.addresses import AddressRepository
from db.session import get_db
from domains.addresses.schemas import (
    AddressCreate,
    AddressDeleteResponse,
    AddressResponse,
    AddressUpdate,
)

from . import docs

router = APIRouter(prefix="/addresses", tags=["Addresses"])


def _serialize(row: object) -> AddressResponse:
    return AddressResponse.model_validate(row)


@router.get(
    "",
    response_model=ListObject[AddressResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_ADDRESSES_SUMMARY,
    description=docs.LIST_ADDRESSES_DESCRIPTION,
    responses=docs.LIST_ADDRESSES_RESPONSES,
)
async def list_addresses(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    userId: Annotated[str | None, Query(alias="userId")] = None,
    organizationId: Annotated[str | None, Query(alias="organizationId")] = None,
) -> ListObject[AddressResponse]:
    if not userId and not organizationId:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="userId or organizationId is required.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    if userId and organizationId:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="Provide userId or organizationId, not both.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    repo = AddressRepository(db)
    if userId:
        rows = await repo.list_by_user(userId)
    else:
        rows = await repo.list_by_org(organizationId)  # type: ignore[arg-type]

    return ListObject[AddressResponse](
        data=[_serialize(r) for r in rows],
        has_more=False,
        url="/addresses",
    )


@router.post(
    "",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ADDRESS_SUMMARY,
    description=docs.CREATE_ADDRESS_DESCRIPTION,
    responses=docs.CREATE_ADDRESS_RESPONSES,
)
async def create_address(
    body: AddressCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> AddressResponse:
    if not body.user_id and not body.organization_id:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="userId or organizationId is required.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    if body.user_id and body.organization_id:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="Provide userId or organizationId, not both.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    now = now_unix_seconds()
    addr = await AddressRepository(db).create(
        id=generate_id("address"),
        user_id=body.user_id,
        organization_id=body.organization_id,
        type=body.type,
        label=body.label,
        line1=body.line1,
        line2=body.line2,
        city=body.city,
        region_id=body.region_id,
        country_code=body.country_code,
        postal_code=body.postal_code,
        is_default=body.is_default,
        created_at=now,
        updated_at=now,
    )
    return _serialize(addr)


@router.get(
    "/{address_id}",
    response_model=AddressResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_ADDRESS_SUMMARY,
    description=docs.RETRIEVE_ADDRESS_DESCRIPTION,
    responses=docs.RETRIEVE_ADDRESS_RESPONSES,
)
async def retrieve_address(
    address_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> AddressResponse:
    addr = await AddressRepository(db).get_by_id(address_id)
    if not addr:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize(addr)


@router.patch(
    "/{address_id}",
    response_model=AddressResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_ADDRESS_SUMMARY,
    description=docs.UPDATE_ADDRESS_DESCRIPTION,
    responses=docs.UPDATE_ADDRESS_RESPONSES,
)
async def update_address(
    address_id: str,
    body: AddressUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> AddressResponse:
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="No fields to update.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    updates["updated_at"] = now_unix_seconds()
    addr = await AddressRepository(db).update(address_id, **updates)
    if not addr:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize(addr)


@router.delete(
    "/{address_id}",
    response_model=AddressDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_ADDRESS_SUMMARY,
    description=docs.DELETE_ADDRESS_DESCRIPTION,
    responses=docs.DELETE_ADDRESS_RESPONSES,
)
async def delete_address(
    address_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> AddressDeleteResponse:
    deleted = await AddressRepository(db).delete(address_id)
    if not deleted:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return AddressDeleteResponse(id=address_id)
