from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from db.models import BillingCustomerOutbox, Organization, User

CUSTOMER_EVENT_TYPE = "customer.ensure"


def _customer_name_for_user(user: User) -> str:
    first_name = getattr(user, "first_name", "") or ""
    last_name = getattr(user, "last_name", "") or ""
    full_name = " ".join(part.strip() for part in (first_name, last_name) if part.strip())
    return (
        getattr(user, "name", None)
        or full_name
        or getattr(user, "username", None)
        or getattr(user, "email", None)
        or user.id
    )


async def _enqueue_customer_ensure(
    db: AsyncSession,
    *,
    subject_type: str,
    subject_id: str,
    name: str,
    email: str | None,
    now: int,
) -> bool:
    existing = (
        await db.scalars(
            select(BillingCustomerOutbox.id).where(
                BillingCustomerOutbox.subject_type == subject_type,
                BillingCustomerOutbox.subject_id == subject_id,
                BillingCustomerOutbox.status.in_(("pending", "processing")),
            )
        )
    ).first()
    if existing is not None:
        return False
    db.add(
        BillingCustomerOutbox(
            id=generate_id("billingCustomerEvent"),
            event_type=CUSTOMER_EVENT_TYPE,
            subject_type=subject_type,
            subject_id=subject_id,
            name=name,
            email=email,
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
    )
    await db.flush()
    return True


async def enqueue_customer_ensure_for_organization(
    db: AsyncSession,
    organization: Organization,
    now: int,
) -> None:
    await _enqueue_customer_ensure(
        db,
        subject_type="organization",
        subject_id=organization.id,
        name=organization.name or organization.id,
        email=None,
        now=now,
    )


async def enqueue_customer_ensure_for_user(db: AsyncSession, user: User, now: int) -> None:
    await _enqueue_customer_ensure(
        db,
        subject_type="user",
        subject_id=user.id,
        name=_customer_name_for_user(user),
        email=getattr(user, "email", None) or None,
        now=now,
    )


def customer_event_payload(event: BillingCustomerOutbox) -> dict[str, object]:
    if event.subject_type == "organization":
        return {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": event.subject_id,
            "name": event.name,
            "email": None,
        }
    return {
        "customerType": "CORE_USER",
        "userId": event.subject_id,
        "name": event.name,
        "email": event.email,
    }


async def enqueue_reconcile_all(db: AsyncSession, now: int) -> dict[str, int]:
    organizations = list((await db.scalars(select(Organization).order_by(Organization.id))).all())
    users = list((await db.scalars(select(User).order_by(User.id))).all())
    organization_count = 0
    user_count = 0
    for organization in organizations:
        if await _enqueue_customer_ensure(
            db,
            subject_type="organization",
            subject_id=organization.id,
            name=organization.name or organization.id,
            email=None,
            now=now,
        ):
            organization_count += 1
    for user in users:
        if await _enqueue_customer_ensure(
            db,
            subject_type="user",
            subject_id=user.id,
            name=_customer_name_for_user(user),
            email=getattr(user, "email", None) or None,
            now=now,
        ):
            user_count += 1
    return {"organizations": organization_count, "users": user_count}
