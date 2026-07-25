"""Identity-aware `customer.ensure` for Core-to-Billing party synchronization.

Core emits one `customer.ensure` per organization (and per user already known to
Billing). The event carries no tenant, because the platform operator's workspace
owns platform-level customers: an 876 organization is a customer of the operator
from the moment it exists.

Matching is on the core identity (`organizationId` / `userId`), never on a
Billing id — Core does not know Billing ids. The unique indexes
`billing_customers_tenant_id_organization_id_key` and
`..._user_id_key` make the match total.
"""

from __future__ import annotations

import secrets
import time
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppHTTPException
from db.models import Contact, Customer, Tenant
from db.models.generated.enums import CustomerKind, CustomerStatus, CustomerType


def _generated_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(12)}"


async def _resolve_tenant(session: AsyncSession, body: dict[str, Any]) -> Tenant:
    """Resolves the workspace that owns this customer.

    An explicit `tenantId`/`tenantSlug` wins; otherwise the configured platform
    workspace receives the event.
    """
    tenant_id = body.get("tenantId")
    if tenant_id:
        tenant = await session.get(Tenant, str(tenant_id))
        if tenant is None:
            raise AppHTTPException(
                code="billing/tenant-not-found",
                message="The requested Billing workspace was not found.",
                http_status_code=404,
            )
        return tenant

    slug = str(body.get("tenantSlug") or get_settings().platform_tenant_slug or "").strip()
    if not slug:
        raise AppHTTPException(
            code="billing/platform-tenant-unconfigured",
            message="Set BILLING_PLATFORM_TENANT_SLUG to receive platform customer events.",
            http_status_code=503,
        )

    tenant = (await session.scalars(select(Tenant).where(Tenant.slug == slug))).first()
    if tenant is None:
        raise AppHTTPException(
            code="billing/platform-tenant-not-found",
            message=f"No Billing workspace matches the platform slug '{slug}'.",
            http_status_code=503,
        )
    return tenant


def _identity_filter(customer_type: str, body: dict[str, Any]) -> tuple[str, str]:
    """Returns the (column, value) pair identifying the party."""
    if customer_type == "CORE_ORGANIZATION":
        organization_id = body.get("organizationId")
        if not organization_id:
            raise AppHTTPException(
                code="validation/invalid-request",
                message="organizationId is required for a CORE_ORGANIZATION customer.",
                http_status_code=422,
            )
        return "organization_id", str(organization_id)

    user_id = body.get("userId")
    if not user_id:
        raise AppHTTPException(
            code="validation/invalid-request",
            message="userId is required for a CORE_USER customer.",
            http_status_code=422,
        )
    return "user_id", str(user_id)


def _identity_values(body: dict[str, Any], now: int) -> dict[str, Any]:
    """The snapshot fields Core owns. Billing-owned fields are never touched."""
    kind = str(body.get("customerKind") or CustomerKind.INDIVIDUAL.value)
    return {
        "customer_kind": CustomerKind(kind),
        "name": str(body.get("name") or ""),
        "email": body.get("email"),
        "company_name": body.get("companyName"),
        "first_name": body.get("firstName"),
        "last_name": body.get("lastName"),
        "phone": body.get("phone"),
        "core_synced_at": now,
        "updated_at": now,
    }


async def ensure_core_customer(session: AsyncSession, body: dict[str, Any]) -> dict[str, Any]:
    """Idempotently mirrors one core party into a Billing workspace."""
    customer_type = str(body.get("customerType") or "")
    if customer_type not in {CustomerType.CORE_ORGANIZATION.value, CustomerType.CORE_USER.value}:
        raise AppHTTPException(
            code="validation/invalid-request",
            message="customerType must be CORE_ORGANIZATION or CORE_USER.",
            http_status_code=422,
        )

    tenant = await _resolve_tenant(session, body)
    column, value = _identity_filter(customer_type, body)
    now = int(time.time())

    existing = (
        await session.scalars(
            select(Customer).where(
                Customer.tenant_id == tenant.id,
                getattr(Customer, column) == value,
            )
        )
    ).first()

    values = _identity_values(body, now)
    if existing is None:
        customer = Customer(
            id=_generated_id("cust"),
            tenant_id=tenant.id,
            customer_type=CustomerType(customer_type),
            organization_id=value if column == "organization_id" else None,
            user_id=value if column == "user_id" else None,
            default_currency=tenant.default_currency,
            language=tenant.default_language,
            status=CustomerStatus.ACTIVE,
            created_at=now,
            **values,
        )
        session.add(customer)
        await session.flush()
        created = True
    else:
        # A name is only overwritten when Core supplies one, so a workspace that
        # renamed a customer locally is not clobbered by an empty snapshot.
        if not values["name"]:
            values.pop("name")
        for key, field_value in values.items():
            setattr(existing, key, field_value)
        customer = existing
        created = False

    await _sync_primary_contact(session, tenant.id, customer.id, body.get("primaryContact"), now)
    await session.flush()

    return {"object": "acknowledgement", "id": customer.id, "created": created}


def serialize_contact(contact: Contact) -> dict[str, Any]:
    """The contact shape embedded on a serialized customer."""
    return {
        "object": "contact",
        "id": contact.id,
        "userId": contact.user_id,
        "salutation": contact.salutation,
        "firstName": contact.first_name,
        "lastName": contact.last_name,
        "email": contact.email,
        "workPhone": contact.work_phone,
        "mobilePhone": contact.mobile_phone,
        "isPrimary": contact.is_primary,
        "coreSyncedAt": contact.core_synced_at,
    }


async def attach_primary_contacts(
    session: AsyncSession,
    payloads: list[dict[str, Any]],
) -> None:
    """Attaches `primaryContact` to each serialized customer, in one query.

    A business customer's contact is what a caller renders next to the company
    name; without it every app has to resolve the org owner itself.
    """
    customer_ids = [str(payload["id"]) for payload in payloads if payload.get("id")]
    if not customer_ids:
        return

    rows = list(
        (
            await session.scalars(
                select(Contact).where(
                    Contact.customer_id.in_(customer_ids),
                    Contact.is_primary.is_(True),
                )
            )
        ).all()
    )
    by_customer = {row.customer_id: row for row in rows}

    for payload in payloads:
        contact = by_customer.get(str(payload.get("id")))
        payload["primaryContact"] = serialize_contact(contact) if contact else None


async def _sync_primary_contact(
    session: AsyncSession,
    tenant_id: str,
    customer_id: str,
    contact: Any,
    now: int,
) -> None:
    """Seeds or refreshes the organization owner as the customer's primary contact.

    Only the declared contact is mirrored — members are never bulk-imported. A
    hand-added primary contact is demoted rather than deleted, so no
    locally-entered person is lost.
    """
    if not isinstance(contact, dict):
        return
    user_id = contact.get("userId")
    if not user_id:
        return

    existing = (
        await session.scalars(
            select(Contact).where(
                Contact.tenant_id == tenant_id,
                Contact.customer_id == customer_id,
                Contact.user_id == str(user_id),
            )
        )
    ).first()

    if existing is not None:
        existing.first_name = contact.get("firstName")
        existing.last_name = contact.get("lastName")
        existing.email = contact.get("email")
        existing.mobile_phone = contact.get("phone") or existing.mobile_phone
        existing.is_primary = True
        existing.core_synced_at = now
        existing.updated_at = now
        return

    # One primary per customer is enforced by a partial unique index.
    await session.execute(
        update(Contact)
        .where(
            Contact.tenant_id == tenant_id,
            Contact.customer_id == customer_id,
            Contact.is_primary.is_(True),
        )
        .values(is_primary=False, updated_at=now)
    )
    await session.flush()

    session.add(
        Contact(
            id=_generated_id("con"),
            tenant_id=tenant_id,
            customer_id=customer_id,
            user_id=str(user_id),
            first_name=contact.get("firstName"),
            last_name=contact.get("lastName"),
            email=contact.get("email"),
            mobile_phone=contact.get("phone"),
            is_primary=True,
            core_synced_at=now,
            created_at=now,
            updated_at=now,
        )
    )
