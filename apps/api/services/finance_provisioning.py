from __future__ import annotations

from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id, normalize_slug
from core.timestamps import now_unix_seconds
from db.models import (
    App,
    FinanceProvisioningOutbox,
    Organization,
    ProvisioningManifestRevision,
    ProvisioningRun,
    Subscription,
)
from db.repositories.provisioning import ProvisioningRepository
from db.repositories.provisioning_runs import ProvisioningRunRepository, ProvisioningRunTrigger

FINANCE_EVENT_TYPE = "finance_connection.ensure"
FINANCE_EVENT_CONTRACT_VERSION = 1

_ACTIVE_SUBSCRIPTION_STATES = frozenset({"active", "trialing"})
_REVOKED_SUBSCRIPTION_STATES = frozenset({"canceled", "incomplete_expired"})

FinanceConnectionStatus = Literal["ACTIVE", "SUSPENDED", "REVOKED"]


def desired_finance_connection_status(subscription_status: str) -> FinanceConnectionStatus:
    """Map commercial entitlement state to a deny-by-default finance state."""
    normalized = subscription_status.strip().lower()
    if normalized in _ACTIVE_SUBSCRIPTION_STATES:
        return "ACTIVE"
    if normalized in _REVOKED_SUBSCRIPTION_STATES:
        return "REVOKED"
    return "SUSPENDED"


async def enqueue_finance_connection_event(
    db: AsyncSession,
    subscription: Subscription,
    *,
    desired_status: FinanceConnectionStatus | None = None,
    trigger: ProvisioningRunTrigger = "app_activation",
) -> FinanceProvisioningOutbox | ProvisioningRun | None:
    """Append the next connection event when the desired snapshot changed.

    The subscription row is locked so concurrent entitlement mutations cannot
    issue the same lifecycle revision. Identical retries reuse the existing
    outbox event and do not advance the revision.
    """
    await db.flush()
    locked = await db.scalar(select(Subscription).where(Subscription.id == subscription.id).with_for_update())
    if locked is None:
        return None

    organization = await db.get(Organization, locked.organization_id, with_for_update=True)
    if organization is None:
        raise RuntimeError(f"Subscription {locked.id} references missing organization {locked.organization_id}.")
    source_app = await db.get(App, locked.app_id)
    if source_app is None:
        raise RuntimeError(f"Subscription {locked.id} references missing app {locked.app_id}.")

    connection_aggregate_id = f"{locked.organization_id}:{locked.app_id}"
    subscriptions = list(
        (
            await db.scalars(
                select(Subscription)
                .where(
                    Subscription.organization_id == locked.organization_id,
                    Subscription.app_id == locked.app_id,
                )
                .order_by(Subscription.id)
            )
        ).all()
    )

    provisioning_repository = ProvisioningRepository(db)
    profile = await provisioning_repository.retrieve_revision("application", locked.app_id, "published")
    latest = await db.scalar(
        select(FinanceProvisioningOutbox)
        .where(FinanceProvisioningOutbox.aggregate_id == connection_aggregate_id)
        .order_by(FinanceProvisioningOutbox.lifecycle_version.desc())
        .limit(1)
    )

    if profile is None or profile.finance_dependency == "none":
        if latest is None:
            if profile is not None:
                run, created = await ProvisioningRunRepository(db).create_for_application(
                    organization_id=organization.id,
                    app_id=locked.app_id,
                    subscription_id=locked.id,
                    trigger=trigger,
                    application_revision=profile,
                    now=now_unix_seconds(),
                )
                return run if created else None
            return None
        next_status = "REVOKED"
        scopes = list(latest.scopes)
        provisioning_revision = profile.revision if profile is not None else latest.provisioning_version
    else:
        scopes = sorted(set(profile.finance_scopes))
        provisioning_revision = profile.revision
        next_status, entitlement_reference = _effective_subscription_state(subscriptions)

    if profile is not None and profile.finance_dependency != "none":
        if desired_status == "REVOKED" or organization.deleted_at is not None or source_app.deleted_at is not None:
            next_status = "REVOKED"
        elif desired_status is not None:
            next_status = desired_status
        elif organization.status != "active" or source_app.status != "active":
            next_status = "SUSPENDED"
    else:
        assert latest is not None
        entitlement_reference = latest.entitlement_reference

    if latest is not None and _event_matches(
        latest,
        desired_status=next_status,
        scopes=scopes,
        provisioning_revision=provisioning_revision,
        source_app_id=locked.app_id,
        entitlement_reference=entitlement_reference,
    ):
        if getattr(latest, "run_id", None) is None:
            return await _attach_run(
                db,
                latest,
                subscription_id=entitlement_reference,
                application_revision=profile,
                trigger=trigger,
                now=now_unix_seconds(),
            )
        return latest

    now = now_unix_seconds()
    lifecycle_version = latest.lifecycle_version + 1 if latest is not None else 1
    for candidate in subscriptions:
        candidate.finance_lifecycle_version = lifecycle_version
    event = FinanceProvisioningOutbox(
        id=generate_id("financeProvisioningEvent"),
        event_type=FINANCE_EVENT_TYPE,
        contract_version=FINANCE_EVENT_CONTRACT_VERSION,
        aggregate_id=connection_aggregate_id,
        organization_id=organization.id,
        organization_name=_finance_workspace_name(organization),
        organization_slug=_finance_workspace_slug(organization),
        organization_country_code=(organization.country_code or None),
        organization_currency_code=(organization.currency_code or "JMD").upper(),
        source_app_id=locked.app_id,
        entitlement_reference=entitlement_reference,
        provisioning_version=provisioning_revision,
        lifecycle_version=lifecycle_version,
        desired_status=next_status,
        scopes=scopes,
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
    db.add(event)
    await db.flush()
    await _attach_run(
        db,
        event,
        subscription_id=entitlement_reference,
        application_revision=profile,
        trigger=trigger,
        now=now,
    )
    return event


async def reconcile_finance_connections(
    db: AsyncSession,
    *,
    app_id: str | None = None,
    organization_id: str | None = None,
    limit: int | None = 1_000,
    starting_after: str | None = None,
    desired_status: FinanceConnectionStatus | None = None,
    trigger: ProvisioningRunTrigger = "app_activation",
) -> tuple[int, int, str | None]:
    """Ensure current subscriptions have an outbox event for their profile."""
    stmt = select(Subscription).order_by(Subscription.id)
    if app_id is not None:
        stmt = stmt.where(Subscription.app_id == app_id)
    if organization_id is not None:
        stmt = stmt.where(Subscription.organization_id == organization_id)
    if starting_after is not None:
        stmt = stmt.where(Subscription.id > starting_after)
    if limit is not None:
        stmt = stmt.limit(limit + 1)
    rows = list((await db.scalars(stmt)).all())
    has_more = limit is not None and len(rows) > limit
    subscriptions = rows[:limit] if limit is not None else rows

    changed = 0
    for subscription in subscriptions:
        before = subscription.finance_lifecycle_version
        result = await enqueue_finance_connection_event(
            db,
            subscription,
            desired_status=desired_status,
            trigger=trigger,
        )
        if subscription.finance_lifecycle_version != before or isinstance(result, ProvisioningRun):
            changed += 1
    next_cursor = subscriptions[-1].id if has_more and subscriptions else None
    return len(subscriptions), changed, next_cursor


async def _attach_run(
    db: AsyncSession,
    event: FinanceProvisioningOutbox,
    *,
    subscription_id: str | None,
    application_revision: ProvisioningManifestRevision | None,
    trigger: ProvisioningRunTrigger,
    now: int,
) -> ProvisioningRun:
    finance_revision = await ProvisioningRepository(db).retrieve_revision("finance", "shared", "published")
    run = await ProvisioningRunRepository(db).create_for_event(
        organization_id=event.organization_id,
        app_id=event.source_app_id,
        subscription_id=subscription_id,
        outbox_event_id=event.id,
        trigger=trigger,
        finance_revision=finance_revision,
        application_revision=application_revision,
        now=now,
    )
    event.run_id = run.id
    await db.flush()
    return run


def finance_event_payload(event: FinanceProvisioningOutbox) -> dict[str, object]:
    """Serialize the strict versioned contract accepted by 876 Billing."""
    return {
        "eventId": event.id,
        "eventType": event.event_type,
        "contractVersion": event.contract_version,
        "aggregateId": event.aggregate_id,
        "organization": {
            "id": event.organization_id,
            "name": event.organization_name,
            "slug": event.organization_slug,
            "countryCode": event.organization_country_code,
            "currencyCode": event.organization_currency_code,
        },
        "sourceAppId": event.source_app_id,
        "entitlementReference": event.entitlement_reference,
        "manifestVersion": 1,
        "provisioningRevision": event.provisioning_version,
        "lifecycleVersion": event.lifecycle_version,
        "desiredStatus": event.desired_status,
        "scopes": list(event.scopes),
        "occurredAt": event.occurred_at,
    }


def _event_matches(
    event: FinanceProvisioningOutbox,
    *,
    desired_status: str,
    scopes: list[str],
    provisioning_revision: int,
    source_app_id: str,
    entitlement_reference: str,
) -> bool:
    return (
        event.desired_status == desired_status
        and event.scopes == scopes
        and event.provisioning_version == provisioning_revision
        and event.source_app_id == source_app_id
        and event.entitlement_reference == entitlement_reference
    )


def _effective_subscription_state(
    subscriptions: list[Subscription],
) -> tuple[FinanceConnectionStatus, str]:
    """Collapse multiple commercial subscriptions into one app connection."""
    active = [row for row in subscriptions if row.status.strip().lower() in _ACTIVE_SUBSCRIPTION_STATES]
    if active:
        return "ACTIVE", active[0].id

    suspended = [row for row in subscriptions if row.status.strip().lower() not in _REVOKED_SUBSCRIPTION_STATES]
    if suspended:
        return "SUSPENDED", suspended[0].id

    if subscriptions:
        return "REVOKED", subscriptions[0].id
    raise RuntimeError("A finance connection cannot be derived without a subscription.")


def _finance_workspace_name(organization: Organization) -> str:
    for candidate in (organization.name, organization.short_name, organization.slug):
        value = candidate.strip() if candidate else ""
        if value:
            return value[:160]
    return organization.id[:160]


def _finance_workspace_slug(organization: Organization) -> str:
    value = normalize_slug(organization.slug)[:80].rstrip("-")
    if len(value) >= 2:
        return value
    suffix = normalize_slug(organization.id)[-8:]
    return f"{value or 'org'}-{suffix}"[:80]
