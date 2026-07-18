"""Org structure routes: locations, contacts, departments, and employee profiles.

All routes are session-tier (`SessionDep`) with an org-membership guard.
Reads require an active membership in the org; mutations require the
`structure:manage` org permission (`org:update` for org details). The internal key (admin tier) bypasses the
guard, so Console drives the same routes through `@876/admin` while
product apps (Enterprise, Couriers) use `@876/sdk` with the session cookie.
"""

import contextlib
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.responses import ListObject
from core.security import SessionDep
from core.timestamps import now_unix_seconds
from db.models import Membership
from db.repositories.employee_profiles import EmployeeProfileRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.org_contacts import OrgContactRepository
from db.repositories.org_departments import OrgDepartmentRepository
from db.repositories.org_locations import OrgLocationRepository
from db.repositories.organizations import OrganizationRepository
from db.session import get_db
from domains.organizations.router import (
    _require_org_membership,
    _require_org_permission,
    _serialize_organization,
)
from domains.organizations.schemas import (
    EmployeeProfileCreate,
    EmployeeProfileDeleteResponse,
    EmployeeProfileResponse,
    EmployeeProfileUpdate,
    OrganizationResponse,
    OrganizationSelfUpdate,
    OrgContactCreate,
    OrgContactDeleteResponse,
    OrgContactResponse,
    OrgContactUpdate,
    OrgDepartmentCreate,
    OrgDepartmentDeleteResponse,
    OrgDepartmentResponse,
    OrgDepartmentUpdate,
    OrgLocationCreate,
    OrgLocationDeleteResponse,
    OrgLocationResponse,
    OrgLocationUpdate,
)

from . import docs

router = APIRouter(prefix="/organizations", tags=["Org Structure"])

logger = get_logger(__name__)

def _not_found(code: str, message: str) -> AppHTTPException:
    return AppHTTPException(
        code=code, message=message, http_status_code=status.HTTP_404_NOT_FOUND
    )


def _serialize_location(row: Any) -> OrgLocationResponse:
    return OrgLocationResponse(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        code=row.code,
        type=row.type,
        status=row.status,
        is_primary=row.is_primary,
        phone=row.phone,
        email=row.email,
        line1=row.line1,
        line2=row.line2,
        city=row.city,
        region_id=row.region_id,
        country_code=row.country_code,
        postal_code=row.postal_code,
        timezone=row.timezone,
        metadata=row.metadata_,
        deleted_at=row.deleted_at,
        deleted_by=row.deleted_by,
        deletion_reason=row.deletion_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_department(row: Any) -> OrgDepartmentResponse:
    return OrgDepartmentResponse(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        code=row.code,
        description=row.description,
        parent_department_id=row.parent_department_id,
        head_membership_id=row.head_membership_id,
        status=row.status,
        metadata=row.metadata_,
        deleted_at=row.deleted_at,
        deleted_by=row.deleted_by,
        deletion_reason=row.deletion_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_employee(row: Any, user_id: str | None = None) -> EmployeeProfileResponse:
    if user_id is None:
        with contextlib.suppress(Exception):
            user_id = row.membership.user_id if row.membership else None
    return EmployeeProfileResponse(
        id=row.id,
        membership_id=row.membership_id,
        organization_id=row.organization_id,
        user_id=user_id,
        employee_number=row.employee_number,
        job_title=row.job_title,
        department_id=row.department_id,
        location_id=row.location_id,
        manager_membership_id=row.manager_membership_id,
        employment_type=row.employment_type,
        employment_status=row.employment_status,
        division=row.division,
        cost_center=row.cost_center,
        work_email=row.work_email,
        work_phone=row.work_phone,
        start_date=row.start_date,
        end_date=row.end_date,
        metadata=row.metadata_,
        deleted_at=row.deleted_at,
        deleted_by=row.deleted_by,
        deletion_reason=row.deletion_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _require_org_membership_record(db: AsyncSession, org_id: str, membership_id: str) -> Membership:
    membership = await db.get(Membership, membership_id)
    if not membership or membership.organization_id != org_id or membership.deleted_at is not None:
        raise AppHTTPException(
            code="membership/not-in-organization",
            message="Membership does not belong to this organization.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    return membership


async def _validate_employee_refs(
    db: AsyncSession, org_id: str, department_id: str | None, location_id: str | None,
    manager_membership_id: str | None,
) -> None:
    if department_id is not None:
        dept = await OrgDepartmentRepository(db).get_by_id_for_org(department_id, org_id)
        if not dept:
            raise AppHTTPException(
                code="department/not-in-organization",
                message="Department does not belong to this organization.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
    if location_id is not None:
        loc = await OrgLocationRepository(db).get_by_id_for_org(location_id, org_id)
        if not loc:
            raise AppHTTPException(
                code="location/not-in-organization",
                message="Location does not belong to this organization.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
    if manager_membership_id is not None:
        await _require_org_membership_record(db, org_id, manager_membership_id)


# ── Locations ─────────────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/locations",
    response_model=ListObject[OrgLocationResponse],
    summary=docs.LIST_ORG_LOCATIONS_SUMMARY,
    description=docs.LIST_ORG_LOCATIONS_DESCRIPTION,
    responses=docs.LIST_ORG_LOCATIONS_RESPONSES,
)
async def list_org_locations(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[OrgLocationResponse]:
    await _require_org_membership(db, org_id, principal)
    rows = await OrgLocationRepository(db).list_by_org(org_id)
    return ListObject[OrgLocationResponse](
        data=[_serialize_location(r) for r in rows],
        has_more=False,
        url=f"/organizations/{org_id}/locations",
    )


@router.post(
    "/{org_id}/locations",
    response_model=OrgLocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_LOCATION_SUMMARY,
    description=docs.CREATE_ORG_LOCATION_DESCRIPTION,
    responses=docs.CREATE_ORG_LOCATION_RESPONSES,
)
async def create_org_location(
    org_id: str,
    body: OrgLocationCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgLocationResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = OrgLocationRepository(db)
    if body.is_primary:
        await repo.clear_primary_for_org(org_id)

    now = now_unix_seconds()
    values = body.model_dump(exclude_none=True, exclude={"metadata"})
    row = await repo.create(
        id=generate_id("orgLocation"),
        organization_id=org_id,
        metadata_=body.metadata,
        created_at=now,
        updated_at=now,
        **values,
    )
    logger.info("organizations.location.create", org_id=org_id, location_id=row.id)
    return _serialize_location(row)


@router.get(
    "/{org_id}/locations/{location_id}",
    response_model=OrgLocationResponse,
    summary=docs.RETRIEVE_ORG_LOCATION_SUMMARY,
    description=docs.RETRIEVE_ORG_LOCATION_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_LOCATION_RESPONSES,
)
async def retrieve_org_location(
    org_id: str,
    location_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgLocationResponse:
    await _require_org_membership(db, org_id, principal)
    row = await OrgLocationRepository(db).get_by_id_for_org(location_id, org_id)
    if not row:
        raise _not_found("location/not-found", "Location not found.")
    return _serialize_location(row)


@router.patch(
    "/{org_id}/locations/{location_id}",
    response_model=OrgLocationResponse,
    summary=docs.UPDATE_ORG_LOCATION_SUMMARY,
    description=docs.UPDATE_ORG_LOCATION_DESCRIPTION,
    responses=docs.UPDATE_ORG_LOCATION_RESPONSES,
)
async def update_org_location(
    org_id: str,
    location_id: str,
    body: OrgLocationUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgLocationResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = OrgLocationRepository(db)
    existing = await repo.get_by_id_for_org(location_id, org_id)
    if not existing:
        raise _not_found("location/not-found", "Location not found.")

    if body.is_primary:
        await repo.clear_primary_for_org(org_id)

    updates = body.model_dump(exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    updates["updated_at"] = now_unix_seconds()

    row = await repo.update(location_id, **updates)
    logger.info("organizations.location.update", org_id=org_id, location_id=location_id)
    return _serialize_location(row)


@router.delete(
    "/{org_id}/locations/{location_id}",
    response_model=OrgLocationDeleteResponse,
    summary=docs.DELETE_ORG_LOCATION_SUMMARY,
    description=docs.DELETE_ORG_LOCATION_DESCRIPTION,
    responses=docs.DELETE_ORG_LOCATION_RESPONSES,
)
async def delete_org_location(
    org_id: str,
    location_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgLocationDeleteResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = OrgLocationRepository(db)
    existing = await repo.get_by_id_for_org(location_id, org_id)
    if not existing:
        raise _not_found("location/not-found", "Location not found.")

    await repo.delete(location_id, deleted_by=principal.user_id)
    logger.info("organizations.location.delete", org_id=org_id, location_id=location_id)
    return OrgLocationDeleteResponse(id=location_id)


# ── Contacts ──────────────────────────────────────────────────────────────────


def _serialize_contact(row: Any) -> OrgContactResponse:
    return OrgContactResponse(
        id=row.id,
        organization_id=row.organization_id,
        user_id=row.user_id,
        first_name=row.first_name,
        last_name=row.last_name,
        title=row.title,
        type=row.type,
        is_primary=row.is_primary,
        email=row.email,
        phone=row.phone,
        mobile=row.mobile,
        notes=row.notes,
        metadata=getattr(row, "metadata_", None),
        deleted_at=row.deleted_at,
        deleted_by=row.deleted_by,
        deletion_reason=row.deletion_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _validate_contact_user(db: AsyncSession, org_id: str, user_id: str) -> None:
    """A contact's linked user must be an active member of the organization."""
    membership = await MembershipRepository(db).get_by_org_and_user(org_id, user_id)
    if membership is None or membership.status != "active":
        raise AppHTTPException(
            code="contact/user-not-member",
            message="The linked user is not an active member of this organization.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )


@router.get(
    "/{org_id}/contacts",
    response_model=ListObject[OrgContactResponse],
    summary=docs.LIST_ORG_CONTACTS_SUMMARY,
    description=docs.LIST_ORG_CONTACTS_DESCRIPTION,
    responses=docs.LIST_ORG_CONTACTS_RESPONSES,
)
async def list_org_contacts(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[OrgContactResponse]:
    await _require_org_membership(db, org_id, principal)
    rows = await OrgContactRepository(db).list_by_org(org_id)
    return ListObject[OrgContactResponse](
        data=[_serialize_contact(r) for r in rows],
        has_more=False,
        url=f"/organizations/{org_id}/contacts",
    )


@router.post(
    "/{org_id}/contacts",
    response_model=OrgContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_CONTACT_SUMMARY,
    description=docs.CREATE_ORG_CONTACT_DESCRIPTION,
    responses=docs.CREATE_ORG_CONTACT_RESPONSES,
)
async def create_org_contact(
    org_id: str,
    body: OrgContactCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgContactResponse:
    await _require_org_permission(db, org_id, principal, "org:update")

    if body.user_id:
        await _validate_contact_user(db, org_id, body.user_id)

    repo = OrgContactRepository(db)
    if body.is_primary:
        await repo.clear_primary_for_org(org_id)

    now = now_unix_seconds()
    values = body.model_dump(exclude_none=True, exclude={"metadata"})
    row = await repo.create(
        id=generate_id("orgContact"),
        organization_id=org_id,
        metadata_=body.metadata,
        created_at=now,
        updated_at=now,
        **values,
    )
    logger.info("organizations.contact.create", org_id=org_id, contact_id=row.id)
    return _serialize_contact(row)


@router.get(
    "/{org_id}/contacts/{contact_id}",
    response_model=OrgContactResponse,
    summary=docs.RETRIEVE_ORG_CONTACT_SUMMARY,
    description=docs.RETRIEVE_ORG_CONTACT_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_CONTACT_RESPONSES,
)
async def retrieve_org_contact(
    org_id: str,
    contact_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgContactResponse:
    await _require_org_membership(db, org_id, principal)
    row = await OrgContactRepository(db).get_by_id_for_org(contact_id, org_id)
    if not row:
        raise _not_found("contact/not-found", "Contact not found.")
    return _serialize_contact(row)


@router.patch(
    "/{org_id}/contacts/{contact_id}",
    response_model=OrgContactResponse,
    summary=docs.UPDATE_ORG_CONTACT_SUMMARY,
    description=docs.UPDATE_ORG_CONTACT_DESCRIPTION,
    responses=docs.UPDATE_ORG_CONTACT_RESPONSES,
)
async def update_org_contact(
    org_id: str,
    contact_id: str,
    body: OrgContactUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgContactResponse:
    await _require_org_permission(db, org_id, principal, "org:update")

    repo = OrgContactRepository(db)
    existing = await repo.get_by_id_for_org(contact_id, org_id)
    if not existing:
        raise _not_found("contact/not-found", "Contact not found.")

    if body.user_id:
        await _validate_contact_user(db, org_id, body.user_id)

    if body.is_primary:
        await repo.clear_primary_for_org(org_id)

    updates = body.model_dump(exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    updates["updated_at"] = now_unix_seconds()

    row = await repo.update(contact_id, **updates)
    logger.info("organizations.contact.update", org_id=org_id, contact_id=contact_id)
    return _serialize_contact(row)


@router.delete(
    "/{org_id}/contacts/{contact_id}",
    response_model=OrgContactDeleteResponse,
    summary=docs.DELETE_ORG_CONTACT_SUMMARY,
    description=docs.DELETE_ORG_CONTACT_DESCRIPTION,
    responses=docs.DELETE_ORG_CONTACT_RESPONSES,
)
async def delete_org_contact(
    org_id: str,
    contact_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgContactDeleteResponse:
    await _require_org_permission(db, org_id, principal, "org:update")

    repo = OrgContactRepository(db)
    existing = await repo.get_by_id_for_org(contact_id, org_id)
    if not existing:
        raise _not_found("contact/not-found", "Contact not found.")

    await repo.delete(contact_id, deleted_by=principal.user_id)
    logger.info("organizations.contact.delete", org_id=org_id, contact_id=contact_id)
    return OrgContactDeleteResponse(id=contact_id)


# ── Departments ───────────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/departments",
    response_model=ListObject[OrgDepartmentResponse],
    summary=docs.LIST_ORG_DEPARTMENTS_SUMMARY,
    description=docs.LIST_ORG_DEPARTMENTS_DESCRIPTION,
    responses=docs.LIST_ORG_DEPARTMENTS_RESPONSES,
)
async def list_org_departments(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[OrgDepartmentResponse]:
    await _require_org_membership(db, org_id, principal)
    rows = await OrgDepartmentRepository(db).list_by_org(org_id)
    return ListObject[OrgDepartmentResponse](
        data=[_serialize_department(r) for r in rows],
        has_more=False,
        url=f"/organizations/{org_id}/departments",
    )


@router.post(
    "/{org_id}/departments",
    response_model=OrgDepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_DEPARTMENT_SUMMARY,
    description=docs.CREATE_ORG_DEPARTMENT_DESCRIPTION,
    responses=docs.CREATE_ORG_DEPARTMENT_RESPONSES,
)
async def create_org_department(
    org_id: str,
    body: OrgDepartmentCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgDepartmentResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = OrgDepartmentRepository(db)
    if body.parent_department_id is not None:
        parent = await repo.get_by_id_for_org(body.parent_department_id, org_id)
        if not parent:
            raise AppHTTPException(
                code="department/parent-not-in-organization",
                message="Parent department does not belong to this organization.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
    if body.head_membership_id is not None:
        await _require_org_membership_record(db, org_id, body.head_membership_id)

    now = now_unix_seconds()
    values = body.model_dump(exclude_none=True, exclude={"metadata"})
    row = await repo.create(
        id=generate_id("department"),
        organization_id=org_id,
        metadata_=body.metadata,
        created_at=now,
        updated_at=now,
        **values,
    )
    logger.info("organizations.department.create", org_id=org_id, department_id=row.id)
    return _serialize_department(row)


@router.get(
    "/{org_id}/departments/{department_id}",
    response_model=OrgDepartmentResponse,
    summary=docs.RETRIEVE_ORG_DEPARTMENT_SUMMARY,
    description=docs.RETRIEVE_ORG_DEPARTMENT_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_DEPARTMENT_RESPONSES,
)
async def retrieve_org_department(
    org_id: str,
    department_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgDepartmentResponse:
    await _require_org_membership(db, org_id, principal)
    row = await OrgDepartmentRepository(db).get_by_id_for_org(department_id, org_id)
    if not row:
        raise _not_found("department/not-found", "Department not found.")
    return _serialize_department(row)


@router.patch(
    "/{org_id}/departments/{department_id}",
    response_model=OrgDepartmentResponse,
    summary=docs.UPDATE_ORG_DEPARTMENT_SUMMARY,
    description=docs.UPDATE_ORG_DEPARTMENT_DESCRIPTION,
    responses=docs.UPDATE_ORG_DEPARTMENT_RESPONSES,
)
async def update_org_department(
    org_id: str,
    department_id: str,
    body: OrgDepartmentUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgDepartmentResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = OrgDepartmentRepository(db)
    existing = await repo.get_by_id_for_org(department_id, org_id)
    if not existing:
        raise _not_found("department/not-found", "Department not found.")

    if body.parent_department_id is not None:
        if body.parent_department_id == department_id:
            raise AppHTTPException(
                code="department/invalid-parent",
                message="A department cannot be its own parent.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        parent = await repo.get_by_id_for_org(body.parent_department_id, org_id)
        if not parent:
            raise AppHTTPException(
                code="department/parent-not-in-organization",
                message="Parent department does not belong to this organization.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
    if body.head_membership_id is not None:
        await _require_org_membership_record(db, org_id, body.head_membership_id)

    updates = body.model_dump(exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    updates["updated_at"] = now_unix_seconds()

    row = await repo.update(department_id, **updates)
    logger.info("organizations.department.update", org_id=org_id, department_id=department_id)
    return _serialize_department(row)


@router.delete(
    "/{org_id}/departments/{department_id}",
    response_model=OrgDepartmentDeleteResponse,
    summary=docs.DELETE_ORG_DEPARTMENT_SUMMARY,
    description=docs.DELETE_ORG_DEPARTMENT_DESCRIPTION,
    responses=docs.DELETE_ORG_DEPARTMENT_RESPONSES,
)
async def delete_org_department(
    org_id: str,
    department_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgDepartmentDeleteResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = OrgDepartmentRepository(db)
    existing = await repo.get_by_id_for_org(department_id, org_id)
    if not existing:
        raise _not_found("department/not-found", "Department not found.")

    await repo.delete(department_id, deleted_by=principal.user_id)
    logger.info("organizations.department.delete", org_id=org_id, department_id=department_id)
    return OrgDepartmentDeleteResponse(id=department_id)


# ── Employee profiles ─────────────────────────────────────────────────────────


@router.get(
    "/{org_id}/employees",
    response_model=ListObject[EmployeeProfileResponse],
    summary=docs.LIST_ORG_EMPLOYEES_SUMMARY,
    description=docs.LIST_ORG_EMPLOYEES_DESCRIPTION,
    responses=docs.LIST_ORG_EMPLOYEES_RESPONSES,
)
async def list_org_employees(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[EmployeeProfileResponse]:
    await _require_org_membership(db, org_id, principal)
    rows = await EmployeeProfileRepository(db).list_by_org(org_id)
    return ListObject[EmployeeProfileResponse](
        data=[_serialize_employee(r) for r in rows],
        has_more=False,
        url=f"/organizations/{org_id}/employees",
    )


@router.post(
    "/{org_id}/employees",
    response_model=EmployeeProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_EMPLOYEE_SUMMARY,
    description=docs.CREATE_ORG_EMPLOYEE_DESCRIPTION,
    responses=docs.CREATE_ORG_EMPLOYEE_RESPONSES,
)
async def create_org_employee(
    org_id: str,
    body: EmployeeProfileCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmployeeProfileResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    membership = await _require_org_membership_record(db, org_id, body.membership_id)

    repo = EmployeeProfileRepository(db)
    if await repo.get_by_membership(body.membership_id, include_deleted=True):
        raise AppHTTPException(
            code="employee/duplicate-membership",
            message="This membership already has an employee profile.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    await _validate_employee_refs(
        db, org_id, body.department_id, body.location_id, body.manager_membership_id
    )

    now = now_unix_seconds()
    values = body.model_dump(exclude_none=True, exclude={"metadata"})
    row = await repo.create(
        id=generate_id("employeeProfile"),
        organization_id=org_id,
        metadata_=body.metadata,
        created_at=now,
        updated_at=now,
        **values,
    )
    logger.info("organizations.employee.create", org_id=org_id, employee_profile_id=row.id)
    return _serialize_employee(row, user_id=membership.user_id)


@router.get(
    "/{org_id}/employees/{profile_id}",
    response_model=EmployeeProfileResponse,
    summary=docs.RETRIEVE_ORG_EMPLOYEE_SUMMARY,
    description=docs.RETRIEVE_ORG_EMPLOYEE_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_EMPLOYEE_RESPONSES,
)
async def retrieve_org_employee(
    org_id: str,
    profile_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmployeeProfileResponse:
    await _require_org_membership(db, org_id, principal)
    row = await EmployeeProfileRepository(db).get_by_id_for_org(profile_id, org_id)
    if not row:
        raise _not_found("employee/not-found", "Employee profile not found.")
    return _serialize_employee(row)


@router.patch(
    "/{org_id}/employees/{profile_id}",
    response_model=EmployeeProfileResponse,
    summary=docs.UPDATE_ORG_EMPLOYEE_SUMMARY,
    description=docs.UPDATE_ORG_EMPLOYEE_DESCRIPTION,
    responses=docs.UPDATE_ORG_EMPLOYEE_RESPONSES,
)
async def update_org_employee(
    org_id: str,
    profile_id: str,
    body: EmployeeProfileUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmployeeProfileResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = EmployeeProfileRepository(db)
    existing = await repo.get_by_id_for_org(profile_id, org_id)
    if not existing:
        raise _not_found("employee/not-found", "Employee profile not found.")

    await _validate_employee_refs(
        db, org_id, body.department_id, body.location_id, body.manager_membership_id
    )

    updates = body.model_dump(exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    updates["updated_at"] = now_unix_seconds()

    await repo.update(profile_id, **updates)
    row = await repo.get_by_id_for_org(profile_id, org_id)
    logger.info("organizations.employee.update", org_id=org_id, employee_profile_id=profile_id)
    return _serialize_employee(row)


@router.delete(
    "/{org_id}/employees/{profile_id}",
    response_model=EmployeeProfileDeleteResponse,
    summary=docs.DELETE_ORG_EMPLOYEE_SUMMARY,
    description=docs.DELETE_ORG_EMPLOYEE_DESCRIPTION,
    responses=docs.DELETE_ORG_EMPLOYEE_RESPONSES,
)
async def delete_org_employee(
    org_id: str,
    profile_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EmployeeProfileDeleteResponse:
    await _require_org_permission(db, org_id, principal, "structure:manage")

    repo = EmployeeProfileRepository(db)
    existing = await repo.get_by_id_for_org(profile_id, org_id)
    if not existing:
        raise _not_found("employee/not-found", "Employee profile not found.")

    await repo.delete(profile_id, deleted_by=principal.user_id)
    logger.info("organizations.employee.delete", org_id=org_id, employee_profile_id=profile_id)
    return EmployeeProfileDeleteResponse(id=profile_id)


# ── Org details (self-scoped) ─────────────────────────────────────────────────


@router.get(
    "/{org_id}/details",
    response_model=OrganizationResponse,
    summary=docs.RETRIEVE_MY_ORG_DETAILS_SUMMARY,
    description=docs.RETRIEVE_MY_ORG_DETAILS_DESCRIPTION,
    responses=docs.RETRIEVE_MY_ORG_DETAILS_RESPONSES,
)
async def retrieve_my_org_details(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationResponse:
    await _require_org_membership(db, org_id, principal)
    org = await OrganizationRepository(db).get_by_id(org_id)
    if not org:
        raise _not_found("organization/not-found", "Organization not found.")
    return _serialize_organization(org)


@router.patch(
    "/{org_id}/details",
    response_model=OrganizationResponse,
    summary=docs.UPDATE_MY_ORG_DETAILS_SUMMARY,
    description=docs.UPDATE_MY_ORG_DETAILS_DESCRIPTION,
    responses=docs.UPDATE_MY_ORG_DETAILS_RESPONSES,
)
async def update_my_org_details(
    org_id: str,
    body: OrganizationSelfUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationResponse:
    await _require_org_permission(db, org_id, principal, "org:update")

    repo = OrganizationRepository(db)
    org = await repo.get_by_id(org_id)
    if not org:
        raise _not_found("organization/not-found", "Organization not found.")

    updates = body.model_dump(exclude_unset=True)
    if "country_code" in updates and updates["country_code"]:
        updates["country_code"] = updates["country_code"].upper()
    if "currency_code" in updates and updates["currency_code"]:
        updates["currency_code"] = updates["currency_code"].upper()
    updates["updated_at"] = now_unix_seconds()

    updated = await repo.update(org_id, **updates)
    logger.info(
        "organizations.details.update",
        org_id=org_id,
        changed_fields=sorted(updates.keys()),
    )
    return _serialize_organization(updated)
