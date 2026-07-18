"""Org access routes: roles, permission catalog, members, and app assignments.

All routes are session-tier (`SessionDep`) with org-permission guards
(`_require_org_permission`); the internal key (admin tier) bypasses them, so
Console drives the same routes through `@876/admin` while product apps
(Enterprise, Couriers) use `@876/sdk` with the session cookie.

Vocabulary: an org is *provisioned* onto an app (subscriptions); a member is
*assigned* to a provisioned app (app_assignments). See ``core/org_permissions``.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.org_permissions import (
    ORG_PERMISSION_GROUPS,
    OWNER_ROLE_NAME,
    is_valid_org_permission,
)
from core.responses import ListObject
from core.security import SessionDep
from core.timestamps import now_unix_seconds
from db.models import App, Membership, User
from db.repositories.app_assignments import AppAssignmentRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.org_roles import OrganizationRoleRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.session import get_db
from domains.organizations.router import _require_org_membership, _require_org_permission
from domains.organizations.schemas import (
    AppAssignmentCreate,
    AppAssignmentResponse,
    OrganizationMemberMeResponse,
    OrganizationMemberResponse,
    OrganizationMemberRoleUpdate,
    OrganizationRoleCreate,
    OrganizationRoleDeleteResponse,
    OrganizationRoleResponse,
    OrganizationRoleUpdate,
    PermissionCatalogResponse,
    PermissionGroupResponse,
)
from services.provisioning import resolve_member_permissions

from . import docs

router = APIRouter(prefix="/organizations", tags=["Org Access"])

logger = get_logger(__name__)


def _serialize_role(row: Any, members_count: int | None = None) -> OrganizationRoleResponse:
    return OrganizationRoleResponse(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        display_name=row.display_name,
        description=row.description,
        permissions=list(row.permissions),
        is_system=row.is_system,
        members_count=members_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_member(membership: Any, user: Any) -> OrganizationMemberResponse:
    return OrganizationMemberResponse(
        id=membership.id,
        user_id=membership.user_id,
        role=membership.role,
        role_id=membership.role_id,
        status=membership.status,
        first_name=user.first_name if user else None,
        last_name=user.last_name if user else None,
        email=user.email if user else None,
        avatar=user.avatar if user else None,
        created_at=membership.created_at,
    )


def _serialize_assignment(row: Any) -> AppAssignmentResponse:
    app = getattr(row, "app", None)
    return AppAssignmentResponse(
        id=row.id,
        organization_id=row.organization_id,
        user_id=row.user_id,
        app_id=row.app_id,
        app_slug=app.slug if app else None,
        app_name=app.name if app else None,
        status=row.status,
        assigned_by=row.assigned_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _validate_permissions(permissions: list[str]) -> list[str]:
    normalized = sorted(dict.fromkeys(permissions))
    for permission in normalized:
        if not is_valid_org_permission(permission):
            raise AppHTTPException(
                code="role/unknown-permission",
                message=f"Unknown permission: {permission}",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
    return normalized


# ── Permission catalog ───────────────────────────────────────────────────────


@router.get(
    "/permissions/catalog",
    response_model=PermissionCatalogResponse,
    summary=docs.PERMISSION_CATALOG_SUMMARY,
    description=docs.PERMISSION_CATALOG_DESCRIPTION,
)
async def get_permission_catalog(_principal: SessionDep) -> PermissionCatalogResponse:
    return PermissionCatalogResponse(
        groups=[
            PermissionGroupResponse(name=name, permissions=list(permissions))
            for name, permissions in ORG_PERMISSION_GROUPS.items()
        ]
    )


# ── Roles ────────────────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/roles",
    response_model=ListObject[OrganizationRoleResponse],
    summary=docs.LIST_ORG_ROLES_SUMMARY,
    description=docs.LIST_ORG_ROLES_DESCRIPTION,
    responses=docs.LIST_ORG_ROLES_RESPONSES,
)
async def list_org_roles(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[OrganizationRoleResponse]:
    await _require_org_membership(db, org_id, principal)

    repo = OrganizationRoleRepository(db)
    rows = await repo.list_by_org(org_id)
    data = [_serialize_role(row, members_count=await repo.count_memberships(row.id)) for row in rows]
    return ListObject[OrganizationRoleResponse](
        data=data,
        has_more=False,
        url=f"/organizations/{org_id}/roles",
    )


@router.post(
    "/{org_id}/roles",
    response_model=OrganizationRoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_ROLE_SUMMARY,
    description=docs.CREATE_ORG_ROLE_DESCRIPTION,
    responses=docs.CREATE_ORG_ROLE_RESPONSES,
)
async def create_org_role(
    org_id: str,
    body: OrganizationRoleCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationRoleResponse:
    await _require_org_permission(db, org_id, principal, "roles:manage")

    permissions = _validate_permissions(body.permissions)
    repo = OrganizationRoleRepository(db)
    if await repo.get_by_name(org_id, body.name):
        raise AppHTTPException(
            code="role/duplicate-name",
            message="A role with this name already exists in the organization.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    now = now_unix_seconds()
    role = await repo.create(
        id=generate_id("role"),
        organization_id=org_id,
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        permissions=permissions,
        is_system=False,
        created_at=now,
        updated_at=now,
    )
    logger.info("organizations.role.create", organization_id=org_id, role_id=role.id, name=role.name)
    return _serialize_role(role, members_count=0)


@router.get(
    "/{org_id}/roles/{role_id}",
    response_model=OrganizationRoleResponse,
    summary=docs.RETRIEVE_ORG_ROLE_SUMMARY,
    description=docs.RETRIEVE_ORG_ROLE_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_ROLE_RESPONSES,
)
async def retrieve_org_role(
    org_id: str,
    role_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationRoleResponse:
    await _require_org_membership(db, org_id, principal)

    repo = OrganizationRoleRepository(db)
    role = await repo.get_by_id_for_org(role_id, org_id)
    if role is None:
        raise AppHTTPException(
            code="role/not-found",
            message="No role exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_role(role, members_count=await repo.count_memberships(role.id))


@router.patch(
    "/{org_id}/roles/{role_id}",
    response_model=OrganizationRoleResponse,
    summary=docs.UPDATE_ORG_ROLE_SUMMARY,
    description=docs.UPDATE_ORG_ROLE_DESCRIPTION,
    responses=docs.UPDATE_ORG_ROLE_RESPONSES,
)
async def update_org_role(
    org_id: str,
    role_id: str,
    body: OrganizationRoleUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationRoleResponse:
    await _require_org_permission(db, org_id, principal, "roles:manage")

    repo = OrganizationRoleRepository(db)
    role = await repo.get_by_id_for_org(role_id, org_id)
    if role is None:
        raise AppHTTPException(
            code="role/not-found",
            message="No role exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if role.is_system:
        raise AppHTTPException(
            code="role/system-immutable",
            message="Default system roles cannot be modified.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    update_data: dict[str, Any] = {"updated_at": now_unix_seconds()}
    if body.display_name is not None:
        update_data["display_name"] = body.display_name
    if body.description is not None:
        update_data["description"] = body.description
    if body.permissions is not None:
        update_data["permissions"] = _validate_permissions(body.permissions)

    updated = await repo.update(role_id, **update_data) or role
    logger.info("organizations.role.update", organization_id=org_id, role_id=role_id)
    return _serialize_role(updated, members_count=await repo.count_memberships(role_id))


@router.delete(
    "/{org_id}/roles/{role_id}",
    response_model=OrganizationRoleDeleteResponse,
    summary=docs.DELETE_ORG_ROLE_SUMMARY,
    description=docs.DELETE_ORG_ROLE_DESCRIPTION,
    responses=docs.DELETE_ORG_ROLE_RESPONSES,
)
async def delete_org_role(
    org_id: str,
    role_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationRoleDeleteResponse:
    await _require_org_permission(db, org_id, principal, "roles:manage")

    repo = OrganizationRoleRepository(db)
    role = await repo.get_by_id_for_org(role_id, org_id)
    if role is None:
        raise AppHTTPException(
            code="role/not-found",
            message="No role exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if role.is_system:
        raise AppHTTPException(
            code="role/system-immutable",
            message="Default system roles cannot be deleted.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    if await repo.count_memberships(role_id) > 0:
        raise AppHTTPException(
            code="role/in-use",
            message="This role is still assigned to members. Reassign them first.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    await repo.delete(role_id)
    logger.info("organizations.role.delete", organization_id=org_id, role_id=role_id)
    return OrganizationRoleDeleteResponse(id=role_id)


# ── Members ──────────────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/members",
    response_model=ListObject[OrganizationMemberResponse],
    summary=docs.LIST_ORG_MEMBERS_SUMMARY,
    description=docs.LIST_ORG_MEMBERS_DESCRIPTION,
    responses=docs.LIST_ORG_MEMBERS_RESPONSES,
)
async def list_org_members(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ListObject[OrganizationMemberResponse]:
    await _require_org_permission(db, org_id, principal, "members:read")

    stmt = (
        select(Membership)
        .options(joinedload(Membership.user))
        .where(Membership.organization_id == org_id, Membership.status != "removed")
        .order_by(Membership.created_at.asc())
        .limit(limit + 1)
    )
    rows = list((await db.scalars(stmt)).unique().all())
    has_more = len(rows) > limit
    rows = rows[:limit]

    return ListObject[OrganizationMemberResponse](
        data=[_serialize_member(row, row.user) for row in rows],
        has_more=has_more,
        url=f"/organizations/{org_id}/members",
    )


@router.get(
    "/{org_id}/members/me",
    response_model=OrganizationMemberMeResponse,
    summary=docs.RETRIEVE_ORG_MEMBER_ME_SUMMARY,
    description=docs.RETRIEVE_ORG_MEMBER_ME_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_MEMBER_ME_RESPONSES,
)
async def retrieve_org_member_me(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationMemberMeResponse:
    if not principal.user_id:
        raise AppHTTPException(
            code="auth/no-session",
            message="No active session.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    membership = await MembershipRepository(db).get_by_org_and_user(org_id, principal.user_id)
    if not membership or membership.status != "active":
        raise AppHTTPException(
            code="auth/forbidden",
            message="Forbidden.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )

    user = await db.get(User, principal.user_id)
    permissions = await resolve_member_permissions(db, membership)
    member = _serialize_member(membership, user)
    return OrganizationMemberMeResponse(
        **member.model_dump(exclude={"object"}),
        permissions=sorted(permissions),
    )


@router.patch(
    "/{org_id}/members/{membership_id}",
    response_model=OrganizationMemberResponse,
    summary=docs.UPDATE_ORG_MEMBER_ROLE_SUMMARY,
    description=docs.UPDATE_ORG_MEMBER_ROLE_DESCRIPTION,
    responses=docs.UPDATE_ORG_MEMBER_ROLE_RESPONSES,
)
async def update_org_member_role(
    org_id: str,
    membership_id: str,
    body: OrganizationMemberRoleUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationMemberResponse:
    await _require_org_permission(db, org_id, principal, "members:manage")

    membership_repo = MembershipRepository(db)
    stmt = (
        select(Membership)
        .options(joinedload(Membership.user))
        .where(Membership.id == membership_id, Membership.organization_id == org_id)
    )
    membership = (await db.scalars(stmt)).first()
    if membership is None:
        raise AppHTTPException(
            code="membership/not-found",
            message="No membership exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    role_repo = OrganizationRoleRepository(db)
    new_role = await role_repo.get_by_name(org_id, body.role)
    if new_role is None:
        raise AppHTTPException(
            code="role/not-found",
            message="No role exists with the provided name.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Owner-role transitions are owner-only; the last active owner is protected.
    owner_involved = OWNER_ROLE_NAME in (membership.role, new_role.name)
    if owner_involved and not principal.internal:
        caller = await membership_repo.get_by_org_and_user(org_id, principal.user_id or "")
        if caller is None or caller.role != OWNER_ROLE_NAME:
            raise AppHTTPException(
                code="role/owner-required",
                message="Only an owner can grant or remove the owner role.",
                http_status_code=status.HTTP_403_FORBIDDEN,
            )
    if membership.role == OWNER_ROLE_NAME and new_role.name != OWNER_ROLE_NAME:
        owners_stmt = select(Membership).where(
            Membership.organization_id == org_id,
            Membership.role == OWNER_ROLE_NAME,
            Membership.status == "active",
            Membership.id != membership.id,
        )
        if (await db.scalars(owners_stmt)).first() is None:
            raise AppHTTPException(
                code="role/last-owner",
                message="An organization must keep at least one owner.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

    membership.role = new_role.name
    membership.role_id = new_role.id
    membership.updated_at = now_unix_seconds()
    await db.flush()

    logger.info(
        "organizations.member.role_change",
        organization_id=org_id,
        membership_id=membership_id,
        role=new_role.name,
    )
    return _serialize_member(membership, membership.user)


# ── App assignments ──────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/app-assignments",
    response_model=ListObject[AppAssignmentResponse],
    summary=docs.LIST_APP_ASSIGNMENTS_SUMMARY,
    description=docs.LIST_APP_ASSIGNMENTS_DESCRIPTION,
    responses=docs.LIST_APP_ASSIGNMENTS_RESPONSES,
)
async def list_app_assignments(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[str | None, Query(description="Filter to one member's assignments.")] = None,
    app_id: Annotated[str | None, Query(description="Filter to one app's assignments.")] = None,
    include_revoked: Annotated[bool, Query(description="Include revoked assignments.")] = False,
) -> ListObject[AppAssignmentResponse]:
    await _require_org_permission(db, org_id, principal, "apps:read")

    rows = await AppAssignmentRepository(db).list_by_org(
        org_id, user_id=user_id, app_id=app_id, include_revoked=include_revoked
    )
    return ListObject[AppAssignmentResponse](
        data=[_serialize_assignment(row) for row in rows],
        has_more=False,
        url=f"/organizations/{org_id}/app-assignments",
    )


@router.post(
    "/{org_id}/app-assignments",
    response_model=AppAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_APP_ASSIGNMENT_SUMMARY,
    description=docs.CREATE_APP_ASSIGNMENT_DESCRIPTION,
    responses=docs.CREATE_APP_ASSIGNMENT_RESPONSES,
)
async def create_app_assignment(
    org_id: str,
    body: AppAssignmentCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppAssignmentResponse:
    await _require_org_permission(db, org_id, principal, "apps:assign")

    if not body.app_id and not body.app_slug:
        raise AppHTTPException(
            code="app-assignment/validation-failed",
            message="Provide app_id or app_slug.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    if body.app_id:
        app = await db.get(App, body.app_id)
    else:
        app = (await db.scalars(select(App).where(App.slug == body.app_slug))).first()
    if app is None:
        raise AppHTTPException(
            code="app-assignment/app-not-found",
            message="No app exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    membership = await MembershipRepository(db).get_by_org_and_user(org_id, body.user_id)
    if membership is None or membership.status != "active":
        raise AppHTTPException(
            code="app-assignment/member-not-found",
            message="This user is not an active member of the organization.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    subscription = await SubscriptionRepository(db).get(org_id, app.id)
    if subscription is None or subscription.status != "active":
        raise AppHTTPException(
            code="app-assignment/not-provisioned",
            message="The organization is not provisioned for this app.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    now = now_unix_seconds()
    assignment = await AppAssignmentRepository(db).assign(
        org_id, body.user_id, app.id, now, assigned_by=principal.user_id
    )
    logger.info(
        "organizations.app_assignment.create",
        organization_id=org_id,
        user_id=body.user_id,
        app_id=app.id,
    )
    loaded = await AppAssignmentRepository(db).get_by_id(assignment.id)
    return _serialize_assignment(loaded if loaded is not None else assignment)


@router.delete(
    "/{org_id}/app-assignments/{assignment_id}",
    response_model=AppAssignmentResponse,
    summary=docs.REVOKE_APP_ASSIGNMENT_SUMMARY,
    description=docs.REVOKE_APP_ASSIGNMENT_DESCRIPTION,
    responses=docs.REVOKE_APP_ASSIGNMENT_RESPONSES,
)
async def revoke_app_assignment(
    org_id: str,
    assignment_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppAssignmentResponse:
    await _require_org_permission(db, org_id, principal, "apps:assign")

    repo = AppAssignmentRepository(db)
    assignment = await repo.get_by_id(assignment_id)
    if assignment is None or assignment.organization_id != org_id:
        raise AppHTTPException(
            code="app-assignment/not-found",
            message="No assignment exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    now = now_unix_seconds()
    revoked = await repo.revoke(assignment_id, now) or assignment
    logger.info(
        "organizations.app_assignment.revoke",
        organization_id=org_id,
        assignment_id=assignment_id,
    )
    return _serialize_assignment(revoked)
