import contextlib
import secrets
import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id, normalize_slug
from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep, Principal, SessionDep
from core.timestamps import now_unix_seconds
from db.models import App, Organization, User
from db.repositories.invite_tokens import InviteTokenRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.prices import PriceRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.session import get_db
from domains.memberships.router import _serialize_membership
from domains.memberships.schemas import MembershipCreateRequest, MembershipResponse
from domains.organizations.schemas import (
    InvitePublicResponse,
    InviteTokenCreate,
    InviteTokenResponse,
    OrganizationBootstrapRequest,
    OrganizationCreate,
    OrganizationDeleteResponse,
    OrganizationResponse,
    OrganizationUpdate,
    OrgSetupRequest,
    SubscriptionBatchResponse,
    SubscriptionItemResponse,
    SubscriptionProvisionRequest,
    SubscriptionResponse,
    SubscriptionUpdateRequest,
)
from services.finance_provisioning import reconcile_finance_connections
from services.organization_bootstrap import OrganizationBootstrapServiceDep
from services.provisioning import (
    assign_member_apps,
    link_membership_role,
    provision_organization,
    resolve_member_permissions,
)

from . import docs

router = APIRouter(prefix="/organizations", tags=["Organizations"])

logger = get_logger(__name__)


def _serialize_organization(row: Any) -> OrganizationResponse:
    return OrganizationResponse(
        id=row.id,
        workos_organization_id=row.workos_organization_id,
        name=row.name,
        short_name=getattr(row, "short_name", None),
        doing_business_as=getattr(row, "doing_business_as", None),
        slug=row.slug,
        status=row.status,
        logo_url=row.logo_url,
        industry=getattr(row, "industry", None),
        business_type=getattr(row, "business_type", None),
        registration_number=getattr(row, "registration_number", None),
        trn=getattr(row, "trn", None),
        nis_number=getattr(row, "nis_number", None),
        gct_number=getattr(row, "gct_number", None),
        tax_id=getattr(row, "tax_id", None),
        incorporation_date=getattr(row, "incorporation_date", None),
        primary_phone=row.primary_phone,
        primary_email=row.primary_email,
        fax=getattr(row, "fax", None),
        website_url=row.website_url,
        support_url=row.support_url,
        primary_contact_user_id=getattr(row, "primary_contact_user_id", None),
        timezone=getattr(row, "timezone", None),
        language=getattr(row, "language", None),
        address_line1=row.address_line1,
        address_line2=row.address_line2,
        city=row.city,
        region_id=row.region_id,
        country_code=row.country_code,
        currency_code=row.currency_code,
        enrollment_completed_at=row.enrollment_completed_at,
        metadata=getattr(row, "metadata_", None),
        deleted_at=row.deleted_at,
        deleted_by=row.deleted_by,
        deletion_reason=row.deletion_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_subscription(row: Any) -> SubscriptionResponse:
    app_slug: str | None = None
    app_name: str | None = None
    app_logo_url: str | None = None
    app_kind: str | None = None
    with contextlib.suppress(Exception):
        if row.app:
            app_slug = row.app.slug
            app_name = row.app.name
            app_logo_url = row.app.logo_url
            app_kind = row.app.app_kind
    items: list[SubscriptionItemResponse] = []
    with contextlib.suppress(Exception):
        for item in row.items or []:
            product = item.price.product if item.price else None
            items.append(
                SubscriptionItemResponse(
                    id=item.id,
                    price_id=item.price_id,
                    product_id=product.id if product else None,
                    product_slug=product.slug if product else None,
                    product_name=product.name if product else None,
                    quantity=item.quantity,
                )
            )
    return SubscriptionResponse(
        id=row.id,
        organization_id=row.organization_id,
        app_id=row.app_id,
        app_slug=app_slug,
        app_name=app_name,
        app_logo_url=app_logo_url,
        app_kind=app_kind,
        status=row.status,
        finance_lifecycle_version=row.finance_lifecycle_version,
        items=items,
        current_period_start=row.current_period_start,
        current_period_end=row.current_period_end,
        cancel_at_period_end=row.cancel_at_period_end,
        canceled_at=row.canceled_at,
        trial_start=row.trial_start,
        trial_end=row.trial_end,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _require_org_membership(
    db: AsyncSession,
    org_id: str,
    principal: Principal,
    roles: tuple[str, ...] | None = None,
) -> None:
    """Authorize a session principal against an organization.

    Requires an active membership in the org; `roles` narrows the check to
    specific membership roles (e.g. owner/admin for mutations). The internal
    key (admin tier) bypasses the check.
    """
    if principal.internal:
        return
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
    if roles and membership.role not in roles:
        raise AppHTTPException(
            code="auth/forbidden",
            message="Forbidden.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )


async def _require_org_permission(
    db: AsyncSession,
    org_id: str,
    principal: Principal,
    permission: str,
) -> None:
    """Authorize a session principal against an org-level permission.

    Requires an active membership whose effective role permissions include
    ``permission``. The internal key (admin tier) bypasses the check.
    """
    if principal.internal:
        return
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

    permissions = await resolve_member_permissions(db, membership)
    if permission not in permissions:
        raise AppHTTPException(
            code="auth/forbidden",
            message="Forbidden.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )


def _serialize_invite(row: Any) -> InviteTokenResponse:
    return InviteTokenResponse(
        id=row.id,
        organization_id=row.organization_id,
        email=row.email,
        role=row.role,
        status=row.status,
        expires_at=row.expires_at,
        source_app_id=row.source_app_id,
        created_at=row.created_at,
    )


@router.get(
    "",
    response_model=ListObject[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_ORGS_SUMMARY,
    description=docs.LIST_ORGS_DESCRIPTION,
    responses=docs.LIST_ORGS_RESPONSES,
)
async def list_organizations(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
    org_status: Annotated[str | None, Query(alias="status")] = None,
) -> ListObject[OrganizationResponse]:
    repo = OrganizationRepository(db)
    if search:
        rows = await repo.search(query=search, limit=limit, include_deleted=include_deleted, status=org_status)
        return ListObject[OrganizationResponse](
            data=[_serialize_organization(r) for r in rows],
            has_more=False,
            url="/organizations",
        )

    rows, has_more = await repo.list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=include_deleted,
        status=org_status,
    )
    return ListObject[OrganizationResponse](
        data=[_serialize_organization(row) for row in rows],
        has_more=has_more,
        url="/organizations",
    )


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_SUMMARY,
    description=docs.CREATE_ORG_DESCRIPTION,
    responses=docs.CREATE_ORG_RESPONSES,
)
async def create_organization(
    _admin: AdminDep,
    body: OrganizationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationResponse:
    new_id = generate_id("organization")

    # Slug: use provided (normalized) or auto-generate from the new ID
    raw_slug = body.slug or new_id
    normalized_slug = normalize_slug(raw_slug)
    if not normalized_slug:
        normalized_slug = new_id.lower()

    repo = OrganizationRepository(db)
    if await repo.get_by_slug(normalized_slug):
        raise AppHTTPException(
            code="organization/duplicate-slug",
            message="An organization with this slug already exists.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    if body.workos_organization_id:
        stmt = select(Organization).where(Organization.workos_organization_id == body.workos_organization_id)
        if (await db.scalars(stmt)).first():
            raise AppHTTPException(
                code="organization/duplicate-workos-id",
                message="An organization with this WorkOS identifier already exists.",
                http_status_code=status.HTTP_409_CONFLICT,
            )

    now = now_unix_seconds()
    org = await repo.create(
        id=new_id,
        workos_organization_id=body.workos_organization_id,
        name=body.name.strip() if body.name else None,
        short_name=body.short_name,
        doing_business_as=body.doing_business_as,
        slug=normalized_slug,
        status=body.status or "active",
        industry=body.industry,
        business_type=body.business_type,
        registration_number=body.registration_number,
        trn=body.trn,
        nis_number=body.nis_number,
        gct_number=body.gct_number,
        tax_id=body.tax_id,
        incorporation_date=body.incorporation_date,
        primary_phone=body.primary_phone,
        primary_email=body.primary_email,
        fax=body.fax,
        website_url=body.website_url,
        support_url=body.support_url,
        primary_contact_user_id=body.primary_contact_user_id,
        timezone=body.timezone,
        language=body.language,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
        city=body.city,
        region_id=body.region_id,
        country_code=body.country_code,
        currency_code=body.currency_code or "JMD",
        metadata_=body.metadata,
        created_at=now,
        updated_at=now,
    )
    await provision_organization(db, org.id, now)

    logger.info("organizations.create", organization_id=org.id, slug=org.slug)
    return _serialize_organization(org)


@router.post(
    "/bootstrap",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.BOOTSTRAP_ORG_SUMMARY,
    description=docs.BOOTSTRAP_ORG_DESCRIPTION,
    responses=docs.BOOTSTRAP_ORG_RESPONSES,
)
async def bootstrap_organization(
    _admin: AdminDep,
    body: OrganizationBootstrapRequest,
    service: OrganizationBootstrapServiceDep,
) -> OrganizationResponse:
    organization = await service.bootstrap_existing_user(
        owner_user_id=body.owner_user_id,
        name=body.name,
        slug=body.slug,
    )
    return _serialize_organization(organization)


@router.post(
    "/setup",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete organization enrollment setup",
    description=(
        "Completes enrollment for an organization the caller owns. **Admin only** — "
        "called by the 876 consumer app's server-side route handler after session auth. "
        "All fields are required; validates that the calling user holds the 'owner' "
        "membership for the organization before applying changes."
    ),
)
async def setup_organization(
    _admin: AdminDep,
    body: OrgSetupRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationResponse:

    repo = OrganizationRepository(db)
    org = await repo.get_by_id(body.organization_id)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    # Validate and normalize slug
    normalized_slug = normalize_slug(body.slug)
    if not normalized_slug:
        raise AppHTTPException(
            code="organization/validation-failed",
            message="Invalid slug.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    existing = await repo.get_by_slug(normalized_slug)
    if existing and existing.id != body.organization_id:
        raise AppHTTPException(
            code="organization/duplicate-slug",
            message="An organization with this slug already exists.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    now = now_unix_seconds()
    updated_org = await repo.update(
        body.organization_id,
        name=body.name.strip(),
        slug=normalized_slug,
        primary_phone=body.primary_phone,
        primary_email=body.primary_email,
        website_url=body.website_url,
        support_url=body.support_url,
        address_line1=body.address_line1,
        address_line2=body.address_line2,
        city=body.city,
        region_id=body.region_id,
        country_code=body.country_code.upper(),
        currency_code=body.currency_code.upper(),
        enrollment_completed_at=now,
        updated_at=now,
    )
    return _serialize_organization(updated_org)


@router.get(
    "/by-slug/{slug}",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_ORG_BY_SLUG_SUMMARY,
    description=docs.RETRIEVE_ORG_BY_SLUG_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_BY_SLUG_RESPONSES,
)
async def retrieve_organization_by_slug(
    slug: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_deleted: bool = False,
) -> OrganizationResponse:
    org = await OrganizationRepository(db).get_by_slug(slug, include_deleted=include_deleted)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided slug.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_organization(org)


@router.get(
    "/search",
    response_model=ListObject[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.SEARCH_ORGS_SUMMARY,
    description=docs.SEARCH_ORGS_DESCRIPTION,
    responses=docs.SEARCH_ORGS_RESPONSES,
)
async def search_organizations(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    query: Annotated[str, Query(min_length=1)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    org_status: Annotated[str | None, Query(alias="status")] = None,
) -> ListObject[OrganizationResponse]:
    rows = await OrganizationRepository(db).search(query=query, limit=limit, status=org_status)
    return ListObject[OrganizationResponse](
        object="search_result",
        data=[_serialize_organization(row) for row in rows],
        has_more=False,
        url="/organizations/search",
    )


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_ORG_SUMMARY,
    description=docs.RETRIEVE_ORG_DESCRIPTION,
    responses=docs.RETRIEVE_ORG_RESPONSES,
)
async def retrieve_organization(
    organization_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_deleted: bool = False,
) -> OrganizationResponse:
    org = await OrganizationRepository(db).get_by_id(organization_id, include_deleted=include_deleted)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_organization(org)


@router.patch(
    "/{organization_id}",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_ORG_SUMMARY,
    description=docs.UPDATE_ORG_DESCRIPTION,
    responses=docs.UPDATE_ORG_RESPONSES,
)
async def update_organization(
    organization_id: str,
    _admin: AdminDep,
    body: OrganizationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationResponse:
    repo = OrganizationRepository(db)
    org = await repo.get_by_id(organization_id)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    update_data: dict[str, Any] = {}
    explicitly_set = body.model_dump(exclude_unset=True)
    if body.name is not None:
        update_data["name"] = body.name.strip()
    if "short_name" in explicitly_set:
        update_data["short_name"] = body.short_name  # nullable — allow clearing
    if body.slug is not None:
        normalized_slug = normalize_slug(body.slug)
        existing = await repo.get_by_slug(normalized_slug)
        if existing and existing.id != organization_id:
            raise AppHTTPException(
                code="organization/duplicate-slug",
                message="An organization with this slug already exists.",
                http_status_code=status.HTTP_409_CONFLICT,
            )
        update_data["slug"] = normalized_slug
    if "workos_organization_id" in explicitly_set:
        if body.workos_organization_id is not None:
            stmt = select(Organization).where(Organization.workos_organization_id == body.workos_organization_id)
            existing_workos = (await db.scalars(stmt)).first()
            if existing_workos and existing_workos.id != organization_id:
                raise AppHTTPException(
                    code="organization/duplicate-workos-id",
                    message="An organization with this WorkOS identifier already exists.",
                    http_status_code=status.HTTP_409_CONFLICT,
                )
        update_data["workos_organization_id"] = body.workos_organization_id  # nullable — allow clearing
    if body.status is not None:
        update_data["status"] = body.status
    if "logo_url" in explicitly_set:
        update_data["logo_url"] = body.logo_url  # nullable — allow clearing
    if "metadata" in explicitly_set:
        update_data["metadata_"] = body.metadata  # nullable — allow clearing
    # Contact fields — all nullable, allow explicit clearing
    for field in ("primary_phone", "primary_email", "fax", "website_url", "support_url"):
        if field in explicitly_set:
            update_data[field] = getattr(body, field)
    # Business identity + locale fields — all nullable, allow explicit clearing
    for field in (
        "doing_business_as",
        "industry",
        "business_type",
        "registration_number",
        "trn",
        "nis_number",
        "gct_number",
        "tax_id",
        "incorporation_date",
        "primary_contact_user_id",
        "timezone",
        "language",
    ):
        if field in explicitly_set:
            update_data[field] = getattr(body, field)
    # Address fields — all nullable, allow explicit clearing
    for field in ("address_line1", "address_line2", "city", "region_id"):
        if field in explicitly_set:
            update_data[field] = getattr(body, field)
    if "country_code" in explicitly_set:
        update_data["country_code"] = body.country_code.upper() if body.country_code else None
    if "currency_code" in explicitly_set:
        update_data["currency_code"] = body.currency_code.upper() if body.currency_code else None

    update_data["updated_at"] = now_unix_seconds()

    updated_org = await repo.update(organization_id, **update_data)
    if "status" in update_data:
        await reconcile_finance_connections(
            db,
            organization_id=organization_id,
            limit=None,
        )
    logger.info(
        "organizations.update",
        organization_id=organization_id,
        changed_fields=sorted(update_data.keys()),
    )
    return _serialize_organization(updated_org)


@router.delete(
    "/{organization_id}",
    response_model=OrganizationDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_ORG_SUMMARY,
    description=docs.DELETE_ORG_DESCRIPTION,
    responses=docs.DELETE_ORG_RESPONSES,
)
async def delete_organization(
    organization_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    deleted_by: str | None = None,
    reason: str | None = None,
) -> OrganizationDeleteResponse:
    repo = OrganizationRepository(db)
    org = await repo.get_by_id(organization_id, include_deleted=True)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    # An organization cannot be soft-deleted while it still has members — remove
    # every membership first. To delete the org and everything in it (members,
    # org roles, features) in one irreversible step, use purge instead.
    member_count = await MembershipRepository(db).count_for_org(organization_id)
    if member_count > 0:
        raise AppHTTPException(
            code="organization/has-members",
            message=(
                "Remove all members before deleting this organization, "
                "or purge it to permanently delete the organization and everything in it."
            ),
            http_status_code=status.HTTP_409_CONFLICT,
        )

    await reconcile_finance_connections(
        db,
        organization_id=organization_id,
        limit=None,
        desired_status="REVOKED",
    )
    await repo.delete(organization_id, deleted_by=deleted_by, reason=reason)
    logger.info("organizations.delete", organization_id=organization_id, slug=org.slug)
    return OrganizationDeleteResponse(id=organization_id)


@router.delete(
    "/{organization_id}/purge",
    response_model=OrganizationDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Purge organization",
    description=(
        "Permanently removes an organization record from the database. This cannot be undone. "
        "To retain the record while making it inaccessible, use soft delete (`DELETE /{organization_id}`) instead. "
        "**Admin only.**"
    ),
)
async def purge_organization(
    organization_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    deleted_by: str | None = None,
) -> OrganizationDeleteResponse:
    repo = OrganizationRepository(db)
    org = await repo.get_by_id(organization_id, include_deleted=True)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    await reconcile_finance_connections(
        db,
        organization_id=organization_id,
        limit=None,
        desired_status="REVOKED",
    )
    await repo.purge(organization_id)
    logger.info("organizations.purge", organization_id=organization_id, slug=org.slug, purged_by=deleted_by)
    return OrganizationDeleteResponse(id=organization_id)


@router.get(
    "/{organization_id}/memberships",
    response_model=ListObject[MembershipResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_ORG_MEMBERSHIPS_SUMMARY,
    description=docs.LIST_ORG_MEMBERSHIPS_DESCRIPTION,
    responses=docs.LIST_ORG_MEMBERSHIPS_RESPONSES,
)
async def list_organization_memberships(
    organization_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[MembershipResponse]:
    from db.repositories.memberships import MembershipRepository
    from domains.memberships.router import _serialize_membership

    org = await OrganizationRepository(db).get_by_id(organization_id)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    rows, has_more = await MembershipRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        org_id=organization_id,
    )

    return ListObject[MembershipResponse](
        data=[_serialize_membership(row) for row in rows],
        has_more=has_more,
        url=f"/organizations/{organization_id}/memberships",
    )


@router.post(
    "/{organization_id}/memberships",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_ORG_MEMBERSHIP_SUMMARY,
    description=docs.CREATE_ORG_MEMBERSHIP_DESCRIPTION,
    responses=docs.CREATE_ORG_MEMBERSHIP_RESPONSES,
)
async def create_organization_membership(
    organization_id: str,
    _admin: AdminDep,
    body: MembershipCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MembershipResponse:
    from db.models import User
    from db.repositories.memberships import MembershipRepository

    org = await OrganizationRepository(db).get_by_id(organization_id)
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
            message="No membership exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    repo = MembershipRepository(db)
    if await repo.get_by_org_and_user(organization_id, body.user_id):
        raise AppHTTPException(
            code="membership/duplicate",
            message="This user is already a member of the organization.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    from domains.memberships.router import _serialize_membership

    now = now_unix_seconds()
    membership = await repo.create(
        id=generate_id("membership"),
        organization_id=organization_id,
        user_id=body.user_id,
        role=body.role or "member",
        status=body.status or "active",
        created_at=now,
        updated_at=now,
    )
    await link_membership_role(db, membership, now)
    if membership.status == "active":
        await assign_member_apps(db, org_id=organization_id, user_id=body.user_id, now=now)
    logger.info(
        "organizations.membership.create",
        membership_id=membership.id,
        organization_id=organization_id,
        user_id=body.user_id,
        role=membership.role,
    )
    return _serialize_membership(membership)


# ── Invite endpoints ─────────────────────────────────────────────────────────


@router.get(
    "/{organization_id}/invites",
    response_model=ListObject[InviteTokenResponse],
    status_code=status.HTTP_200_OK,
    summary="List organization invites",
    description="Returns pending and historical invite tokens for an organization. **Admin only**.",
)
async def list_organization_invites(
    organization_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[InviteTokenResponse]:
    org = await OrganizationRepository(db).get_by_id(organization_id)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    rows, has_more = await InviteTokenRepository(db).list_by_org(
        org_id=organization_id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
    )
    return ListObject[InviteTokenResponse](
        data=[_serialize_invite(row) for row in rows],
        has_more=has_more,
        url=f"/organizations/{organization_id}/invites",
    )


@router.post(
    "/{organization_id}/invites",
    response_model=InviteTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization invite",
    description=(
        "Creates an invite token for the given email address. **Admin only**. "
        "The returned token can be embedded in an invite link sent to the invitee. "
        "Email delivery is handled separately."
    ),
)
async def create_organization_invite(
    organization_id: str,
    _admin: AdminDep,
    body: InviteTokenCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InviteTokenResponse:
    org = await OrganizationRepository(db).get_by_id(organization_id)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="No organization exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    source_app_id: str | None = None
    if body.source_app_id or body.source_app_slug:
        if body.source_app_id:
            source_app = await db.get(App, body.source_app_id)
        else:
            stmt = select(App).where(App.slug == body.source_app_slug)
            source_app = (await db.scalars(stmt)).first()
        if source_app is None:
            raise AppHTTPException(
                code="invite/app-not-found",
                message="No app exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        source_app_id = source_app.id

    now = now_unix_seconds()
    invite = await InviteTokenRepository(db).create(
        id=generate_id("invite"),
        organization_id=organization_id,
        email=body.email.strip().lower(),
        role=body.role or "member",
        source_app_id=source_app_id,
        token=secrets.token_urlsafe(32),
        status="pending",
        expires_at=now + (7 * 24 * 60 * 60),  # 7 days
        created_at=now,
        updated_at=now,
    )
    logger.info(
        "organizations.invite.create",
        organization_id=organization_id,
        invite_id=invite.id,
        email=invite.email,
        role=invite.role,
    )
    return _serialize_invite(invite)


@router.delete(
    "/{organization_id}/invites/{invite_id}",
    response_model=InviteTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Revoke organization invite",
    description="Revokes a pending invite token. **Admin only**.",
)
async def revoke_organization_invite(
    organization_id: str,
    invite_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InviteTokenResponse:
    repo = InviteTokenRepository(db)
    invite = await repo.get_by_id(invite_id)
    if not invite or invite.organization_id != organization_id:
        raise AppHTTPException(
            code="invite/not-found",
            message="No invite exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    updated = await repo.update(
        invite_id,
        status="revoked",
        updated_at=now_unix_seconds(),
    )
    logger.info(
        "organizations.invite.revoke",
        organization_id=organization_id,
        invite_id=invite_id,
    )
    return _serialize_invite(updated)


# ── Public invite lookup and accept ──────────────────────────────────────────


async def _get_valid_invite(token: str, db: AsyncSession) -> Any:
    invite = await InviteTokenRepository(db).get_by_token(token)
    now = int(time.time())
    if not invite or invite.status != "pending" or invite.expires_at < now:
        raise AppHTTPException(
            code="invite/not-found",
            message="This invite link is invalid or has expired.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return invite


@router.get(
    "/invite/{token}",
    response_model=InvitePublicResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview invite token",
    description=(
        "Returns a safe preview of the invite — org name, email, role, and expiry. "
        "Returns 404 if the token is unknown, expired, already accepted, or revoked."
    ),
)
async def get_invite_preview(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InvitePublicResponse:
    invite = await _get_valid_invite(token, db)
    stmt = select(Organization).where(Organization.id == invite.organization_id)
    org = (await db.scalars(stmt)).first()
    return InvitePublicResponse(
        org_name=org.name if org else None,
        org_slug=org.slug if org else "",
        email=invite.email,
        role=invite.role,
        expires_at=invite.expires_at,
    )


@router.post(
    "/invite/{token}/accept",
    response_model=MembershipResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept invite token",
    description=(
        "Accepts a pending invite and creates or activates the caller's membership. "
        "Requires the internal key. The caller must provide their `userId` (876 platform user ID) "
        "and their email must match the invite's target email."
    ),
)
async def accept_invite(
    token: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[
        str,
        Query(alias="userId", description="The platform user ID accepting the invite."),
    ],
) -> MembershipResponse:
    invite = await _get_valid_invite(token, db)

    user = await db.get(User, user_id)
    if not user:
        raise AppHTTPException(
            code="invite/user-not-found",
            message="User not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    if user.email.lower() != invite.email.lower():
        raise AppHTTPException(
            code="invite/email-mismatch",
            message="This invite was sent to a different email address.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )

    membership_repo = MembershipRepository(db)
    existing = await membership_repo.get_by_org_and_user(invite.organization_id, user_id)

    now_ts = now_unix_seconds()
    if existing:
        membership = (
            await membership_repo.update(
                existing.id,
                status="active",
                role=invite.role,
                updated_at=now_ts,
            )
            or existing
        )
    else:
        membership = await membership_repo.create(
            id=generate_id("membership"),
            organization_id=invite.organization_id,
            user_id=user_id,
            role=invite.role,
            status="active",
            created_at=now_ts,
            updated_at=now_ts,
        )

    await link_membership_role(db, membership, now_ts)
    await assign_member_apps(
        db,
        org_id=invite.organization_id,
        user_id=user_id,
        now=now_ts,
        source_app_id=invite.source_app_id,
    )

    await InviteTokenRepository(db).update(
        invite.id,
        status="accepted",
        updated_at=now_ts,
    )
    logger.info(
        "organizations.invite.accept",
        organization_id=invite.organization_id,
        user_id=user_id,
        invite_id=invite.id,
        role=invite.role,
    )
    return _serialize_membership(membership)


# ---------------------------------------------------------------------------
# App access routes
# ---------------------------------------------------------------------------


@router.get(
    "/app-access/batch",
    response_model=SubscriptionBatchResponse,
    summary=docs.LIST_SUBSCRIPTIONS_BATCH_SUMMARY,
    description=docs.LIST_SUBSCRIPTIONS_BATCH_DESCRIPTION,
    responses=docs.LIST_SUBSCRIPTIONS_BATCH_RESPONSES,
)
async def batch_list_subscriptions(
    _: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    organization_ids: str = Query(description="Comma-separated list of organization IDs."),
) -> SubscriptionBatchResponse:
    org_ids = [oid.strip() for oid in organization_ids.split(",") if oid.strip()]
    rows = await SubscriptionRepository(db).list_by_orgs(org_ids, app_kind="product")
    items = [_serialize_subscription(r) for r in rows]
    return SubscriptionBatchResponse(data=items, total_count=len(items))


@router.get(
    "/{org_id}/apps",
    response_model=list[SubscriptionResponse],
    summary=docs.LIST_ORG_SUBSCRIPTIONS_SUMMARY,
    description=docs.LIST_ORG_SUBSCRIPTIONS_DESCRIPTION,
    responses=docs.LIST_ORG_SUBSCRIPTIONS_RESPONSES,
)
async def list_org_subscriptions(
    org_id: str,
    _: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SubscriptionResponse]:
    rows = await SubscriptionRepository(db).list_by_org(org_id, app_kind="product")
    return [_serialize_subscription(r) for r in rows]


@router.post(
    "/{org_id}/apps",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.PROVISION_SUBSCRIPTION_SUMMARY,
    description=docs.PROVISION_SUBSCRIPTION_DESCRIPTION,
    responses=docs.PROVISION_SUBSCRIPTION_RESPONSES,
)
async def provision_subscription(
    org_id: str,
    body: SubscriptionProvisionRequest,
    _: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    return await _provision_org_subscription(db, org_id, body)


async def _provision_org_subscription(
    db: AsyncSession, org_id: str, body: SubscriptionProvisionRequest
) -> SubscriptionResponse:
    org = await OrganizationRepository(db).get_by_id(org_id)
    if not org:
        raise AppHTTPException(
            code="organization/not-found",
            message="Organization not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    if body.app_id:
        app = await db.get(App, body.app_id)
    elif body.app_slug:
        app = (await db.scalars(select(App).where(App.slug == body.app_slug))).first()
    else:
        raise AppHTTPException(
            code="subscription/app-required",
            message="Provide app_id or app_slug.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    price_id = body.price_id
    if price_id is None:
        default_price = await PriceRepository(db).get_default_for_app(app.id)
        price_id = default_price.id if default_price else None

    row = await SubscriptionRepository(db).provision(org_id=org_id, app_id=app.id, price_id=price_id)
    logger.info("organizations.subscription.provision", org_id=org_id, app_id=app.id, price_id=price_id)
    return _serialize_subscription(row)


@router.get(
    "/{org_id}/apps/by-slug/{app_slug}",
    response_model=SubscriptionResponse,
    summary=docs.GET_SUBSCRIPTION_BY_SLUG_SUMMARY,
    description=docs.GET_SUBSCRIPTION_BY_SLUG_DESCRIPTION,
    responses=docs.GET_SUBSCRIPTION_BY_SLUG_RESPONSES,
)
async def get_subscription_by_slug(
    org_id: str,
    app_slug: str,
    _: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    row = await SubscriptionRepository(db).get_by_app_slug(org_id=org_id, app_slug=app_slug)
    if not row:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_subscription(row)


@router.get(
    "/{org_id}/apps/{app_id}",
    response_model=SubscriptionResponse,
    summary=docs.GET_SUBSCRIPTION_SUMMARY,
    description=docs.GET_SUBSCRIPTION_DESCRIPTION,
    responses=docs.GET_SUBSCRIPTION_RESPONSES,
)
async def get_subscription(
    org_id: str,
    app_id: str,
    _: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    row = await SubscriptionRepository(db).get(org_id=org_id, app_id=app_id)
    if not row:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_subscription(row)


@router.patch(
    "/{org_id}/apps/{app_id}",
    response_model=SubscriptionResponse,
    summary=docs.UPDATE_SUBSCRIPTION_SUMMARY,
    description=docs.UPDATE_SUBSCRIPTION_DESCRIPTION,
    responses=docs.UPDATE_SUBSCRIPTION_RESPONSES,
)
async def update_subscription(
    org_id: str,
    app_id: str,
    body: SubscriptionUpdateRequest,
    _: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    updates: dict[str, Any] = {}
    if body.status is not None:
        updates["status"] = body.status
        if body.status == "canceled":
            updates["canceled_at"] = now_unix_seconds()
    if body.cancel_at_period_end is not None:
        updates["cancel_at_period_end"] = body.cancel_at_period_end
    if not updates and body.price_id is None:
        raise AppHTTPException(
            code="subscription/update-required",
            message="Provide status, cancel_at_period_end, or price_id.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    row = (
        await SubscriptionRepository(db).update(org_id=org_id, app_id=app_id, **updates)
        if updates
        else (await SubscriptionRepository(db).get(org_id=org_id, app_id=app_id))
    )
    if not row:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if body.price_id is not None:
        await SubscriptionRepository(db).set_price(row.id, body.price_id)
        row = await SubscriptionRepository(db).get(org_id=org_id, app_id=app_id)

    logger.info("organizations.subscription.update", org_id=org_id, app_id=app_id, status=body.status)
    return _serialize_subscription(row)


# ── Self-scoped subscription endpoints (session tier) ────────────────────────
#
# These let a signed-in org member read — and an owner/admin provision — their
# OWN org's app subscriptions without the internal key. Product apps (Couriers,
# Enterprise) call these through `@876/sdk`; the AdminDep routes above remain
# the Console/platform surface.


@router.get(
    "/{org_id}/subscriptions",
    response_model=ListObject[SubscriptionResponse],
    summary=docs.LIST_MY_ORG_SUBSCRIPTIONS_SUMMARY,
    description=docs.LIST_MY_ORG_SUBSCRIPTIONS_DESCRIPTION,
    responses=docs.LIST_MY_ORG_SUBSCRIPTIONS_RESPONSES,
)
async def list_my_org_subscriptions(
    org_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[SubscriptionResponse]:
    await _require_org_membership(db, org_id, principal)
    rows = await SubscriptionRepository(db).list_by_org(org_id)
    return ListObject[SubscriptionResponse](
        data=[_serialize_subscription(r) for r in rows],
        has_more=False,
        url=f"/organizations/{org_id}/subscriptions",
    )


@router.get(
    "/{org_id}/subscriptions/by-slug/{app_slug}",
    response_model=SubscriptionResponse,
    summary=docs.RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_SUMMARY,
    description=docs.RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_DESCRIPTION,
    responses=docs.RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_RESPONSES,
)
async def retrieve_my_org_subscription_by_slug(
    org_id: str,
    app_slug: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    await _require_org_membership(db, org_id, principal)
    row = await SubscriptionRepository(db).get_by_app_slug(org_id=org_id, app_slug=app_slug)
    if not row:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_subscription(row)


@router.post(
    "/{org_id}/subscriptions",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.PROVISION_MY_ORG_SUBSCRIPTION_SUMMARY,
    description=docs.PROVISION_MY_ORG_SUBSCRIPTION_DESCRIPTION,
    responses=docs.PROVISION_MY_ORG_SUBSCRIPTION_RESPONSES,
)
async def provision_my_org_subscription(
    org_id: str,
    body: SubscriptionProvisionRequest,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    await _require_org_permission(db, org_id, principal, "apps:provision")
    return await _provision_org_subscription(db, org_id, body)
