from __future__ import annotations

import time
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import Customer, Invoice, Payment, PaymentAllocation, Refund
from db.models.generated.enums import InvoiceStatus, PaymentStatus
from domains.billing.resources import ResourceDefinition, ResourceService, generated_id


async def create_payment(
    service: ResourceService,
    definition: ResourceDefinition,
    tenant_id: str,
    body: dict[str, Any],
) -> Payment:
    allocations = body.get("allocations", [])
    if not isinstance(allocations, list):
        raise _invalid("allocations must be a list.")
    try:
        amount = int(body["amount"])
    except (KeyError, TypeError, ValueError) as exc:
        raise _invalid("Enter a payment amount greater than zero.") from exc
    if amount <= 0:
        raise _invalid("Enter a payment amount greater than zero.")
    bank_charges = int(body.get("bankCharges", 0))
    if bank_charges < 0 or bank_charges >= amount:
        raise _invalid("Bank charges must be less than the payment amount.")

    values = dict(body)
    values.pop("allocations", None)
    values.setdefault("number", f"PAY-{int(time.time())}-{generated_id('n').removeprefix('n_')[:6]}")
    values["unappliedAmount"] = amount
    payment = cast(Payment, await service.create(definition, tenant_id, values, {}))
    if allocations:
        await apply_payment(service.session, tenant_id, payment.id, {"allocations": allocations})
        await service.session.refresh(payment)
    return payment


async def apply_payment(
    session: AsyncSession,
    tenant_id: str,
    payment_id: str,
    body: dict[str, Any],
) -> Payment:
    allocations = body.get("allocations")
    if not isinstance(allocations, list) or not allocations:
        raise _invalid("Enter at least one payment allocation.")
    payment = await session.scalar(
        select(Payment).where(Payment.id == payment_id, Payment.tenant_id == tenant_id).with_for_update()
    )
    if payment is None:
        raise AppHTTPException(code="payment/not-found", message="The payment was not found.", http_status_code=404)
    if payment.status != PaymentStatus.SUCCEEDED:
        raise AppHTTPException(
            code="payment/invalid-state",
            message="Only successful payments can be allocated.",
            http_status_code=409,
        )

    seen: set[str] = set()
    prepared: list[tuple[Invoice, int]] = []
    total = 0
    for allocation in allocations:
        if not isinstance(allocation, dict):
            raise _invalid("Each allocation must be an object.")
        invoice_id = allocation.get("invoiceId")
        try:
            amount = int(cast(str | int, allocation.get("amount")))
        except (TypeError, ValueError) as exc:
            raise _invalid("Allocation amounts must be positive integers.") from exc
        if not isinstance(invoice_id, str) or not invoice_id or amount <= 0:
            raise _invalid("Each allocation needs an invoice and positive amount.")
        if invoice_id in seen:
            raise _invalid("Each invoice can be allocated only once.")
        seen.add(invoice_id)
        invoice = await session.scalar(
            select(Invoice).where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id).with_for_update()
        )
        if invoice is None:
            raise AppHTTPException(code="invoice/not-found", message="An invoice was not found.", http_status_code=404)
        if invoice.customer_id != payment.customer_id or invoice.currency != payment.currency:
            raise _invalid("Payments can only settle invoices for the same customer and currency.")
        if (
            invoice.status in {InvoiceStatus.DRAFT, InvoiceStatus.VOID, InvoiceStatus.PAID}
            or amount > invoice.amount_due
        ):
            raise AppHTTPException(
                code="payment/invalid-allocation",
                message="An allocation exceeds the invoice balance or targets an ineligible invoice.",
                http_status_code=409,
            )
        total += amount
        prepared.append((invoice, amount))

    if total > payment.unapplied_amount:
        raise AppHTTPException(
            code="payment/insufficient-unapplied-amount",
            message="Invoice allocations exceed the unapplied payment amount.",
            http_status_code=409,
        )

    now = int(time.time())
    for invoice, amount in prepared:
        before = invoice.status
        before_paid_at = invoice.paid_at
        invoice.amount_paid += amount
        invoice.amount_due -= amount
        invoice.status = InvoiceStatus.PAID if invoice.amount_due == 0 else InvoiceStatus.PARTIALLY_PAID
        invoice.paid_at = now if invoice.amount_due == 0 else None
        invoice.updated_at = now
        session.add(
            PaymentAllocation(
                id=generated_id("palloc"),
                tenant_id=tenant_id,
                payment_id=payment.id,
                invoice_id=invoice.id,
                amount=amount,
                invoice_status_before=before,
                invoice_paid_at_before=before_paid_at,
                reversed_at=None,
                created_at=now,
                updated_at=now,
            )
        )
    payment.unapplied_amount -= total
    payment.revision += 1
    payment.updated_at = now
    customer = await session.scalar(
        select(Customer).where(Customer.id == payment.customer_id, Customer.tenant_id == tenant_id).with_for_update()
    )
    if customer is not None:
        customer.outstanding_receivable = max(customer.outstanding_receivable - total, 0)
        customer.unused_credits = payment.unapplied_amount
        customer.updated_at = now
    await session.flush()
    return payment


async def cancel_payment(session: AsyncSession, tenant_id: str, payment_id: str) -> Payment:
    payment = await session.scalar(
        select(Payment).where(Payment.id == payment_id, Payment.tenant_id == tenant_id).with_for_update()
    )
    if payment is None:
        raise AppHTTPException(code="payment/not-found", message="The payment was not found.", http_status_code=404)
    if payment.status != PaymentStatus.SUCCEEDED:
        raise AppHTTPException(
            code="payment/invalid-state",
            message="Only a successful payment can be canceled.",
            http_status_code=409,
        )
    refund_id = await session.scalar(
        select(Refund.id).where(Refund.tenant_id == tenant_id, Refund.payment_id == payment_id).limit(1)
    )
    if refund_id is not None:
        raise AppHTTPException(
            code="payment/refunded",
            message="A refunded payment cannot be canceled.",
            http_status_code=409,
        )
    allocations = list(
        (
            await session.scalars(
                select(PaymentAllocation)
                .where(
                    PaymentAllocation.tenant_id == tenant_id,
                    PaymentAllocation.payment_id == payment_id,
                    PaymentAllocation.reversed_at.is_(None),
                )
                .with_for_update()
            )
        ).all()
    )
    now = int(time.time())
    restored = 0
    for allocation in allocations:
        invoice = await session.scalar(
            select(Invoice).where(Invoice.id == allocation.invoice_id, Invoice.tenant_id == tenant_id).with_for_update()
        )
        if invoice is None:
            raise AppHTTPException(
                code="invoice/not-found",
                message="An allocated invoice was not found.",
                http_status_code=409,
            )
        invoice.amount_paid = max(invoice.amount_paid - allocation.amount, 0)
        invoice.amount_due += allocation.amount
        invoice.status = allocation.invoice_status_before
        invoice.paid_at = allocation.invoice_paid_at_before
        invoice.updated_at = now
        allocation.reversed_at = now
        allocation.updated_at = now
        restored += allocation.amount
    payment.status = PaymentStatus.CANCELED
    payment.unapplied_amount = 0
    payment.revision += 1
    payment.updated_at = now
    customer = await session.scalar(
        select(Customer).where(Customer.id == payment.customer_id, Customer.tenant_id == tenant_id).with_for_update()
    )
    if customer is not None:
        customer.outstanding_receivable += restored
        customer.unused_credits = 0
        customer.updated_at = now
    await session.flush()
    return payment


def _invalid(message: str) -> AppHTTPException:
    return AppHTTPException(code="validation/invalid-request", message=message, http_status_code=422)
