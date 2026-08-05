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

# Billing is the organization's financial plane — invoices, payment methods and
# the customer registry all hang off it — so an org has it from the moment it
# exists, the same way a Google account reaches Drive without a separate
# sign-up. Heavier surfaces stay behind explicit setup.
BILLING_APP_SLUG = "876-billing"

# Provisioned for every new organization regardless of where it signed up.
DEFAULT_ORG_APP_SLUGS: tuple[str, ...] = (ENTERPRISE_APP_SLUG, BILLING_APP_SLUG)


async def provision_org_apps(db: AsyncSession, org_id: str, *, source_app_id: str | None = None) -> list[str]:
    """Subscribe an org to its default apps plus the app it signed up through.

    Every organization gets Enterprise (where it manages itself) and Billing
    (its financial plane) without asking, and additionally the product app the
    signup came from — a courier company that registers through Couriers should
    land in Couriers, not be told it has no subscription.

    Idempotent, and never fails provisioning: a missing app row means a
    partially seeded environment, which is worth shouting about but is not a
    reason to fail somebody's signup.

    Returns the app ids actually subscribed.
    """
    apps = AppRepository(db)
    subscriptions = SubscriptionRepository(db)
    prices = PriceRepository(db)

    app_ids: list[str] = []
    for slug in DEFAULT_ORG_APP_SLUGS:
        app = await apps.get_by_slug(slug)
        if app is None:
            logger.error("provisioning.default_app_missing", org_id=org_id, slug=slug)
            continue
        app_ids.append(app.id)

    # The source app is identified by the API key the request authenticated
    # with, so it cannot be spoofed by a client claiming to be another app.
    if source_app_id is not None and source_app_id not in app_ids:
        app_ids.append(source_app_id)

    provisioned: list[str] = []
    for app_id in app_ids:
        if await subscriptions.get(org_id, app_id) is not None:
            continue
        default_price = await prices.get_default_for_app(app_id)
        await subscriptions.provision(org_id, app_id, default_price.id if default_price else None)
        provisioned.append(app_id)

    if provisioned:
        logger.info("provisioning.org_apps", org_id=org_id, app_ids=provisioned)
    return provisioned


async def provision_organization(
    db: AsyncSession, org_id: str, now: int, *, source_app_id: str | None = None
) -> dict[str, OrganizationRole]:
    """Idempotently provision an org: default roles + app entitlements.

    Returns the org's system roles keyed by name so callers can link the
    creator's membership without a second query.
    """
    roles = await OrganizationRoleRepository(db).seed_defaults(org_id, now)

    await provision_org_apps(db, org_id, source_app_id=source_app_id)

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
