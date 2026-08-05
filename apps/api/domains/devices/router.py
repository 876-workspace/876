from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.responses import ListObject
from core.security import AdminDep
from db.models import UserDevice
from db.repositories.auth_attempts import AuthAttemptRepository
from db.repositories.user_devices import UserDeviceRepository
from db.session import get_db
from domains.auth_attempts.router import serialize_auth_attempt
from domains.auth_attempts.schemas import AuthAttemptResponse
from domains.devices.schemas import DeviceResponse, DeviceUpdate, DeviceUserResponse

from . import docs

router = APIRouter(prefix="/devices", tags=["Devices"])
user_router = APIRouter(prefix="/users", tags=["Users"])


def serialize_device(row: UserDevice) -> DeviceResponse:
    # Deliberately model only derived identity fields; ``signal.components`` is never serialized.
    return DeviceResponse.model_validate(row)


async def require_device(db: AsyncSession, device_id: str) -> UserDevice:
    row = await UserDeviceRepository(db).retrieve(device_id)
    if row is None:
        raise AppHTTPException(
            code="device/not-found", message="Device not found.", http_status_code=status.HTTP_404_NOT_FOUND
        )
    return row


@router.get(
    "",
    response_model=ListObject[DeviceResponse],
    summary=docs.LIST_DEVICES_SUMMARY,
    description=docs.LIST_DEVICES_DESCRIPTION,
    responses=docs.LIST_DEVICES_RESPONSES,
)
async def list_devices(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    user_id: str | None = None,
    fingerprint: str | None = None,
    device_type: str | None = None,
    trusted: bool | None = None,
    blocked: bool | None = None,
    q: str | None = None,
) -> ListObject[DeviceResponse]:
    rows, has_more = await UserDeviceRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        user_id=user_id,
        fingerprint=fingerprint,
        device_type=device_type,
        trusted=trusted,
        blocked=blocked,
        query=q,
    )
    return ListObject(data=[serialize_device(row) for row in rows], has_more=has_more, url="/devices")


@router.get(
    "/{device_id}/attempts",
    response_model=ListObject[AuthAttemptResponse],
    summary=docs.LIST_DEVICE_ATTEMPTS_SUMMARY,
    description=docs.LIST_DEVICE_ATTEMPTS_DESCRIPTION,
    responses=docs.LIST_DEVICE_ATTEMPTS_RESPONSES,
)
async def list_device_attempts(
    device_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[AuthAttemptResponse]:
    await require_device(db, device_id)
    rows, has_more = await AuthAttemptRepository(db).list(
        limit=limit, starting_after=starting_after, ending_before=ending_before, device_id=device_id
    )
    return ListObject(
        data=[serialize_auth_attempt(row) for row in rows], has_more=has_more, url=f"/devices/{device_id}/attempts"
    )


@router.get(
    "/{device_id}/users",
    response_model=ListObject[DeviceUserResponse],
    summary=docs.LIST_DEVICE_USERS_SUMMARY,
    description=docs.LIST_DEVICE_USERS_DESCRIPTION,
    responses=docs.LIST_DEVICE_USERS_RESPONSES,
)
async def list_device_users(
    device_id: str, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> ListObject[DeviceUserResponse]:
    device = await require_device(db, device_id)
    rows = await UserDeviceRepository(db).list_by_fingerprint(device.fingerprint)
    data = [
        DeviceUserResponse(
            user_id=row.user_id,
            device_id=row.id,
            first_seen_at=row.first_seen_at,
            last_seen_at=row.last_seen_at,
            sign_in_count=row.sign_in_count,
        )
        for row in rows
    ]
    return ListObject(data=data, has_more=False, url=f"/devices/{device_id}/users", total_count=len(data))


@router.get(
    "/{device_id}",
    response_model=DeviceResponse,
    summary=docs.RETRIEVE_DEVICE_SUMMARY,
    description=docs.RETRIEVE_DEVICE_DESCRIPTION,
    responses=docs.RETRIEVE_DEVICE_RESPONSES,
)
async def retrieve_device(
    device_id: str, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> DeviceResponse:
    return serialize_device(await require_device(db, device_id))


@router.post(
    "/{device_id}",
    response_model=DeviceResponse,
    summary=docs.UPDATE_DEVICE_SUMMARY,
    description=docs.UPDATE_DEVICE_DESCRIPTION,
    responses=docs.UPDATE_DEVICE_RESPONSES,
)
async def update_device(
    device_id: str, body: DeviceUpdate, admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> DeviceResponse:
    row = await UserDeviceRepository(db).update(
        device_id,
        label=body.label,
        trusted=body.trusted,
        blocked=body.blocked,
        block_reason=body.block_reason,
        actor_id=admin.user_id,
    )
    if row is None:
        await require_device(db, device_id)
        raise AssertionError("unreachable")
    return serialize_device(row)


@user_router.get("/{user_id}/devices", response_model=ListObject[DeviceResponse])
async def list_user_devices(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[DeviceResponse]:
    rows, has_more = await UserDeviceRepository(db).list(
        limit=limit, starting_after=starting_after, ending_before=ending_before, user_id=user_id
    )
    return ListObject(data=[serialize_device(row) for row in rows], has_more=has_more, url=f"/users/{user_id}/devices")
