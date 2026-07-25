from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from db.models import BillingCustomerOutbox, Membership, Organization, User

CUSTOMER_EVENT_TYPE = "customer.ensure"


@dataclass(frozen=True)
class PartySnapshot:
    """The identity fields Billing needs to render a customer without a callback."""

    subject_type: str
    subject_id: str
    customer_kind: str
    name: str
    email: str | None
    company_name: str | None
    first_name: str | None
    last_name: str | None
    phone: str | None
    contact_user_id: str | None
    contact_first_name: str | None
    contact_last_name: str | None
    contact_email: str | None
    contact_phone: str | None


def _full_name(first_name: str | None, last_name: str | None) -> str | None:
    parts = [part.strip() for part in (first_name, last_name) if part and part.strip()]
    return " ".join(parts) or None


def _customer_name_for_user(user: User) -> str:
    return (
        getattr(user, "name", None)
        or _full_name(getattr(user, "first_name", None), getattr(user, "last_name", None))
        or getattr(user, "username", None)
        or getattr(user, "email", None)
        or user.id
    )


async def _resolve_org_primary_contact(
    db: AsyncSession,
    organization: Organization,
) -> User | None:
    """Resolves an organization's primary contact.

    Order: the organization's declared `primary_contact_user_id`, then the
    owner membership, then the earliest membership. Returns None when the org
    has no members — callers must not fabricate a contact.
    """
    declared_id = getattr(organization, "primary_contact_user_id", None)
    if declared_id:
        declared = await db.get(User, declared_id)
        if declared is not None:
            return declared

    memberships = list(
        (
            await db.scalars(
                select(Membership)
                .where(Membership.organization_id == organization.id)
                .order_by(Membership.created_at, Membership.id)
            )
        ).all()
    )
    if not memberships:
        return None

    owner = next((m for m in memberships if m.role == "owner"), memberships[0])
    return await db.get(User, owner.user_id)


async def snapshot_for_organization(db: AsyncSession, organization: Organization) -> PartySnapshot:
    """Builds the BUSINESS party snapshot for a core organization."""
    contact = await _resolve_org_primary_contact(db, organization)
    legal_name = organization.name or organization.id
    display_name = getattr(organization, "doing_business_as", None) or legal_name

    return PartySnapshot(
        subject_type="organization",
        subject_id=organization.id,
        customer_kind="BUSINESS",
        name=display_name,
        email=getattr(organization, "primary_email", None) or (contact.email if contact else None),
        company_name=legal_name,
        # An organization's first/last name mirror its primary contact so a
        # single "customer name" column renders a person for both party kinds.
        first_name=contact.first_name if contact else None,
        last_name=contact.last_name if contact else None,
        phone=getattr(organization, "primary_phone", None),
        contact_user_id=contact.id if contact else None,
        contact_first_name=contact.first_name if contact else None,
        contact_last_name=contact.last_name if contact else None,
        contact_email=contact.email if contact else None,
        contact_phone=getattr(contact, "phone", None) if contact else None,
    )


def snapshot_for_user(user: User) -> PartySnapshot:
    """Builds the INDIVIDUAL party snapshot for a core user."""
    return PartySnapshot(
        subject_type="user",
        subject_id=user.id,
        customer_kind="INDIVIDUAL",
        name=_customer_name_for_user(user),
        email=getattr(user, "email", None) or None,
        company_name=None,
        first_name=getattr(user, "first_name", None) or None,
        last_name=getattr(user, "last_name", None) or None,
        phone=getattr(user, "phone", None),
        # A person is their own contact; Billing seeds no separate contact row.
        contact_user_id=None,
        contact_first_name=None,
        contact_last_name=None,
        contact_email=None,
        contact_phone=None,
    )


def _payload_hash(snapshot: PartySnapshot) -> str:
    payload = json.dumps(snapshot.__dict__, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def _enqueue_customer_ensure(
    db: AsyncSession,
    snapshot: PartySnapshot,
    now: int,
) -> bool:
    payload_hash = _payload_hash(snapshot)

    latest = (
        await db.scalars(
            select(BillingCustomerOutbox)
            .where(
                BillingCustomerOutbox.subject_type == snapshot.subject_type,
                BillingCustomerOutbox.subject_id == snapshot.subject_id,
            )
            .order_by(BillingCustomerOutbox.created_at.desc(), BillingCustomerOutbox.id.desc())
            .limit(1)
        )
    ).first()

    if latest is not None:
        # An undelivered event is refreshed in place rather than duplicated.
        if latest.status in ("pending", "processing"):
            if latest.payload_hash != payload_hash:
                _apply_snapshot(latest, snapshot, payload_hash, now)
                latest.updated_at = now
                await db.flush()
            return False
        # Nothing changed since the last successful delivery.
        if latest.status == "delivered" and latest.payload_hash == payload_hash:
            return False

    event = BillingCustomerOutbox(
        id=generate_id("billingCustomerEvent"),
        event_type=CUSTOMER_EVENT_TYPE,
        subject_type=snapshot.subject_type,
        subject_id=snapshot.subject_id,
        name=snapshot.name,
        email=snapshot.email,
        occurred_at=now,
        status="pending",
        attempt_count=0,
        available_at=now,
        locked_at=None,
        delivered_at=None,
        last_error=None,
        created_at=now,
        updated_at=now,
    )
    _apply_snapshot(event, snapshot, payload_hash, now)
    db.add(event)
    await db.flush()
    return True


def _apply_snapshot(
    event: BillingCustomerOutbox,
    snapshot: PartySnapshot,
    payload_hash: str,
    now: int,
) -> None:
    event.name = snapshot.name
    event.email = snapshot.email
    event.customer_kind = snapshot.customer_kind
    event.company_name = snapshot.company_name
    event.first_name = snapshot.first_name
    event.last_name = snapshot.last_name
    event.phone = snapshot.phone
    event.contact_user_id = snapshot.contact_user_id
    event.contact_first_name = snapshot.contact_first_name
    event.contact_last_name = snapshot.contact_last_name
    event.contact_email = snapshot.contact_email
    event.contact_phone = snapshot.contact_phone
    event.payload_hash = payload_hash
    event.occurred_at = now


async def enqueue_customer_ensure_for_organization(
    db: AsyncSession,
    organization: Organization,
    now: int,
) -> None:
    await _enqueue_customer_ensure(db, await snapshot_for_organization(db, organization), now)


async def enqueue_customer_ensure_for_user(db: AsyncSession, user: User, now: int) -> None:
    await _enqueue_customer_ensure(db, snapshot_for_user(user), now)


def customer_event_payload(event: BillingCustomerOutbox) -> dict[str, object]:
    """Serializes one outbox row into the Billing `customer.ensure` contract."""
    common: dict[str, object] = {
        "customerKind": event.customer_kind
        or ("BUSINESS" if event.subject_type == "organization" else "INDIVIDUAL"),
        "name": event.name,
        "email": event.email,
        "firstName": event.first_name,
        "lastName": event.last_name,
        "phone": event.phone,
    }

    if event.subject_type == "organization":
        return {
            **common,
            "customerType": "CORE_ORGANIZATION",
            "organizationId": event.subject_id,
            "companyName": event.company_name,
            "primaryContact": _contact_payload(event),
        }

    return {
        **common,
        "customerType": "CORE_USER",
        "userId": event.subject_id,
    }


def _contact_payload(event: BillingCustomerOutbox) -> dict[str, object] | None:
    if not event.contact_user_id:
        return None
    return {
        "userId": event.contact_user_id,
        "firstName": event.contact_first_name,
        "lastName": event.contact_last_name,
        "email": event.contact_email,
        "phone": event.contact_phone,
    }


async def enqueue_reconcile_all(db: AsyncSession, now: int) -> dict[str, int]:
    """Re-enqueues every organization, plus every user already known to Billing.

    Organizations are always reconciled: an org is a customer of the platform
    from the moment it exists. Users are only reconciled when a prior event
    exists for them — signing up for a free 876 account does not make someone a
    customer, so reconciliation must not manufacture one.
    """
    organizations = list((await db.scalars(select(Organization).order_by(Organization.id))).all())
    organization_count = 0
    for organization in organizations:
        if await _enqueue_customer_ensure(db, await snapshot_for_organization(db, organization), now):
            organization_count += 1

    known_user_ids = list(
        (
            await db.scalars(
                select(BillingCustomerOutbox.subject_id)
                .where(BillingCustomerOutbox.subject_type == "user")
                .distinct()
            )
        ).all()
    )
    user_count = 0
    for user_id in known_user_ids:
        user = await db.get(User, user_id)
        if user is None:
            continue
        if await _enqueue_customer_ensure(db, snapshot_for_user(user), now):
            user_count += 1

    return {"organizations": organization_count, "users": user_count}
