from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import Membership
from db.repositories.memberships import MembershipRepository
from db.session import get_db
from domains.memberships.schemas import (
    MembershipCreate,
    MembershipDeleteResponse,
    MembershipResponse,
    MembershipUpdate,
)
from services.provisioning import assign_member_apps, link_membership_role

from . import docs

router = APIRouter(prefix="/memberships", tags=["Memberships"])

logger = get_logger(__name__)


def _serialize_membership(row: Any) -> MembershipResponse:
    return MembershipResponse(
        id=row.id,
        organization_id=row.organization_id,
        user_id=row.user_id,
        workos_membership_id=row.workos_membership_id,
        role=row.role,
        role_id=row.role_id,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "",
    response_model=ListObject[MembershipResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MEMBERSHIPS_SUMMARY,
    description=docs.LIST_MEMBERSHIPS_DESCRIPTION,
    responses=docs.LIST_MEMBERSHIPS_RESPONSES,
)
async def list_memberships(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    organization_id: str | None = None,
    user_id: str | None = None,
) -> ListObject[MembershipResponse]:
    rows, has_more = await MembershipRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        org_id=organization_id,
        user_id=user_id,
    )

    return ListObject[MembershipResponse](
        data=[_serialize_membership(row) for row in rows],
        has_more=has_more,
        url="/memberships",
    )


@router.post(
    "",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MEMBERSHIP_SUMMARY,
    description=docs.CREATE_MEMBERSHIP_DESCRIPTION,
    responses=docs.CREATE_MEMBERSHIP_RESPONSES,
)
async def create_membership(
    _admin: AdminDep,
    body: MembershipCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MembershipResponse:
    from core.id import generate_id
    from core.timestamps import now_unix_seconds
    from db.models import Organization, User

    org = await db.get(Organization, body.organization_id)
    if not org:
        raise AppHTTPException(
            code="membership/validation-failed",
            message="Please check the membership input and try again.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    user = await db.get(User, body.user_id)
    if not user:
        raise AppHTTPException(
            code="membership/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    repo = MembershipRepository(db)
    if await repo.get_by_org_and_user(body.organization_id, body.user_id):
        raise AppHTTPException(
            code="membership/duplicate",
            message="This user is already a member of the organization.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    now = now_unix_seconds()
    membership = await repo.create(
        id=generate_id("membership"),
        organization_id=body.organization_id,
        user_id=body.user_id,
        role=body.role or "member",
        status=body.status or "active",
        created_at=now,
        updated_at=now,
    )
    await link_membership_role(db, membership, now)
    if membership.status == "active":
        await assign_member_apps(db, org_id=body.organization_id, user_id=body.user_id, now=now)
    logger.info(
        "memberships.create",
        membership_id=membership.id,
        organization_id=body.organization_id,
        user_id=body.user_id,
        role=membership.role,
    )
    return _serialize_membership(membership)


@router.get(
    "/{membership_id}",
    response_model=MembershipResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_MEMBERSHIP_SUMMARY,
    description=docs.RETRIEVE_MEMBERSHIP_DESCRIPTION,
    responses=docs.RETRIEVE_MEMBERSHIP_RESPONSES,
)
async def retrieve_membership(
    membership_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MembershipResponse:
    membership = await MembershipRepository(db).get_by_id(membership_id)
    if not membership:
        raise AppHTTPException(
            code="membership/not-found",
            message="No membership exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_membership(membership)


@router.patch(
    "/{membership_id}",
    response_model=MembershipResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_MEMBERSHIP_SUMMARY,
    description=docs.UPDATE_MEMBERSHIP_DESCRIPTION,
    responses=docs.UPDATE_MEMBERSHIP_RESPONSES,
)
async def update_membership(
    membership_id: str,
    _admin: AdminDep,
    body: MembershipUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MembershipResponse:
    repo = MembershipRepository(db)
    membership = await repo.get_by_id(membership_id)
    if not membership:
        raise AppHTTPException(
            code="membership/not-found",
            message="No membership exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    update_data: dict[str, Any] = {}
    if body.workos_membership_id is not None:
        stmt = select(Membership).where(Membership.workos_membership_id == body.workos_membership_id)
        existing = (await db.scalars(stmt)).first()
        if existing and existing.id != membership_id:
            raise AppHTTPException(
                code="membership/validation-failed",
                message="Please check the membership input and try again.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
        update_data["workos_membership_id"] = body.workos_membership_id
    if body.role is not None:
        update_data["role"] = body.role
    if body.status is not None:
        update_data["status"] = body.status

    update_data["updated_at"] = now_unix_seconds()

    updated = await repo.update(membership_id, **update_data)
    if updated is not None and body.role is not None:
        await link_membership_role(db, updated, update_data["updated_at"])
    logger.info(
        "memberships.update",
        membership_id=membership.id,
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        changed_fields=sorted(update_data.keys()),
        role=update_data.get("role"),
    )
    return _serialize_membership(updated)


@router.delete(
    "/{membership_id}",
    response_model=MembershipDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_MEMBERSHIP_SUMMARY,
    description=docs.DELETE_MEMBERSHIP_DESCRIPTION,
    responses=docs.DELETE_MEMBERSHIP_RESPONSES,
)
async def delete_membership(
    membership_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MembershipDeleteResponse:
    repo = MembershipRepository(db)
    membership = await repo.get_by_id(membership_id)
    if not membership:
        raise AppHTTPException(
            code="membership/not-found",
            message="No membership exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    await repo.delete(membership_id)
    logger.info(
        "memberships.delete",
        membership_id=membership_id,
        organization_id=membership.organization_id,
        user_id=membership.user_id,
    )
    return MembershipDeleteResponse(id=membership_id)
