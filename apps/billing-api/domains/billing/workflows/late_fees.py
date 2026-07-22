from __future__ import annotations

import time
from typing import Any

from sqlalchemy import exists, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import (
    Customer,
    CustomerLedgerEntry,
    Invoice,
    InvoiceLine,
    InvoicePreference,
    LateFeeAssessment,
)
from db.models.generated.enums import (
    InvoiceBillingReason,
    InvoiceStatus,
    LateFeeCalculationType,
    LedgerDirection,
    LedgerEntryType,
    TaxBehavior,
)
from domains.billing.resources import generated_id
from domains.billing.workflows.calculations import calculate_late_fee
from domains.billing.workflows.engine import next_invoice_number

DAY_SECONDS = 86_400
MAX_ASSESSMENTS_PER_RUN = 500


async def assess_late_fees(
    session: AsyncSession,
    tenant_id: str,
    *,
    as_of: int | None = None,
) -> dict[str, Any]:
    effective_at = as_of or int(time.time())
    preference = await session.scalar(select(InvoicePreference).where(InvoicePreference.tenant_id == tenant_id))
    if preference is None:
        raise AppHTTPException(
            code="invoice-preference/not-found",
            message="Invoice preferences were not found.",
            http_status_code=404,
        )
    run_id = generated_id("lfrun")
    if not preference.late_fees_enabled:
        return {
            "object": "late_fee_run",
            "id": run_id,
            "created": 0,
            "skipped": 0,
            "hasMore": False,
        }

    await session.execute(
        update(Invoice)
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.due_at < effective_at,
            Invoice.amount_due > 0,
            Invoice.status.in_((InvoiceStatus.OPEN, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID)),
        )
        .values(status=InvoiceStatus.OVERDUE, updated_at=effective_at)
    )
    assessed = exists(
        select(LateFeeAssessment.id).where(
            LateFeeAssessment.tenant_id == tenant_id,
            LateFeeAssessment.source_invoice_id == Invoice.id,
        )
    )
    statement = (
        select(Invoice)
        .join(
            Customer,
            (Customer.id == Invoice.customer_id) & (Customer.tenant_id == Invoice.tenant_id),
        )
        .where(
            Invoice.tenant_id == tenant_id,
            Invoice.billing_reason != InvoiceBillingReason.LATE_FEE,
            Invoice.due_at.is_not(None),
            Invoice.due_at <= effective_at - preference.late_fee_grace_days * DAY_SECONDS,
            Invoice.amount_due > 0,
            Invoice.status == InvoiceStatus.OVERDUE,
            Customer.late_fee_exempt.is_(False),
            ~assessed,
        )
        .order_by(Invoice.due_at, Invoice.id)
        .limit(MAX_ASSESSMENTS_PER_RUN + 1)
        .with_for_update(skip_locked=True, of=Invoice)
    )
    candidates = list((await session.scalars(statement)).all())
    has_more = len(candidates) > MAX_ASSESSMENTS_PER_RUN
    created = 0
    skipped = 0
    for source in candidates[:MAX_ASSESSMENTS_PER_RUN]:
        amount = calculate_late_fee(
            source.amount_due,
            calculation_type=preference.late_fee_calculation_type.value,
            percent=preference.late_fee_percent,
            fixed_amount=preference.late_fee_amount,
        )
        if amount <= 0:
            skipped += 1
            continue
        customer = await session.scalar(
            select(Customer).where(Customer.id == source.customer_id, Customer.tenant_id == tenant_id).with_for_update()
        )
        if customer is None or customer.late_fee_exempt:
            skipped += 1
            continue
        invoice_id = generated_id("inv")
        number = await next_invoice_number(session, tenant_id, effective_at)
        is_draft = preference.late_fee_generate_as_draft
        late_fee_invoice = Invoice(
            id=invoice_id,
            tenant_id=tenant_id,
            customer_id=source.customer_id,
            number=number,
            status=InvoiceStatus.DRAFT if is_draft else InvoiceStatus.OPEN,
            billing_reason=InvoiceBillingReason.LATE_FEE,
            currency=source.currency,
            tax_behavior=TaxBehavior.EXCLUSIVE,
            customer_name=source.customer_name,
            customer_email=source.customer_email,
            billing_address_snapshot=source.billing_address_snapshot,
            shipping_address_snapshot=source.shipping_address_snapshot,
            issue_at=effective_at,
            due_at=effective_at,
            finalized_at=None if is_draft else effective_at,
            subtotal_amount=amount,
            total_amount=amount,
            amount_due=amount,
            notes=f"Late fee for invoice {source.number}",
            created_at=effective_at,
            updated_at=effective_at,
        )
        session.add(late_fee_invoice)
        await session.flush()
        session.add(
            InvoiceLine(
                id=generated_id("invline"),
                invoice_id=invoice_id,
                description=f"Late fee for invoice {source.number}",
                position=0,
                quantity=1,
                unit_amount=amount,
                total_amount=amount,
                created_at=effective_at,
                updated_at=effective_at,
            )
        )
        session.add(
            LateFeeAssessment(
                id=generated_id("lfassess"),
                tenant_id=tenant_id,
                source_invoice_id=source.id,
                late_fee_invoice_id=invoice_id,
                calculation_type=preference.late_fee_calculation_type,
                base_amount=source.amount_due,
                percent=(
                    preference.late_fee_percent
                    if preference.late_fee_calculation_type == LateFeeCalculationType.PERCENTAGE
                    else None
                ),
                fixed_amount=(
                    preference.late_fee_amount
                    if preference.late_fee_calculation_type == LateFeeCalculationType.FIXED
                    else None
                ),
                assessed_amount=amount,
                grace_days=preference.late_fee_grace_days,
                assessed_at=effective_at,
                created_at=effective_at,
            )
        )
        if not is_draft:
            session.add(
                CustomerLedgerEntry(
                    id=generated_id("ledger"),
                    tenant_id=tenant_id,
                    customer_id=source.customer_id,
                    invoice_id=invoice_id,
                    type=LedgerEntryType.INVOICE_FINALIZED,
                    direction=LedgerDirection.DEBIT,
                    amount=amount,
                    currency=source.currency,
                    description=f"Late fee for invoice {source.number}",
                    idempotency_key=f"invoice:{source.id}:late-fee",
                    effective_at=effective_at,
                    created_at=effective_at,
                )
            )
            customer.outstanding_receivable += amount
            customer.updated_at = effective_at
        created += 1
    await session.flush()
    return {
        "object": "late_fee_run",
        "id": run_id,
        "created": created,
        "skipped": skipped,
        "hasMore": has_more,
    }
