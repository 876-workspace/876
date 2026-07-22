from __future__ import annotations

import time
from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import (
    Addon,
    Customer,
    CustomerLedgerEntry,
    Invoice,
    InvoiceLine,
    Plan,
    PlanAddonAssociation,
    Price,
    PriceList,
    PriceListEntry,
    PriceListEntryTier,
    PriceTier,
    Subscription,
    SubscriptionEvent,
    SubscriptionItem,
    TenantCurrency,
)
from db.models.generated.enums import (
    InvoiceBillingReason,
    InvoiceStatus,
    LedgerDirection,
    LedgerEntryType,
    PriceListDirection,
    PriceListMode,
    PriceListRounding,
    PricingModel,
    SubscriptionEventType,
)
from domains.billing.resources import generated_id


async def save_addon_associations(
    session: AsyncSession, tenant_id: str, addon_id: str, body: dict[str, Any]
) -> dict[str, Any]:
    raw = body.get("associations", body.get("data", body))
    associations = raw if isinstance(raw, list) else [raw]
    if not associations or not all(isinstance(item, dict) for item in associations):
        raise _invalid("Enter at least one add-on association.")
    plan_ids = [item.get("planId") for item in associations]
    if any(not isinstance(plan_id, str) or not plan_id for plan_id in plan_ids):
        raise _invalid("Each association needs a plan.")
    if len(set(plan_ids)) != len(plan_ids):
        raise _invalid("Each plan can appear only once.")
    addon = await session.scalar(select(Addon).where(Addon.id == addon_id, Addon.tenant_id == tenant_id))
    plans = list((await session.scalars(select(Plan).where(Plan.id.in_(plan_ids), Plan.tenant_id == tenant_id))).all())
    if addon is None or len(plans) != len(plan_ids):
        raise AppHTTPException(
            code="addon/association-not-found", message="Add-on or plan not found.", http_status_code=404
        )
    if any(plan.product_id != addon.product_id for plan in plans):
        raise _invalid("The add-on and plan must belong to the same product.")
    if str(addon.price_type) == "RECURRING" and any(
        plan.interval_unit != addon.interval_unit or plan.interval_count != addon.interval_count for plan in plans
    ):
        raise _invalid("Recurring add-ons must match the plan billing cadence.")

    existing = list(
        (
            await session.scalars(
                select(PlanAddonAssociation).where(
                    PlanAddonAssociation.tenant_id == tenant_id,
                    PlanAddonAssociation.addon_id == addon_id,
                    PlanAddonAssociation.plan_id.in_(plan_ids),
                )
            )
        ).all()
    )
    by_plan = {row.plan_id: row for row in existing}
    now = int(time.time())
    ids: list[str] = []
    for item in associations:
        plan_id = str(item["planId"])
        row = by_plan.get(plan_id)
        if row is None:
            row = PlanAddonAssociation(
                id=generated_id("passoc"),
                tenant_id=tenant_id,
                plan_id=plan_id,
                addon_id=addon_id,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        for source, target in (
            ("associationType", "association_type"),
            ("events", "events"),
            ("frequency", "frequency"),
            ("isActive", "is_active"),
        ):
            if source in item:
                setattr(row, target, item[source])
        row.updated_at = now
        ids.append(row.id)
    await session.flush()
    return {"object": "addon_association_batch", "ids": ids}


async def record_opening_balance(
    session: AsyncSession, tenant_id: str, customer_id: str, body: dict[str, Any]
) -> dict[str, Any]:
    amount = _positive_integer(body.get("amount"), "Enter an opening balance greater than zero.")
    currency = str(body.get("currency", "")).upper()
    as_of = _positive_integer(body.get("asOf"), "Enter a valid opening-balance date.")
    enabled = await session.scalar(
        select(TenantCurrency.currency_code).where(
            TenantCurrency.tenant_id == tenant_id,
            TenantCurrency.currency_code == currency,
            TenantCurrency.is_enabled,
        )
    )
    if enabled is None:
        raise _invalid("Enable the opening-balance currency before using it.")
    customer = await session.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id).with_for_update()
    )
    if customer is None:
        raise AppHTTPException(code="customer/not-found", message="Customer not found.", http_status_code=404)
    now = int(time.time())
    invoice_id = generated_id("inv")
    reference = body.get("reference")
    description = f"Opening balance: {reference}" if reference else "Opening balance"
    invoice = Invoice(
        id=invoice_id,
        tenant_id=tenant_id,
        customer_id=customer_id,
        number=f"INV-{now}-{invoice_id[-6:]}",
        status=InvoiceStatus.OPEN,
        billing_reason=InvoiceBillingReason.OPENING_BALANCE,
        currency=currency,
        issue_at=as_of,
        due_at=as_of,
        finalized_at=now,
        subtotal_amount=amount,
        total_amount=amount,
        amount_due=amount,
        notes=description,
        created_at=now,
        updated_at=now,
    )
    session.add(invoice)
    session.add(
        InvoiceLine(
            id=generated_id("invline"),
            invoice_id=invoice_id,
            description="Opening balance",
            position=0,
            quantity=1,
            unit_amount=amount,
            total_amount=amount,
            created_at=now,
            updated_at=now,
        )
    )
    session.add(
        CustomerLedgerEntry(
            id=generated_id("ledger"),
            tenant_id=tenant_id,
            customer_id=customer_id,
            invoice_id=invoice_id,
            type=LedgerEntryType.OPENING_BALANCE,
            direction=LedgerDirection.DEBIT,
            amount=amount,
            currency=currency,
            description=description,
            idempotency_key=f"invoice:{invoice_id}:finalized",
            effective_at=as_of,
            created_at=now,
        )
    )
    customer.outstanding_receivable += amount
    customer.updated_at = now
    await session.flush()
    return {"object": "invoice", "id": invoice_id}


async def update_invoice_modes(session: AsyncSession, tenant_id: str, body: dict[str, Any]) -> dict[str, Any]:
    raw_ids = body.get("subscriptionIds")
    if not isinstance(raw_ids, list) or not raw_ids or not all(isinstance(item, str) for item in raw_ids):
        raise _invalid("Enter at least one subscription.")
    ids = list(dict.fromkeys(raw_ids))
    subscriptions = list(
        (
            await session.scalars(
                select(Subscription).where(
                    Subscription.tenant_id == tenant_id,
                    Subscription.id.in_(ids),
                    Subscription.deleted_at.is_(None),
                )
            )
        ).all()
    )
    if len(subscriptions) != len(ids):
        raise AppHTTPException(
            code="subscription/not-found",
            message="One or more subscriptions were not found.",
            http_status_code=404,
        )
    mode = body.get("invoiceModeOverride")
    now = int(time.time())
    for subscription in subscriptions:
        subscription.invoice_mode_override = mode
        subscription.updated_at = now
        session.add(
            SubscriptionEvent(
                id=generated_id("subevent"),
                subscription_id=subscription.id,
                type=SubscriptionEventType.UPDATED,
                details={"invoiceModeOverride": mode, "bulkUpdate": True},
                occurred_at=now,
            )
        )
    await session.flush()
    return {"object": "subscription_invoice_mode_update", "updated": len(subscriptions)}


async def resolve_price(session: AsyncSession, tenant_id: str, body: dict[str, Any]) -> dict[str, Any]:
    price_id = body.get("priceId")
    quantity = _positive_integer(body.get("quantity", 1), "Quantity must be a positive integer.")
    price = await session.scalar(
        select(Price).where(Price.id == price_id, Price.tenant_id == tenant_id, Price.is_active)
    )
    if price is None:
        raise AppHTTPException(code="price/not-found", message="The price was not found.", http_status_code=404)
    base = await _catalog_amount(session, price, quantity)
    price_list_id = body.get("priceListId")
    if not price_list_id:
        return _resolved_price(price, base, None)
    price_list = await session.scalar(
        select(PriceList).where(PriceList.id == price_list_id, PriceList.tenant_id == tenant_id, PriceList.is_active)
    )
    if price_list is None:
        raise AppHTTPException(
            code="price-list/not-found", message="The price list was not found.", http_status_code=404
        )
    amount = base
    if price_list.mode == PriceListMode.PERCENTAGE:
        if price_list.direction is None or price_list.percentage is None:
            raise AppHTTPException(
                code="price-list/invalid", message="The percentage price list is incomplete.", http_status_code=409
            )
        multiplier = Decimal(1) + (
            price_list.percentage / Decimal(100)
            if price_list.direction == PriceListDirection.MARKUP
            else -price_list.percentage / Decimal(100)
        )
        amount = _round_minor(Decimal(base) * multiplier, price_list.rounding)
    else:
        entry = await session.scalar(
            select(PriceListEntry).where(
                PriceListEntry.tenant_id == tenant_id,
                PriceListEntry.price_list_id == price_list.id,
                PriceListEntry.price_id == price.id,
            )
        )
        if entry is not None:
            tier = await session.scalar(
                select(PriceListEntryTier)
                .where(
                    PriceListEntryTier.price_list_entry_id == entry.id,
                    PriceListEntryTier.from_unit <= quantity,
                    (PriceListEntryTier.to_unit.is_(None) | (PriceListEntryTier.to_unit >= quantity)),
                )
                .order_by(PriceListEntryTier.from_unit.desc())
            )
            amount = (tier.unit_amount if tier else entry.unit_amount or price.unit_amount or 0) * quantity
    return _resolved_price(price, amount, price_list)


async def subscription_preview(
    session: AsyncSession, tenant_id: str, subscription_id: str, body: dict[str, Any] | None = None
) -> dict[str, Any]:
    subscription = await session.scalar(
        select(Subscription).where(Subscription.id == subscription_id, Subscription.tenant_id == tenant_id)
    )
    if subscription is None:
        raise AppHTTPException(
            code="subscription/not-found", message="The subscription was not found.", http_status_code=404
        )
    current_items = list(
        (
            await session.scalars(
                select(SubscriptionItem).where(
                    SubscriptionItem.subscription_id == subscription_id, SubscriptionItem.is_active
                )
            )
        ).all()
    )
    if body is None:
        lines = [_preview_line(item) for item in current_items]
        total = sum(int(line["totalAmount"]) for line in lines)
        return {
            "object": "upcoming_invoice",
            "subscriptionId": subscription_id,
            "currency": current_items[0].currency if current_items else None,
            "scheduledFor": subscription.next_billing_at,
            "servicePeriodStart": subscription.current_period_start,
            "servicePeriodEnd": subscription.current_period_end,
            "subtotalAmount": str(total),
            "discountAmount": "0",
            "taxAmount": "0",
            "totalAmount": str(total),
            "lines": lines,
        }
    if subscription.current_period_start is None or subscription.current_period_end is None:
        raise AppHTTPException(
            code="subscription/period-unavailable",
            message="The subscription does not have an active billing period.",
            http_status_code=409,
        )
    change_at = _positive_integer(body.get("changeAt"), "Enter a valid change date.")
    if not subscription.current_period_start <= change_at <= subscription.current_period_end:
        raise _invalid("The change date must fall in the current billing period.")
    raw_items = body.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise _invalid("Enter at least one replacement subscription item.")
    price_ids = [item.get("priceId") for item in raw_items if isinstance(item, dict)]
    prices = list(
        (await session.scalars(select(Price).where(Price.id.in_(price_ids), Price.tenant_id == tenant_id))).all()
    )
    if len(prices) != len(raw_items):
        raise AppHTTPException(code="price/not-found", message="A selected price was not found.", http_status_code=404)
    old_amount = sum((item.unit_amount or 0) * item.quantity for item in current_items)
    by_id = {price.id: price for price in prices}
    new_amount = sum((by_id[item["priceId"]].unit_amount or 0) * int(item.get("quantity", 1)) for item in raw_items)
    period = subscription.current_period_end - subscription.current_period_start
    remaining = subscription.current_period_end - change_at
    old_credit = _prorate(old_amount, remaining, period)
    new_charge = _prorate(new_amount, remaining, period)
    net = new_charge - old_credit
    return {
        "object": "proration_preview",
        "error": None,
        "subscriptionId": subscription_id,
        "currency": current_items[0].currency if current_items else prices[0].currency,
        "changeAt": change_at,
        "periodStart": subscription.current_period_start,
        "periodEnd": subscription.current_period_end,
        "oldPeriodAmount": str(old_amount),
        "newPeriodAmount": str(new_amount),
        "unusedCredit": str(old_credit),
        "remainingCharge": str(new_charge),
        "netAmount": str(net),
        "adjustment": "INVOICE" if net > 0 else "CREDIT_NOTE" if net < 0 else "NONE",
    }


async def _catalog_amount(session: AsyncSession, price: Price, quantity: int) -> int:
    if price.pricing_model == PricingModel.FLAT:
        return (price.unit_amount or 0) * quantity
    tier = await session.scalar(
        select(PriceTier)
        .where(
            PriceTier.price_id == price.id,
            PriceTier.from_unit <= quantity,
            (PriceTier.to_unit.is_(None) | (PriceTier.to_unit >= quantity)),
        )
        .order_by(PriceTier.from_unit.desc())
    )
    if tier is None:
        raise _invalid("The selected catalog price does not cover this quantity.")
    return (tier.unit_amount or 0) * quantity + (tier.flat_amount or 0)


def _preview_line(item: SubscriptionItem) -> dict[str, Any]:
    amount = (item.unit_amount or 0) * item.quantity
    return {
        "object": "upcoming_invoice_line",
        "kind": "RECURRING",
        "subscriptionItemId": item.id,
        "subscriptionChargeId": None,
        "priceId": item.price_id,
        "description": item.description or "Subscription charge",
        "quantity": item.quantity,
        "unitAmount": str(item.unit_amount or 0),
        "discountAmount": "0",
        "taxAmount": "0",
        "totalAmount": str(amount),
    }


def _resolved_price(price: Price, amount: int, price_list: PriceList | None) -> dict[str, Any]:
    return {
        "object": "resolved_price",
        "priceId": price.id,
        "currency": price_list.currency if price_list and price_list.currency else price.currency,
        "amount": str(amount),
        "priceListId": price_list.id if price_list else None,
    }


def _round_minor(value: Decimal, mode: PriceListRounding) -> int:
    rounding = {
        PriceListRounding.UP: ROUND_CEILING,
        PriceListRounding.DOWN: ROUND_FLOOR,
        PriceListRounding.NEAREST: ROUND_HALF_UP,
        PriceListRounding.NONE: ROUND_HALF_UP,
    }[mode]
    return int(value.quantize(Decimal("1"), rounding=rounding))


def _prorate(amount: int, remaining: int, period: int) -> int:
    if period <= 0:
        raise _invalid("The subscription billing period is invalid.")
    return (amount * remaining + period // 2) // period


def _positive_integer(value: Any, message: str) -> int:
    if isinstance(value, bool):
        raise _invalid(message)
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise _invalid(message) from exc
    if parsed <= 0:
        raise _invalid(message)
    return parsed


def _invalid(message: str) -> AppHTTPException:
    return AppHTTPException(code="validation/invalid-request", message=message, http_status_code=422)
