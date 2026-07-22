from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import PaymentAttempt, PaymentProviderConnection, PaymentProviderEvent
from db.models.generated.enums import (
    PaymentAttemptStatus,
    PaymentProviderConnectionStatus,
    ProviderEventStatus,
)
from domains.billing.resources import generated_id


@dataclass(frozen=True)
class ProviderEventReceipt:
    id: str
    duplicate: bool


async def record_provider_event(
    session: AsyncSession,
    tenant_id: str,
    connection_id: str,
    *,
    external_event_id: str,
    event_type: str,
    payload: dict[str, Any] | list[Any] | None,
    occurred_at: int | None = None,
    received_at: int | None = None,
) -> ProviderEventReceipt:
    if not external_event_id or not event_type:
        raise _invalid("Provider event ID and type are required.")
    connection = await _active_connection(session, tenant_id, connection_id)
    now = received_at or int(time.time())
    event_id = generated_id("ppevt")
    statement = (
        insert(PaymentProviderEvent)
        .values(
            id=event_id,
            tenant_id=tenant_id,
            connection_id=connection.id,
            external_event_id=external_event_id,
            event_type=event_type,
            status=ProviderEventStatus.RECEIVED,
            payload=payload,
            occurred_at=occurred_at,
            received_at=now,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(
            index_elements=[
                PaymentProviderEvent.connection_id,
                PaymentProviderEvent.external_event_id,
            ]
        )
        .returning(PaymentProviderEvent.id)
    )
    inserted_id = await session.scalar(statement)
    if inserted_id is not None:
        return ProviderEventReceipt(id=inserted_id, duplicate=False)
    existing = await session.scalar(
        select(PaymentProviderEvent).where(
            PaymentProviderEvent.connection_id == connection.id,
            PaymentProviderEvent.external_event_id == external_event_id,
        )
    )
    if existing is None:
        raise RuntimeError("Provider event deduplication did not return the stored event.")
    return ProviderEventReceipt(id=existing.id, duplicate=True)


async def claim_provider_events(
    session: AsyncSession,
    *,
    limit: int = 100,
    claimed_at: int | None = None,
) -> list[PaymentProviderEvent]:
    if limit < 1 or limit > 500:
        raise _invalid("Provider event limit must be between 1 and 500.")
    events = list(
        (
            await session.scalars(
                select(PaymentProviderEvent)
                .where(PaymentProviderEvent.status == ProviderEventStatus.RECEIVED)
                .order_by(PaymentProviderEvent.received_at, PaymentProviderEvent.id)
                .limit(limit)
                .with_for_update(skip_locked=True)
            )
        ).all()
    )
    now = claimed_at or int(time.time())
    for event in events:
        event.status = ProviderEventStatus.PROCESSING
        event.updated_at = now
    await session.flush()
    return events


async def complete_provider_event(
    session: AsyncSession,
    tenant_id: str,
    event_id: str,
    *,
    outcome: Literal["processed", "ignored", "failed"],
    error_message: str | None = None,
    completed_at: int | None = None,
) -> PaymentProviderEvent:
    event = await session.scalar(
        select(PaymentProviderEvent)
        .where(PaymentProviderEvent.id == event_id, PaymentProviderEvent.tenant_id == tenant_id)
        .with_for_update()
    )
    if event is None:
        raise AppHTTPException(
            code="payment-provider-event/not-found",
            message="Payment provider event not found.",
            http_status_code=404,
        )
    if event.status != ProviderEventStatus.PROCESSING:
        raise AppHTTPException(
            code="payment-provider-event/invalid-state",
            message="Only a claimed provider event can be completed.",
            http_status_code=409,
        )
    now = completed_at or int(time.time())
    event.status = {
        "processed": ProviderEventStatus.PROCESSED,
        "ignored": ProviderEventStatus.IGNORED,
        "failed": ProviderEventStatus.FAILED,
    }[outcome]
    event.error_message = error_message[:1_000] if error_message else None
    event.processed_at = now
    event.updated_at = now
    await session.flush()
    return event


async def start_payment_attempt(
    session: AsyncSession,
    tenant_id: str,
    *,
    customer_id: str,
    amount: int,
    currency: str,
    idempotency_key: str,
    connection_id: str | None = None,
    invoice_id: str | None = None,
    subscription_id: str | None = None,
    attempted_at: int | None = None,
) -> tuple[PaymentAttempt, bool]:
    if amount <= 0 or len(currency) != 3 or not idempotency_key:
        raise _invalid("A positive amount, three-letter currency, and idempotency key are required.")
    existing = await session.scalar(
        select(PaymentAttempt).where(
            PaymentAttempt.tenant_id == tenant_id,
            PaymentAttempt.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        _validate_attempt_replay(existing, customer_id, amount, currency, invoice_id)
        return existing, True
    if connection_id:
        await _active_connection(session, tenant_id, connection_id)
    now = attempted_at or int(time.time())
    statement = (
        insert(PaymentAttempt)
        .values(
            id=generated_id("patm"),
            tenant_id=tenant_id,
            connection_id=connection_id,
            customer_id=customer_id,
            invoice_id=invoice_id,
            subscription_id=subscription_id,
            idempotency_key=idempotency_key,
            status=PaymentAttemptStatus.PROCESSING,
            amount=amount,
            currency=currency.upper(),
            attempted_at=now,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=[PaymentAttempt.tenant_id, PaymentAttempt.idempotency_key])
        .returning(PaymentAttempt)
    )
    inserted = await session.scalar(statement)
    if inserted is not None:
        return inserted, False
    replay = await session.scalar(
        select(PaymentAttempt).where(
            PaymentAttempt.tenant_id == tenant_id,
            PaymentAttempt.idempotency_key == idempotency_key,
        )
    )
    if replay is None:
        raise RuntimeError("Payment-attempt deduplication did not return the stored attempt.")
    _validate_attempt_replay(replay, customer_id, amount, currency, invoice_id)
    return replay, True


async def complete_payment_attempt(
    session: AsyncSession,
    tenant_id: str,
    attempt_id: str,
    *,
    outcome: Literal["requires_action", "succeeded", "failed", "canceled"],
    external_reference: str | None = None,
    failure_code: str | None = None,
    failure_message: str | None = None,
    provider_response_code: str | None = None,
    completed_at: int | None = None,
) -> PaymentAttempt:
    attempt = await session.scalar(
        select(PaymentAttempt)
        .where(PaymentAttempt.id == attempt_id, PaymentAttempt.tenant_id == tenant_id)
        .with_for_update()
    )
    if attempt is None:
        raise AppHTTPException(
            code="payment-attempt/not-found",
            message="Payment attempt not found.",
            http_status_code=404,
        )
    target = {
        "requires_action": PaymentAttemptStatus.REQUIRES_ACTION,
        "succeeded": PaymentAttemptStatus.SUCCEEDED,
        "failed": PaymentAttemptStatus.FAILED,
        "canceled": PaymentAttemptStatus.CANCELED,
    }[outcome]
    if attempt.status == target:
        return attempt
    if attempt.status not in (PaymentAttemptStatus.PROCESSING, PaymentAttemptStatus.REQUIRES_ACTION):
        raise AppHTTPException(
            code="payment-attempt/invalid-state",
            message="A terminal payment attempt cannot change outcome.",
            http_status_code=409,
        )
    now = completed_at or int(time.time())
    attempt.status = target
    attempt.external_reference = external_reference
    attempt.failure_code = failure_code
    attempt.failure_message = failure_message[:1_000] if failure_message else None
    attempt.provider_response_code = provider_response_code
    attempt.completed_at = None if target == PaymentAttemptStatus.REQUIRES_ACTION else now
    attempt.updated_at = now
    await session.flush()
    return attempt


async def _active_connection(
    session: AsyncSession,
    tenant_id: str,
    connection_id: str,
) -> PaymentProviderConnection:
    connection = await session.scalar(
        select(PaymentProviderConnection).where(
            PaymentProviderConnection.id == connection_id,
            PaymentProviderConnection.tenant_id == tenant_id,
            PaymentProviderConnection.status == PaymentProviderConnectionStatus.ACTIVE,
        )
    )
    if connection is None:
        raise AppHTTPException(
            code="payment-provider-connection/not-found",
            message="An active payment provider connection was not found.",
            http_status_code=404,
        )
    return connection


def _invalid(message: str) -> AppHTTPException:
    return AppHTTPException(
        code="validation/invalid-request",
        message=message,
        http_status_code=422,
    )


def _validate_attempt_replay(
    attempt: PaymentAttempt,
    customer_id: str,
    amount: int,
    currency: str,
    invoice_id: str | None,
) -> None:
    if (
        attempt.customer_id != customer_id
        or attempt.amount != amount
        or attempt.currency != currency.upper()
        or attempt.invoice_id != invoice_id
    ):
        raise AppHTTPException(
            code="payment-attempt/idempotency-conflict",
            message="The payment-attempt idempotency key was reused with different terms.",
            http_status_code=409,
        )
