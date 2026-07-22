from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.errors import AppHTTPException
from db.models import (
    Customer,
    Estimate,
    EstimateLine,
    Invoice,
    InvoiceLine,
    Item,
    Price,
    Quote,
    QuoteLine,
    Subscription,
    Tenant,
    TenantCurrency,
)
from db.models.generated.enums import InvoiceBillingReason
from domains.billing.resources import ResourceDefinition, ResourceService, generated_id


@dataclass(frozen=True)
class PreparedLine:
    item_id: str | None
    price_id: str | None
    description: str
    quantity: int
    unit_amount: int
    tax_amount: int
    discount_amount: int
    total_amount: int


async def create_document(
    service: ResourceService,
    definition: ResourceDefinition,
    tenant_id: str,
    body: dict[str, Any],
) -> DeclarativeBase:
    if definition.model is Invoice and (body.get("quoteId") or body.get("estimateId")):
        return await _convert_to_invoice(service, definition, tenant_id, body)

    customer_id = body.get("customerId")
    lines = body.get("lines")
    if not isinstance(customer_id, str) or not customer_id or not isinstance(lines, list) or not lines:
        raise _invalid("A document needs a customer and at least one line.")

    customer = await service.session.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant_id)
    )
    tenant = await service.session.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if customer is None:
        raise AppHTTPException(
            code="customer/not-found", message="The selected customer was not found.", http_status_code=404
        )
    if tenant is None:
        raise AppHTTPException(
            code="billing/tenant-not-found", message="The Billing workspace was not found.", http_status_code=404
        )

    if definition.model is Invoice and body.get("subscriptionId"):
        subscription = await service.session.scalar(
            select(Subscription).where(Subscription.id == body["subscriptionId"], Subscription.tenant_id == tenant_id)
        )
        if subscription is None:
            raise AppHTTPException(
                code="subscription/not-found",
                message="The selected subscription was not found.",
                http_status_code=404,
            )
        if subscription.customer_id != customer.id:
            raise _invalid("The subscription belongs to a different customer.")

    currency = str(body.get("currency") or customer.default_currency or tenant.default_currency).upper()
    await _require_enabled_currency(service.session, tenant_id, currency)
    prepared = await _prepare_lines(service.session, tenant_id, currency, lines)
    subtotal = sum(line.quantity * line.unit_amount for line in prepared)
    tax = sum(line.tax_amount for line in prepared)
    line_discounts = sum(line.discount_amount for line in prepared)
    values = dict(body)
    values.pop("lines", None)
    values["customerId"] = customer.id
    values["currency"] = currency
    values["number"] = _document_number(definition.model)
    values["subtotalAmount"] = subtotal
    values["taxAmount"] = tax
    values["totalAmount"] = subtotal - line_discounts + tax
    if definition.model is Invoice:
        document_discount = _amount(body, "discountAmount")
        shipping = _amount(body, "shippingAmount")
        adjustment = _amount(body, "adjustmentAmount", signed=True)
        if document_discount > subtotal:
            raise _invalid("The invoice discount cannot exceed its subtotal.")
        total = subtotal - line_discounts + tax - document_discount + shipping + adjustment
        if total < 0:
            raise _invalid("Invoice adjustments cannot produce a negative total.")
        values.update(
            {
                "billingReason": "MANUAL",
                "customerName": customer.name,
                "customerEmail": customer.email,
                "billingAddressSnapshot": customer.billing_address,
                "discountAmount": document_discount,
                "shippingAmount": shipping,
                "adjustmentAmount": adjustment,
                "totalAmount": total,
                "amountDue": total,
            }
        )

    document = await service.create(definition, tenant_id, values, {})
    await _add_lines(service.session, document, prepared)
    await service.session.flush()
    return document


async def _prepare_lines(
    session: AsyncSession,
    tenant_id: str,
    currency: str,
    raw_lines: list[Any],
) -> list[PreparedLine]:
    if len(raw_lines) > 100:
        raise _invalid("A document can contain at most 100 lines.")
    prepared: list[PreparedLine] = []
    for raw in raw_lines:
        if not isinstance(raw, dict):
            raise _invalid("Each document line must be an object.")
        quantity = _positive_integer(raw.get("quantity", 1), "Line quantities must be positive integers.")
        item = await _item(session, tenant_id, raw.get("itemId"))
        price = await _price(session, tenant_id, raw.get("priceId"))
        if price is not None and price.currency != currency:
            raise _invalid("Every selected price must use the document currency.")
        if item is None and price is not None and price.item_id:
            item = await _item(session, tenant_id, price.item_id)
        unit_amount = raw.get("unitAmount")
        if unit_amount is None and price is not None:
            unit_amount = price.unit_amount
        if unit_amount is None and item is not None and item.default_selling_currency == currency:
            unit_amount = item.default_selling_amount
        if unit_amount is None:
            raise _invalid("Each line needs a unit amount or a matching item/price default.")
        unit_amount = _nonnegative_integer(unit_amount, "Line unit amounts cannot be negative.")
        description = raw.get("description") or (item.name if item is not None else None)
        if not isinstance(description, str) or not description.strip():
            raise _invalid("Each line needs a description.")
        tax_amount = _nonnegative_integer(raw.get("taxAmount", 0), "Line tax amounts cannot be negative.")
        discount = _nonnegative_integer(raw.get("discountAmount", 0), "Line discounts cannot be negative.")
        subtotal = quantity * unit_amount
        if discount > subtotal:
            raise _invalid("A line discount cannot exceed the line subtotal.")
        prepared.append(
            PreparedLine(
                item_id=item.id if item is not None else None,
                price_id=price.id if price is not None else None,
                description=description.strip(),
                quantity=quantity,
                unit_amount=unit_amount,
                tax_amount=tax_amount,
                discount_amount=discount,
                total_amount=subtotal - discount + tax_amount,
            )
        )
    return prepared


async def _convert_to_invoice(
    service: ResourceService,
    definition: ResourceDefinition,
    tenant_id: str,
    body: dict[str, Any],
) -> Invoice:
    quote_id = body.get("quoteId")
    estimate_id = body.get("estimateId")
    if bool(quote_id) == bool(estimate_id):
        raise _invalid("Select exactly one quote or estimate to convert.")
    forbidden = {"customerId", "lines", "currency", "subscriptionId", "priceListId"}
    if any(key in body for key in forbidden):
        raise _invalid("A converted invoice cannot override its source document details.")

    source: Quote | Estimate | None
    source_lines: list[QuoteLine | EstimateLine]
    reason: InvoiceBillingReason
    if quote_id:
        source = await service.session.scalar(
            select(Quote).where(Quote.id == quote_id, Quote.tenant_id == tenant_id).with_for_update()
        )
        if source is None:
            raise AppHTTPException(code="quote/not-found", message="The quote was not found.", http_status_code=404)
        existing = await service.session.scalar(select(Invoice.id).where(Invoice.quote_id == source.id))
        source_lines = list(
            cast(
                list[QuoteLine],
                (await service.session.scalars(select(QuoteLine).where(QuoteLine.quote_id == source.id))).all(),
            )
        )
        reason = InvoiceBillingReason.QUOTE
    else:
        source = await service.session.scalar(
            select(Estimate).where(Estimate.id == estimate_id, Estimate.tenant_id == tenant_id).with_for_update()
        )
        if source is None:
            raise AppHTTPException(
                code="estimate/not-found", message="The estimate was not found.", http_status_code=404
            )
        existing = await service.session.scalar(select(Invoice.id).where(Invoice.estimate_id == source.id))
        source_lines = list(
            cast(
                list[EstimateLine],
                (
                    await service.session.scalars(select(EstimateLine).where(EstimateLine.estimate_id == source.id))
                ).all(),
            )
        )
        reason = InvoiceBillingReason.ESTIMATE
    if existing is not None:
        raise AppHTTPException(
            code="invoice/already-converted",
            message="This sales document already has an invoice.",
            http_status_code=409,
        )
    if str(source.status) in {"CANCELED", "DECLINED"}:
        raise _invalid("This sales document cannot be converted to an invoice.")

    values = dict(body)
    values.update(
        {
            "customerId": source.customer_id,
            "quoteId": source.id if quote_id else None,
            "estimateId": source.id if estimate_id else None,
            "priceListId": source.price_list_id,
            "priceListName": source.price_list_name,
            "number": _document_number(Invoice),
            "billingReason": reason.value,
            "currency": source.currency,
            "issueAt": body.get("issueAt", int(time.time())),
            "subtotalAmount": source.subtotal_amount,
            "taxAmount": source.tax_amount,
            "totalAmount": source.total_amount,
            "amountDue": source.total_amount,
            "notes": body.get("notes", source.notes),
            "terms": body.get("terms", source.terms),
        }
    )
    invoice = cast(Invoice, await service.create(definition, tenant_id, values, {}))
    now = int(time.time())
    for position, line in enumerate(source_lines):
        service.session.add(
            InvoiceLine(
                id=generated_id("invline"),
                invoice_id=invoice.id,
                item_id=line.item_id,
                price_id=line.price_id,
                description=line.description,
                position=position,
                quantity=line.quantity,
                unit_amount=line.unit_amount,
                tax_amount=line.tax_amount,
                discount_amount=line.discount_amount,
                total_amount=line.total_amount,
                created_at=now,
                updated_at=now,
            )
        )
    await service.session.flush()
    return invoice


async def _add_lines(session: AsyncSession, document: DeclarativeBase, lines: list[PreparedLine]) -> None:
    now = int(time.time())
    if isinstance(document, Invoice):
        for position, line in enumerate(lines):
            session.add(
                InvoiceLine(
                    id=generated_id("invline"),
                    invoice_id=document.id,
                    position=position,
                    unit=None,
                    tax_rate_id=None,
                    tax_name=None,
                    tax_rate=None,
                    tax_inclusive=False,
                    service_period_start=None,
                    service_period_end=None,
                    created_at=now,
                    updated_at=now,
                    **line.__dict__,
                )
            )
    elif isinstance(document, Quote):
        for line in lines:
            session.add(
                QuoteLine(
                    id=generated_id("quoteline"),
                    quote_id=document.id,
                    created_at=now,
                    updated_at=now,
                    **line.__dict__,
                )
            )
    elif isinstance(document, Estimate):
        for line in lines:
            session.add(
                EstimateLine(
                    id=generated_id("estline"),
                    estimate_id=document.id,
                    created_at=now,
                    updated_at=now,
                    **line.__dict__,
                )
            )


async def _item(session: AsyncSession, tenant_id: str, item_id: Any) -> Item | None:
    if item_id is None:
        return None
    item = await session.scalar(select(Item).where(Item.id == item_id, Item.tenant_id == tenant_id, Item.is_active))
    if item is None:
        raise AppHTTPException(code="item/not-found", message="A selected item was not found.", http_status_code=404)
    return item


async def _price(session: AsyncSession, tenant_id: str, price_id: Any) -> Price | None:
    if price_id is None:
        return None
    price = await session.scalar(
        select(Price).where(Price.id == price_id, Price.tenant_id == tenant_id, Price.is_active)
    )
    if price is None:
        raise AppHTTPException(code="price/not-found", message="A selected price was not found.", http_status_code=404)
    return price


async def _require_enabled_currency(session: AsyncSession, tenant_id: str, currency: str) -> None:
    enabled = await session.scalar(
        select(TenantCurrency.currency_code).where(
            TenantCurrency.tenant_id == tenant_id,
            TenantCurrency.currency_code == currency,
            TenantCurrency.is_enabled,
        )
    )
    if enabled is None:
        raise _invalid("Enable the document currency before using it.")


def _document_number(model: type[Any]) -> str:
    prefix = {Invoice: "INV", Quote: "QUO", Estimate: "EST"}[model]
    return f"{prefix}-{int(time.time())}-{generated_id('n').removeprefix('n_')[:6]}"


def _amount(body: dict[str, Any], key: str, *, signed: bool = False) -> int:
    value = body.get(key, 0)
    if signed:
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise _invalid(f"{key} must be an integer.") from exc
    return _nonnegative_integer(value, f"{key} cannot be negative.")


def _positive_integer(value: Any, message: str) -> int:
    parsed = _nonnegative_integer(value, message)
    if parsed == 0:
        raise _invalid(message)
    return parsed


def _nonnegative_integer(value: Any, message: str) -> int:
    if isinstance(value, bool):
        raise _invalid(message)
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise _invalid(message) from exc
    if parsed < 0:
        raise _invalid(message)
    return parsed


def _invalid(message: str) -> AppHTTPException:
    return AppHTTPException(code="validation/invalid-request", message=message, http_status_code=422)
