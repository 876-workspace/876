from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from core.errors import AppHTTPException
from db.models import Customer, Invoice, Payment, PaymentAllocation
from db.models.generated.enums import InvoiceStatus, PaymentStatus
from domains.billing.workflows.payments import apply_payment, cancel_payment


def payment_row(*, unapplied_amount: int = 1_000) -> Payment:
    return Payment(
        id="pay_123",
        tenant_id="btenant_123",
        customer_id="cust_123",
        currency="JMD",
        status=PaymentStatus.SUCCEEDED,
        unapplied_amount=unapplied_amount,
        revision=0,
        updated_at=1,
    )


def invoice_row(*, amount_due: int = 600) -> Invoice:
    return Invoice(
        id="inv_123",
        tenant_id="btenant_123",
        customer_id="cust_123",
        currency="JMD",
        status=InvoiceStatus.OPEN,
        amount_due=amount_due,
        amount_paid=0,
        paid_at=None,
        updated_at=1,
    )


async def test_apply_payment_updates_invoice_payment_and_customer_atomically() -> None:
    payment = payment_row()
    invoice = invoice_row()
    customer = Customer(
        id="cust_123",
        tenant_id="btenant_123",
        outstanding_receivable=600,
        unused_credits=0,
        updated_at=1,
    )
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[payment, invoice, customer])
    session.flush = AsyncMock()

    result = await apply_payment(
        session,
        "btenant_123",
        "pay_123",
        {"allocations": [{"invoiceId": "inv_123", "amount": "600"}]},
    )

    assert result is payment
    assert payment.unapplied_amount == 400
    assert payment.revision == 1
    assert invoice.amount_due == 0
    assert invoice.amount_paid == 600
    assert invoice.status == InvoiceStatus.PAID
    assert invoice.paid_at is not None
    assert customer.outstanding_receivable == 0
    assert customer.unused_credits == 400
    allocation = session.add.call_args.args[0]
    assert isinstance(allocation, PaymentAllocation)
    assert allocation.amount == 600
    session.flush.assert_awaited_once()


async def test_apply_payment_rejects_allocations_above_unapplied_amount() -> None:
    payment = payment_row(unapplied_amount=100)
    invoice = invoice_row(amount_due=600)
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[payment, invoice])
    session.flush = AsyncMock()

    with pytest.raises(AppHTTPException) as invalid:
        await apply_payment(
            session,
            "btenant_123",
            "pay_123",
            {"allocations": [{"invoiceId": "inv_123", "amount": 200}]},
        )

    assert invalid.value.status_code == 409
    assert invalid.value.app_code == "payment/insufficient-unapplied-amount"
    session.add.assert_not_called()
    session.flush.assert_not_awaited()


async def test_cancel_payment_restores_allocated_invoice() -> None:
    payment = payment_row(unapplied_amount=400)
    payment.revision = 2
    invoice = invoice_row(amount_due=0)
    invoice.amount_paid = 600
    invoice.status = InvoiceStatus.PAID
    allocation = PaymentAllocation(
        id="palloc_123",
        tenant_id="btenant_123",
        payment_id=payment.id,
        invoice_id=invoice.id,
        amount=600,
        invoice_status_before=InvoiceStatus.OPEN,
        invoice_paid_at_before=None,
        reversed_at=None,
        updated_at=1,
    )
    customer = Customer(
        id="cust_123",
        tenant_id="btenant_123",
        outstanding_receivable=0,
        unused_credits=400,
        updated_at=1,
    )
    scalars = MagicMock()
    scalars.all.return_value = [allocation]
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[payment, None, invoice, customer])
    session.scalars = AsyncMock(return_value=scalars)
    session.flush = AsyncMock()

    result = await cancel_payment(session, "btenant_123", "pay_123")

    assert result.status == PaymentStatus.CANCELED
    assert result.unapplied_amount == 0
    assert result.revision == 3
    assert invoice.amount_paid == 0
    assert invoice.amount_due == 600
    assert invoice.status == InvoiceStatus.OPEN
    assert allocation.reversed_at is not None
    assert customer.outstanding_receivable == 600
    assert customer.unused_credits == 0
    session.flush.assert_awaited_once()
