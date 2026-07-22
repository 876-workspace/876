from __future__ import annotations

import calendar
import time
from collections.abc import Iterable
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import (
    Addon,
    Customer,
    CustomerLedgerEntry,
    DocumentSequence,
    Invoice,
    InvoiceLine,
    InvoiceSubscription,
    Item,
    PaymentTerm,
    Plan,
    Price,
    PriceTier,
    Subscription,
    SubscriptionBillingRun,
    SubscriptionCharge,
    SubscriptionDiscount,
    SubscriptionEvent,
    SubscriptionItem,
    SubscriptionPreference,
    TaxRate,
    Tenant,
)
from db.models.generated.enums import (
    AdvanceBillingMethod,
    BillingRunStatus,
    BillingTiming,
    DiscountDuration,
    DiscountStatus,
    DocumentType,
    InvoiceBillingReason,
    InvoiceStatus,
    LedgerDirection,
    LedgerEntryType,
    SubscriptionChargeStatus,
    SubscriptionEventType,
    SubscriptionInvoiceMode,
    SubscriptionStatus,
    TaxBehavior,
    TenantStatus,
)
from domains.billing.resources import generated_id
from domains.billing.workflows.calculations import (
    add_interval,
    adjust_renewal_amount,
    allocate_discount,
    calculate_catalog_amount,
    calculate_discount,
    calculate_tax,
    prorate_initial_stub,
)

MAX_SWEEP_LIMIT = 500


@dataclass(frozen=True)
class BillingResult:
    status: str
    invoice_id: str | None


@dataclass
class BillingSweepSummary:
    object: str
    id: str
    as_of: int
    processed: int = 0
    succeeded: int = 0
    failed: int = 0
    skipped: int = 0
    invoice_ids: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["asOf"] = value.pop("as_of")
        value["invoiceIds"] = value.pop("invoice_ids")
        return value


async def run_billing_sweep(
    session: AsyncSession,
    *,
    as_of: int | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    effective_at = as_of or int(time.time())
    if limit < 1 or limit > MAX_SWEEP_LIMIT:
        raise AppHTTPException(
            code="validation/invalid-request",
            message=f"limit must be between 1 and {MAX_SWEEP_LIMIT}.",
            http_status_code=422,
        )
    regular_due = Subscription.next_billing_at <= effective_at
    advance_due = and_(
        SubscriptionPreference.automate_advance_billing.is_(True),
        SubscriptionPreference.advance_billing_method == AdvanceBillingMethod.INVOICE,
        func.coalesce(
            Subscription.advance_billing_enabled,
            SubscriptionPreference.advance_billing_enabled,
        ).is_(True),
        Subscription.next_advance_invoice_at.is_not(None),
        Subscription.next_advance_invoice_at <= effective_at,
        Subscription.next_billing_at > effective_at,
        Subscription.cancel_at_period_end.is_(False),
    )
    statement = (
        select(Subscription.tenant_id, Subscription.id, advance_due.label("is_advance"))
        .join(Tenant, Tenant.id == Subscription.tenant_id)
        .outerjoin(SubscriptionPreference, SubscriptionPreference.tenant_id == Subscription.tenant_id)
        .where(
            Tenant.status == TenantStatus.ACTIVE,
            Subscription.status.in_((SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE)),
            Subscription.next_billing_at.is_not(None),
            or_(regular_due, advance_due),
        )
        .order_by(Subscription.next_billing_at, Subscription.id)
        .limit(limit)
        .with_for_update(skip_locked=True, of=Subscription)
    )
    due = list((await session.execute(statement)).tuples())
    summary = BillingSweepSummary(
        object="billing_engine_run",
        id=generated_id("brun"),
        as_of=effective_at,
    )
    for tenant_id, subscription_id, is_advance in due:
        summary.processed += 1
        try:
            async with session.begin_nested():
                result = await bill_subscription(
                    session,
                    str(tenant_id),
                    str(subscription_id),
                    as_of=effective_at,
                    advance=bool(is_advance),
                )
        except Exception as exc:
            summary.failed += 1
            await record_billing_failure(
                session,
                str(tenant_id),
                str(subscription_id),
                effective_at,
                exc,
            )
            continue
        if result.status == "skipped":
            summary.skipped += 1
        else:
            summary.succeeded += 1
        if result.invoice_id and result.invoice_id not in summary.invoice_ids:
            summary.invoice_ids.append(result.invoice_id)

    await session.execute(
        update(Invoice)
        .where(
            Invoice.due_at < effective_at,
            Invoice.amount_due > 0,
            Invoice.status.in_((InvoiceStatus.OPEN, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID)),
        )
        .values(status=InvoiceStatus.OVERDUE, updated_at=effective_at)
    )
    return summary.as_dict()


async def bill_subscription(
    session: AsyncSession,
    tenant_id: str,
    subscription_id: str,
    *,
    as_of: int | None = None,
    advance: bool = False,
) -> BillingResult:
    effective_at = as_of or int(time.time())
    subscription = await session.scalar(
        select(Subscription)
        .where(Subscription.id == subscription_id, Subscription.tenant_id == tenant_id)
        .with_for_update()
    )
    if subscription is None:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=404,
        )
    if (
        subscription.status not in (SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE)
        or subscription.next_billing_at is None
        or (advance and subscription.next_billing_at <= effective_at)
        or (
            advance
            and (subscription.next_advance_invoice_at is None or subscription.next_advance_invoice_at > effective_at)
        )
        or (not advance and subscription.next_billing_at > effective_at)
    ):
        return BillingResult(status="skipped", invoice_id=None)
    if subscription.current_period_start is None or subscription.current_period_end is None:
        raise ValueError("Subscription billing period is unavailable.")

    run = await session.scalar(
        select(SubscriptionBillingRun).where(
            SubscriptionBillingRun.subscription_id == subscription.id,
            SubscriptionBillingRun.period_start == subscription.current_period_start,
            SubscriptionBillingRun.period_end == subscription.current_period_end,
        )
    )
    if run is not None and run.status == BillingRunStatus.PROCESSING:
        return BillingResult(status="skipped", invoice_id=run.invoice_id)
    if run is not None and run.status == BillingRunStatus.SUCCEEDED:
        if advance or run.period_advanced_at is not None:
            return BillingResult(status="skipped", invoice_id=run.invoice_id)
        _advance_subscription(subscription, await _first_price(session, subscription.id), effective_at)
        run.period_advanced_at = effective_at
        run.updated_at = effective_at
        await session.flush()
        return BillingResult(status="succeeded", invoice_id=run.invoice_id)
    if run is None:
        run = SubscriptionBillingRun(
            id=generated_id("sbrun"),
            tenant_id=tenant_id,
            subscription_id=subscription.id,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end,
            scheduled_for=subscription.next_billing_at,
            status=BillingRunStatus.PROCESSING,
            attempt_count=1,
            is_advance_billing=advance,
            started_at=effective_at,
            created_at=effective_at,
            updated_at=effective_at,
        )
        session.add(run)
    else:
        run.status = BillingRunStatus.PROCESSING
        run.attempt_count += 1
        run.error_code = None
        run.error_message = None
        run.started_at = effective_at
        run.completed_at = None
        run.is_advance_billing = advance
        run.updated_at = effective_at

    rows = list(
        (
            await session.execute(
                select(
                    SubscriptionItem,
                    Price,
                    Item.is_taxable,
                    Plan.is_taxable,
                    Addon.is_taxable,
                    Item.name,
                    Plan.name,
                    Addon.name,
                )
                .join(Price, Price.id == SubscriptionItem.price_id)
                .outerjoin(Item, Item.id == Price.item_id)
                .outerjoin(Plan, Plan.id == Price.plan_id)
                .outerjoin(Addon, Addon.id == Price.addon_id)
                .where(
                    SubscriptionItem.subscription_id == subscription.id,
                    SubscriptionItem.is_active.is_(True),
                )
                .order_by(SubscriptionItem.position, SubscriptionItem.id)
            )
        ).tuples()
    )
    if not rows:
        raise ValueError("Subscription does not have active recurring items.")
    price_ids = [row[1].id for row in rows]
    tier_rows = list(
        (
            await session.scalars(
                select(PriceTier).where(PriceTier.price_id.in_(price_ids)).order_by(PriceTier.from_unit)
            )
        ).all()
    )
    tiers_by_price: dict[str, list[tuple[int, int | None, int | None, int | None]]] = {}
    for tier in tier_rows:
        tiers_by_price.setdefault(tier.price_id, []).append(
            (tier.from_unit, tier.to_unit, tier.unit_amount, tier.flat_amount)
        )

    charges = list(
        (
            await session.scalars(
                select(SubscriptionCharge)
                .where(
                    SubscriptionCharge.subscription_id == subscription.id,
                    SubscriptionCharge.status == SubscriptionChargeStatus.UNBILLED,
                    SubscriptionCharge.invoice_behavior == "NEXT_INVOICE",
                )
                .order_by(SubscriptionCharge.created_at, SubscriptionCharge.id)
            )
        ).all()
    )
    currencies = {row[0].currency or row[1].currency for row in rows} | {charge.currency for charge in charges}
    if len(currencies) != 1:
        raise ValueError("Subscription items must use one billing currency.")
    currency = currencies.pop()
    calculated: list[dict[str, Any]] = []
    for item, price, item_taxable, plan_taxable, addon_taxable, item_name, plan_name, addon_name in rows:
        base_amount = item.unit_amount if item.unit_amount is not None else price.unit_amount
        if subscription.renewal_pricing_policy.value == "USE_LATEST":
            base_amount = price.unit_amount
        unit_amount = adjust_renewal_amount(
            base_amount,
            subscription.renewal_pricing_policy,
            subscription.renewal_adjustment_percent,
        )
        amount = calculate_catalog_amount(
            price.pricing_model,
            unit_amount,
            item.quantity,
            package_size=price.package_size,
            tiers=tuple(tiers_by_price.get(price.id, ())),
        )
        amount = prorate_initial_stub(
            amount,
            has_stub=subscription.has_initial_stub_period,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end,
            billing_anchor=subscription.billing_cycle_anchor,
            interval_unit=price.interval_unit,
            interval_count=price.interval_count,
        )
        calculated.append(
            {
                "item": item,
                "price": price,
                "charge": None,
                "unit_amount": unit_amount or 0,
                "description": item.description or plan_name or addon_name or item_name or price.nickname,
                "taxable": bool(price.is_taxable or item_taxable or plan_taxable or addon_taxable),
                "subtotal": amount,
                "discount": 0,
            }
        )
    for charge in charges:
        if charge.tax_behavior != subscription.tax_behavior:
            raise ValueError("Unbilled charges must match the subscription tax behavior.")
        calculated.append(
            {
                "item": None,
                "price": None,
                "charge": charge,
                "unit_amount": charge.unit_amount,
                "description": charge.description,
                "taxable": charge.is_taxable,
                "subtotal": charge.unit_amount * charge.quantity,
                "discount": 0,
            }
        )

    discounts = list(
        (
            await session.scalars(
                select(SubscriptionDiscount)
                .where(
                    SubscriptionDiscount.subscription_id == subscription.id,
                    SubscriptionDiscount.status == DiscountStatus.ACTIVE,
                    SubscriptionDiscount.starts_at <= effective_at,
                    or_(SubscriptionDiscount.ends_at.is_(None), SubscriptionDiscount.ends_at > effective_at),
                )
                .order_by(SubscriptionDiscount.created_at, SubscriptionDiscount.id)
            )
        ).all()
    )
    for discount in discounts:
        indexes: Iterable[int] = range(len(calculated))
        if discount.subscription_item_id:
            indexes = (
                index
                for index, line in enumerate(calculated)
                if line["item"] is not None and line["item"].id == discount.subscription_item_id
            )
        remaining = [line["subtotal"] - line["discount"] for line in calculated]
        if discount.subscription_item_id is None:
            amount = calculate_discount(
                sum(remaining),
                currency,
                discount_type=discount.discount_type.value,
                percent_off=discount.percent_off,
                amount_off=discount.amount_off,
                discount_currency=discount.currency,
            )
            for index, allocation in enumerate(allocate_discount(amount, remaining)):
                calculated[index]["discount"] += allocation
            continue
        for index in indexes:
            line = calculated[index]
            base = line["subtotal"] - line["discount"]
            amount = calculate_discount(
                base,
                currency,
                discount_type=discount.discount_type.value,
                percent_off=discount.percent_off,
                amount_off=discount.amount_off,
                discount_currency=discount.currency,
            )
            line["discount"] += min(amount, line["subtotal"] - line["discount"])

    tax_rate = await session.scalar(
        select(TaxRate)
        .where(
            TaxRate.tenant_id == tenant_id,
            TaxRate.is_default.is_(True),
            TaxRate.is_active.is_(True),
            or_(TaxRate.starts_at.is_(None), TaxRate.starts_at <= subscription.current_period_start),
        )
        .order_by(TaxRate.starts_at.desc().nullslast())
    )
    inclusive = subscription.tax_behavior == TaxBehavior.INCLUSIVE
    for line in calculated:
        taxable = bool(line["taxable"])
        discounted = line["subtotal"] - line["discount"]
        line["tax"] = calculate_tax(discounted, tax_rate.rate if taxable and tax_rate else None, inclusive=inclusive)
        line["total"] = discounted if inclusive else discounted + line["tax"]

    customer = await session.scalar(
        select(Customer)
        .where(Customer.id == subscription.customer_id, Customer.tenant_id == tenant_id)
        .with_for_update()
    )
    if customer is None:
        raise ValueError("Subscription customer is unavailable.")
    preference = await session.scalar(
        select(SubscriptionPreference).where(SubscriptionPreference.tenant_id == tenant_id)
    )
    invoice_mode = subscription.invoice_mode_override or (
        preference.default_invoice_mode if preference else SubscriptionInvoiceMode.AUTO_FINALIZE
    )
    payment_term = await _payment_term(session, subscription, customer)
    issue_at = effective_at if advance else subscription.next_billing_at
    due_at = _resolve_due_at(issue_at, payment_term)
    invoice_id = generated_id("inv")
    number = await next_invoice_number(session, tenant_id, effective_at)
    subtotal = sum(line["subtotal"] for line in calculated)
    discount_total = sum(line["discount"] for line in calculated)
    tax_total = sum(line["tax"] for line in calculated)
    total = sum(line["total"] for line in calculated)
    finalized = invoice_mode != SubscriptionInvoiceMode.DRAFT
    status = InvoiceStatus.DRAFT if not finalized else (InvoiceStatus.PAID if total == 0 else InvoiceStatus.OPEN)
    invoice = Invoice(
        id=invoice_id,
        tenant_id=tenant_id,
        customer_id=customer.id,
        subscription_id=subscription.id,
        payment_term_id=payment_term.id if payment_term else None,
        number=number,
        status=status,
        billing_reason=(
            InvoiceBillingReason.SUBSCRIPTION_CREATE
            if subscription.billed_cycle_count == 0
            else InvoiceBillingReason.SUBSCRIPTION_CYCLE
        ),
        currency=currency,
        tax_behavior=subscription.tax_behavior,
        customer_name=customer.name,
        customer_email=customer.email,
        billing_address_snapshot=customer.billing_address,
        issue_at=issue_at,
        due_at=due_at,
        paid_at=effective_at if total == 0 and finalized else None,
        finalized_at=effective_at if finalized else None,
        service_period_start=subscription.current_period_start,
        service_period_end=subscription.current_period_end,
        subtotal_amount=subtotal,
        discount_amount=discount_total,
        tax_amount=tax_total,
        total_amount=total,
        amount_due=total,
        payment_term_name=payment_term.name if payment_term else None,
        notes=customer.invoice_notes,
        terms=customer.invoice_terms,
        created_at=effective_at,
        updated_at=effective_at,
    )
    session.add(invoice)
    # Generated models intentionally have no ORM relationships. Flush the parent
    # explicitly so dependent rows and the billing-run FK cannot race its insert.
    await session.flush()
    for position, line in enumerate(calculated):
        line_item: SubscriptionItem | None = line["item"]
        line_price: Price | None = line["price"]
        line_charge: SubscriptionCharge | None = line["charge"]
        session.add(
            InvoiceLine(
                id=generated_id("invline"),
                invoice_id=invoice_id,
                item_id=line_price.item_id if line_price else None,
                price_id=line_price.id if line_price else line_charge.price_id if line_charge else None,
                subscription_item_id=line_item.id if line_item else None,
                subscription_charge_id=line_charge.id if line_charge else None,
                tax_rate_id=tax_rate.id if tax_rate and line["taxable"] else None,
                description=line["description"] or "Subscription charge",
                position=position,
                quantity=line_item.quantity if line_item else line_charge.quantity if line_charge else 1,
                unit_amount=line["unit_amount"],
                tax_amount=line["tax"],
                tax_name=tax_rate.name if tax_rate and line["taxable"] else None,
                tax_rate=tax_rate.rate if tax_rate and line["taxable"] else None,
                tax_inclusive=inclusive,
                discount_amount=line["discount"],
                total_amount=line["total"],
                service_period_start=(
                    line_charge.service_at
                    if line_charge and line_charge.service_at
                    else subscription.current_period_start
                ),
                service_period_end=(
                    line_charge.service_at
                    if line_charge and line_charge.service_at
                    else subscription.current_period_end
                ),
                created_at=effective_at,
                updated_at=effective_at,
            )
        )
    for charge in charges:
        charge.status = SubscriptionChargeStatus.INVOICED
        charge.invoice_id = invoice_id
        charge.invoiced_at = effective_at
        charge.updated_at = effective_at
    session.add(
        InvoiceSubscription(
            tenant_id=tenant_id,
            invoice_id=invoice_id,
            subscription_id=subscription.id,
            service_period_start=subscription.current_period_start,
            service_period_end=subscription.current_period_end,
            subtotal_amount=subtotal,
            discount_amount=discount_total,
            tax_amount=tax_total,
            total_amount=total,
            created_at=effective_at,
        )
    )
    if finalized:
        session.add(
            CustomerLedgerEntry(
                id=generated_id("ledger"),
                tenant_id=tenant_id,
                customer_id=customer.id,
                subscription_id=subscription.id,
                invoice_id=invoice_id,
                type=LedgerEntryType.INVOICE_FINALIZED,
                direction=LedgerDirection.DEBIT,
                amount=total,
                currency=currency,
                description=f"Subscription invoice {number} finalized",
                idempotency_key=f"invoice:{invoice_id}:finalized",
                effective_at=issue_at,
                created_at=effective_at,
            )
        )
        customer.outstanding_receivable += total
        customer.updated_at = effective_at

    for discount in discounts:
        if discount.duration == DiscountDuration.ONCE:
            discount.status = DiscountStatus.EXHAUSTED
            discount.remaining_cycles = 0
        elif discount.duration == DiscountDuration.REPEATING and discount.remaining_cycles is not None:
            discount.remaining_cycles = max(discount.remaining_cycles - 1, 0)
            if discount.remaining_cycles == 0:
                discount.status = DiscountStatus.EXHAUSTED
        discount.updated_at = effective_at

    session.add(
        SubscriptionEvent(
            id=generated_id("subevent"),
            subscription_id=subscription.id,
            type=SubscriptionEventType.INVOICE_GENERATED,
            details={"invoiceId": invoice_id, "billingRunId": run.id, "totalAmount": str(total)},
            occurred_at=effective_at,
        )
    )
    if advance:
        subscription.next_advance_invoice_at = None
        subscription.last_billed_at = effective_at
        subscription.updated_at = effective_at
    else:
        _advance_subscription(subscription, rows[0][1], effective_at)
    run.status = BillingRunStatus.SUCCEEDED
    run.invoice_id = invoice_id
    run.period_advanced_at = None if advance else effective_at
    run.completed_at = effective_at
    run.updated_at = effective_at
    await session.flush()
    return BillingResult(status="succeeded", invoice_id=invoice_id)


async def record_billing_failure(
    session: AsyncSession,
    tenant_id: str,
    subscription_id: str,
    as_of: int,
    error: Exception,
) -> None:
    subscription = await session.scalar(
        select(Subscription).where(Subscription.id == subscription_id, Subscription.tenant_id == tenant_id)
    )
    if (
        subscription is None
        or subscription.current_period_start is None
        or subscription.current_period_end is None
        or subscription.next_billing_at is None
    ):
        return
    run = await session.scalar(
        select(SubscriptionBillingRun).where(
            SubscriptionBillingRun.subscription_id == subscription_id,
            SubscriptionBillingRun.period_start == subscription.current_period_start,
            SubscriptionBillingRun.period_end == subscription.current_period_end,
        )
    )
    if run is None:
        run = SubscriptionBillingRun(
            id=generated_id("sbrun"),
            tenant_id=tenant_id,
            subscription_id=subscription_id,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end,
            scheduled_for=subscription.next_billing_at,
            status=BillingRunStatus.FAILED,
            attempt_count=1,
            is_advance_billing=False,
            started_at=as_of,
            created_at=as_of,
            updated_at=as_of,
        )
        session.add(run)
    elif run.status == BillingRunStatus.SUCCEEDED:
        return
    else:
        run.status = BillingRunStatus.FAILED
        run.attempt_count += 1
    run.error_code = getattr(error, "app_code", None)
    run.error_message = str(error)[:1_000]
    run.completed_at = as_of
    run.updated_at = as_of
    await session.flush()


async def _payment_term(
    session: AsyncSession,
    subscription: Subscription,
    customer: Customer,
) -> PaymentTerm | None:
    term_id = subscription.payment_term_id or customer.payment_term_id
    if term_id:
        return cast(
            PaymentTerm | None,
            await session.scalar(
                select(PaymentTerm).where(
                    PaymentTerm.id == term_id,
                    PaymentTerm.tenant_id == subscription.tenant_id,
                    PaymentTerm.is_active.is_(True),
                )
            ),
        )
    return cast(
        PaymentTerm | None,
        await session.scalar(
            select(PaymentTerm).where(
                PaymentTerm.tenant_id == subscription.tenant_id,
                PaymentTerm.is_default.is_(True),
                PaymentTerm.is_active.is_(True),
            )
        ),
    )


async def _first_price(session: AsyncSession, subscription_id: str) -> Price:
    price = await session.scalar(
        select(Price)
        .join(SubscriptionItem, SubscriptionItem.price_id == Price.id)
        .where(
            SubscriptionItem.subscription_id == subscription_id,
            SubscriptionItem.is_active.is_(True),
        )
        .order_by(SubscriptionItem.position, SubscriptionItem.id)
        .limit(1)
    )
    if price is None:
        raise ValueError("Subscription does not have an active recurring price.")
    return price


async def next_invoice_number(session: AsyncSession, tenant_id: str, as_of: int) -> str:
    insert_statement = insert(DocumentSequence).values(
        tenant_id=tenant_id,
        document_type=DocumentType.INVOICE,
        next_number=2,
        created_at=as_of,
        updated_at=as_of,
    )
    statement = insert_statement.on_conflict_do_update(
        index_elements=[DocumentSequence.tenant_id, DocumentSequence.document_type],
        set_={
            "next_number": DocumentSequence.next_number + 1,
            "updated_at": as_of,
        },
    ).returning(DocumentSequence.next_number)
    next_number = await session.scalar(statement)
    return f"INV-{(next_number or 2) - 1:06d}"


def _resolve_due_at(issue_at: int, payment_term: PaymentTerm | None) -> int:
    if payment_term is None or payment_term.rule.value == "DUE_ON_RECEIPT":
        return issue_at
    if payment_term.rule.value == "NET_DAYS":
        return issue_at + payment_term.due_days * 86_400
    value = datetime.fromtimestamp(issue_at, UTC)
    month = value.month + (1 if payment_term.rule.value == "END_OF_NEXT_MONTH" else 0)
    year = value.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    day = calendar.monthrange(year, month)[1]
    return int(datetime(year, month, day, 23, 59, 59, tzinfo=UTC).timestamp())


def _advance_subscription(subscription: Subscription, price: Price, as_of: int) -> None:
    if (
        subscription.current_period_start is None
        or subscription.current_period_end is None
        or price.interval_unit is None
        or price.interval_count is None
    ):
        raise ValueError("Subscription cadence is unavailable.")
    billed_cycles = subscription.billed_cycle_count + 1
    completed_cycles = subscription.completed_regular_cycles + (0 if subscription.has_initial_stub_period else 1)
    remaining = subscription.remaining_cycles
    if remaining is not None and not subscription.has_initial_stub_period:
        remaining = max(remaining - 1, 0)
    ended = remaining == 0
    next_start = subscription.current_period_end
    anchor = subscription.billing_cycle_anchor or subscription.current_period_start
    next_end = add_interval(anchor, price.interval_unit, price.interval_count * (completed_cycles + 1))
    next_billing = None
    if not ended:
        next_billing = next_start if subscription.billing_timing == BillingTiming.IN_ADVANCE else next_end
    subscription.status = SubscriptionStatus.ENDED if ended else SubscriptionStatus.ACTIVE
    if not ended:
        subscription.current_period_start = next_start
        subscription.current_period_end = next_end
    if subscription.billing_timing == BillingTiming.IN_ARREARS and not ended:
        subscription.service_period_start = next_start
        subscription.service_period_end = next_end
    subscription.next_billing_at = next_billing
    subscription.next_advance_invoice_at = (
        max(as_of, next_billing - subscription.advance_billing_days * 86_400)
        if next_billing and subscription.advance_billing_enabled and subscription.advance_billing_days
        else None
    )
    subscription.last_billed_at = as_of
    subscription.billed_cycle_count = billed_cycles
    subscription.completed_regular_cycles = completed_cycles
    subscription.has_initial_stub_period = False
    subscription.remaining_cycles = remaining
    subscription.ended_at = as_of if ended else None
    subscription.updated_at = as_of
