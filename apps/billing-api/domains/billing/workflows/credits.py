from __future__ import annotations

import time
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import CreditNote, CreditNoteAllocation, Customer, Invoice, Refund
from db.models.generated.enums import CreditNoteStatus, InvoiceStatus
from domains.billing.resources import generated_id


async def apply_credit_note(
    session: AsyncSession,
    tenant_id: str,
    credit_note_id: str,
    body: dict[str, Any],
) -> CreditNote:
    allocations = body.get("allocations")
    if not isinstance(allocations, list) or not allocations:
        raise _invalid("Enter at least one credit note allocation.")
    credit = await session.scalar(
        select(CreditNote).where(CreditNote.id == credit_note_id, CreditNote.tenant_id == tenant_id).with_for_update()
    )
    if credit is None:
        raise AppHTTPException(code="credit-note/not-found", message="Credit note not found.", http_status_code=404)
    if credit.status != CreditNoteStatus.OPEN:
        raise AppHTTPException(
            code="credit-note/invalid-state",
            message="Only an open credit note can be applied.",
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
        if not isinstance(invoice_id, str) or not invoice_id or amount <= 0 or invoice_id in seen:
            raise _invalid("Each invoice needs one positive allocation.")
        seen.add(invoice_id)
        invoice = await session.scalar(
            select(Invoice).where(Invoice.id == invoice_id, Invoice.tenant_id == tenant_id).with_for_update()
        )
        if invoice is None:
            raise AppHTTPException(code="invoice/not-found", message="An invoice was not found.", http_status_code=404)
        if invoice.customer_id != credit.customer_id or invoice.currency != credit.currency:
            raise _invalid("Credits can only settle invoices for the same customer and currency.")
        if (
            invoice.status in {InvoiceStatus.DRAFT, InvoiceStatus.VOID, InvoiceStatus.PAID}
            or amount > invoice.amount_due
        ):
            raise AppHTTPException(
                code="credit-note/invalid-allocation",
                message="A credit allocation exceeds the invoice balance or targets an ineligible invoice.",
                http_status_code=409,
            )
        total += amount
        prepared.append((invoice, amount))
    if total > credit.balance_amount:
        raise AppHTTPException(
            code="credit-note/insufficient-balance",
            message="Invoice allocations exceed the credit note balance.",
            http_status_code=409,
        )

    now = int(time.time())
    for invoice, amount in prepared:
        before = invoice.status
        before_paid_at = invoice.paid_at
        invoice.amount_credited += amount
        invoice.amount_due -= amount
        invoice.status = InvoiceStatus.PAID if invoice.amount_due == 0 else InvoiceStatus.PARTIALLY_PAID
        invoice.paid_at = now if invoice.amount_due == 0 else invoice.paid_at
        invoice.updated_at = now
        session.add(
            CreditNoteAllocation(
                id=generated_id("cnalloc"),
                tenant_id=tenant_id,
                credit_note_id=credit.id,
                invoice_id=invoice.id,
                amount=amount,
                invoice_status_before=before,
                invoice_paid_at_before=before_paid_at,
                reversed_at=None,
                created_at=now,
                updated_at=now,
            )
        )
    credit.balance_amount -= total
    credit.status = CreditNoteStatus.CLOSED if credit.balance_amount == 0 else CreditNoteStatus.OPEN
    credit.updated_at = now
    await _recompute_customer(session, tenant_id, credit.customer_id, now)
    await session.flush()
    return credit


async def void_credit_note(session: AsyncSession, tenant_id: str, credit_note_id: str) -> CreditNote:
    credit = await session.scalar(
        select(CreditNote).where(CreditNote.id == credit_note_id, CreditNote.tenant_id == tenant_id).with_for_update()
    )
    if credit is None:
        raise AppHTTPException(code="credit-note/not-found", message="Credit note not found.", http_status_code=404)
    if credit.status == CreditNoteStatus.VOID:
        raise AppHTTPException(
            code="credit-note/invalid-state", message="This credit note is already void.", http_status_code=409
        )
    refund = await session.scalar(select(Refund.id).where(Refund.credit_note_id == credit.id).limit(1))
    if refund is not None:
        raise AppHTTPException(
            code="credit-note/refunded",
            message="A refunded credit note cannot be voided.",
            http_status_code=409,
        )
    allocations = list(
        (
            await session.scalars(
                select(CreditNoteAllocation)
                .where(
                    CreditNoteAllocation.tenant_id == tenant_id,
                    CreditNoteAllocation.credit_note_id == credit.id,
                    CreditNoteAllocation.reversed_at.is_(None),
                )
                .with_for_update()
            )
        ).all()
    )
    now = int(time.time())
    for allocation in allocations:
        invoice = await session.scalar(
            select(Invoice).where(Invoice.id == allocation.invoice_id, Invoice.tenant_id == tenant_id).with_for_update()
        )
        if invoice is not None:
            invoice.amount_credited = max(invoice.amount_credited - allocation.amount, 0)
            invoice.amount_due += allocation.amount
            invoice.status = allocation.invoice_status_before
            invoice.paid_at = allocation.invoice_paid_at_before
            invoice.updated_at = now
        allocation.reversed_at = now
        allocation.updated_at = now
    credit.status = CreditNoteStatus.VOID
    credit.balance_amount = 0
    credit.voided_at = now
    credit.updated_at = now
    await _recompute_customer(session, tenant_id, credit.customer_id, now)
    await session.flush()
    return credit


async def _recompute_customer(session: AsyncSession, tenant_id: str, customer_id: str, now: int) -> None:
    customer = await session.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id).with_for_update()
    )
    if customer is None:
        return
    open_invoices = list(
        (
            await session.scalars(
                select(Invoice).where(
                    Invoice.tenant_id == tenant_id,
                    Invoice.customer_id == customer_id,
                    Invoice.status.not_in([InvoiceStatus.DRAFT, InvoiceStatus.VOID]),
                )
            )
        ).all()
    )
    customer.outstanding_receivable = sum(invoice.amount_due for invoice in open_invoices)
    customer.updated_at = now


def _invalid(message: str) -> AppHTTPException:
    return AppHTTPException(code="validation/invalid-request", message=message, http_status_code=422)
