from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from core.errors import AppHTTPException
from db.models import PaymentAttempt, PaymentProviderConnection, PaymentProviderEvent
from db.models.generated.enums import (
    PaymentAttemptStatus,
    PaymentProviderConnectionStatus,
    ProviderEventStatus,
)
from domains.billing.resources import serialize_resource
from domains.billing.workflows.providers import (
    complete_payment_attempt,
    complete_provider_event,
    record_provider_event,
    start_payment_attempt,
)


def active_connection() -> PaymentProviderConnection:
    return PaymentProviderConnection(
        id="ppconn_123",
        tenant_id="btenant_123",
        status=PaymentProviderConnectionStatus.ACTIVE,
    )


async def test_provider_event_inbox_inserts_through_a_unique_upsert() -> None:
    connection = active_connection()
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[connection, "ppevt_new"])

    receipt = await record_provider_event(
        session,
        connection.tenant_id,
        connection.id,
        external_event_id="evt_new",
        event_type="payment.succeeded",
        payload={"id": "evt_new"},
    )

    assert receipt == type(receipt)(id="ppevt_new", duplicate=False)
    session.add.assert_not_called()


async def test_provider_event_inbox_deduplicates_external_event_ids() -> None:
    connection = active_connection()
    existing = PaymentProviderEvent(
        id="ppevt_existing",
        tenant_id=connection.tenant_id,
        connection_id=connection.id,
        external_event_id="evt_123",
    )
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[connection, None, existing])

    receipt = await record_provider_event(
        session,
        connection.tenant_id,
        connection.id,
        external_event_id="evt_123",
        event_type="payment.succeeded",
        payload={"id": "evt_123"},
    )

    assert receipt.id == existing.id
    assert receipt.duplicate is True
    session.add.assert_not_called()


async def test_provider_event_completion_requires_a_claimed_event() -> None:
    event = PaymentProviderEvent(
        id="ppevt_123",
        tenant_id="btenant_123",
        status=ProviderEventStatus.RECEIVED,
    )
    session = MagicMock()
    session.scalar = AsyncMock(return_value=event)

    with pytest.raises(AppHTTPException) as invalid:
        await complete_provider_event(
            session,
            event.tenant_id,
            event.id,
            outcome="processed",
        )

    assert invalid.value.app_code == "payment-provider-event/invalid-state"


async def test_payment_attempt_idempotency_rejects_changed_financial_terms() -> None:
    existing = PaymentAttempt(
        id="patm_123",
        tenant_id="btenant_123",
        customer_id="cust_123",
        invoice_id="inv_123",
        idempotency_key="collect:inv_123",
        status=PaymentAttemptStatus.PROCESSING,
        amount=1_000,
        currency="JMD",
    )
    session = MagicMock()
    session.scalar = AsyncMock(return_value=existing)

    with pytest.raises(AppHTTPException) as conflict:
        await start_payment_attempt(
            session,
            existing.tenant_id,
            customer_id=existing.customer_id,
            invoice_id=existing.invoice_id,
            amount=2_000,
            currency=existing.currency,
            idempotency_key=existing.idempotency_key,
        )

    assert conflict.value.app_code == "payment-attempt/idempotency-conflict"


async def test_terminal_payment_attempt_cannot_change_outcome() -> None:
    attempt = PaymentAttempt(
        id="patm_123",
        tenant_id="btenant_123",
        status=PaymentAttemptStatus.SUCCEEDED,
    )
    session = MagicMock()
    session.scalar = AsyncMock(return_value=attempt)

    with pytest.raises(AppHTTPException) as conflict:
        await complete_payment_attempt(
            session,
            attempt.tenant_id,
            attempt.id,
            outcome="failed",
        )

    assert conflict.value.app_code == "payment-attempt/invalid-state"


def test_provider_connection_serialization_never_exposes_secret_references() -> None:
    connection = active_connection()
    connection.credentials_reference = "secret://billing/provider/key"
    connection.webhook_secret_reference = "secret://billing/provider/webhook"

    serialized = serialize_resource(connection, "payment_provider_connection")

    assert "credentialsReference" not in serialized
    assert "webhookSecretReference" not in serialized
