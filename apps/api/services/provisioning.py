"""Organization provisioning: default roles, app entitlements, member assignments.

Formalizes the platform's provisioning flow (see ``core/org_permissions.py``
for terminology):

1. When an organization is created — by business registration, the admin API,
   or a product-app onboarding flow — it is provisioned with its default role
   set and an active subscription to the Enterprise directory app.
2. When a member joins — creation, invite accept, or SSO — their membership is
   linked to the org role matching their role name, and they are assigned to
   the Enterprise app (plus the source app when they arrived through one,
   e.g. Couriers registration/invites).

Members added through the Enterprise directory itself get NO product-app
assignments — those are granted explicitly (``apps:assign``).
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from core.logging import get_logger
from db.models import Membership, Organization, OrganizationRole, User
from db.repositories.app_assignments import AppAssignmentRepository
from db.repositories.apps import AppRepository
from db.repositories.org_contacts import OrgContactRepository
from db.repositories.org_roles import OrganizationRoleRepository
from db.repositories.prices import PriceRepository
from db.repositories.subscriptions import SubscriptionRepository
from services.billing_customer_sync import enqueue_customer_ensure_for_organization

logger = get_logger(__name__)

# Every org is entitled to the Enterprise directory app; membership in the org
# is what admits a user to it (assignments are still written for consistency).
ENTERPRISE_APP_SLUG = "876-enterprise"


async def provision_organization(db: AsyncSession, org_id: str, now: int) -> dict[str, OrganizationRole]:
    """Idempotently provision an org: default roles + Enterprise entitlement.

    Returns the org's system roles keyed by name so callers can link the
    creator's membership without a second query.
    """
    roles = await OrganizationRoleRepository(db).seed_defaults(org_id, now)

    enterprise_app = await AppRepository(db).get_by_slug(ENTERPRISE_APP_SLUG)
    if enterprise_app is None:
        # Platform-app seeding runs at startup; missing row means a partially
        # seeded environment. The org still works — log loudly, don't fail signup.
        logger.error("provisioning.enterprise_app_missing", org_id=org_id, slug=ENTERPRISE_APP_SLUG)
    else:
        subscriptions = SubscriptionRepository(db)
        if await subscriptions.get(org_id, enterprise_app.id) is None:
            default_price = await PriceRepository(db).get_default_for_app(enterprise_app.id)
            await subscriptions.provision(org_id, enterprise_app.id, default_price.id if default_price else None)

    organization = (await db.scalars(select(Organization).where(Organization.id == org_id))).first()
    if organization is not None:
        await enqueue_customer_ensure_for_organization(db, organization, now)

    return roles


async def ensure_default_contact(db: AsyncSession, org_id: str, user: User, now: int) -> None:
    """Seed the org's default primary contact from its owner.

    Idempotent: does nothing once the org has any active contact. Contacts can
    later be re-pointed, demoted, or extended with non-member people — this
    only guarantees a new org starts with its owner as the primary contact.
    """
    repo = OrgContactRepository(db)
    if await repo.list_by_org(org_id):
        return

    await repo.create(
        id=generate_id("orgContact"),
        organization_id=org_id,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        type="general",
        is_primary=True,
        email=user.email,
        phone=user.phone,
        created_at=now,
        updated_at=now,
    )
    logger.info("provisioning.default_contact", org_id=org_id, user_id=user.id)


async def resolve_member_permissions(db: AsyncSession, membership: Membership) -> set[str]:
    """Effective org permissions for a membership.

    Prefers the linked organization role; memberships not yet linked (or whose
    role row was removed) fall back to the code-default permission set for
    their role name.
    """
    from core.org_permissions import default_permissions_for_role_name

    if membership.role_id:
        role = await OrganizationRoleRepository(db).get_by_id_for_org(
            membership.role_id, membership.organization_id
        )
        if role is not None:
            return set(role.permissions)
    return set(default_permissions_for_role_name(membership.role))


async def resolve_role_id(db: AsyncSession, org_id: str, role_name: str) -> str | None:
    """The org-role row ID for a role name; None when the org has no such role."""
    role = await OrganizationRoleRepository(db).get_by_name(org_id, role_name)
    return role.id if role else None


async def link_membership_role(db: AsyncSession, membership: Membership, now: int) -> None:
    """Point ``membership.role_id`` at the org role matching its role name."""
    role_id = await resolve_role_id(db, membership.organization_id, membership.role)
    if membership.role_id != role_id:
        membership.role_id = role_id
        membership.updated_at = now
        await db.flush()


async def assign_member_apps(
    db: AsyncSession,
    *,
    org_id: str,
    user_id: str,
    now: int,
    source_app_id: str | None = None,
    assigned_by: str | None = None,
) -> None:
    """Assign a member the Enterprise directory app plus the source app, if any."""
    assignments = AppAssignmentRepository(db)

    enterprise_app = await AppRepository(db).get_by_slug(ENTERPRISE_APP_SLUG)
    if enterprise_app is not None:
        await assignments.assign(org_id, user_id, enterprise_app.id, now, assigned_by=assigned_by)

    if source_app_id and (enterprise_app is None or source_app_id != enterprise_app.id):
        await assignments.assign(org_id, user_id, source_app_id, now, assigned_by=assigned_by)
