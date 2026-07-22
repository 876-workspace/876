from __future__ import annotations

import re
import secrets
import time
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import BigInteger, Numeric, Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.errors import AppHTTPException
from db.models import (
    Addon,
    AppFinanceConnection,
    BankAccount,
    BankTransaction,
    Coupon,
    CreditNote,
    Customer,
    Estimate,
    Invoice,
    InvoicePreference,
    Item,
    Member,
    Payment,
    PaymentMode,
    PaymentProvider,
    PaymentProviderConnection,
    PaymentTerm,
    Plan,
    Price,
    PriceList,
    Product,
    PromotionCode,
    Quote,
    Refund,
    Role,
    Salesperson,
    Subscription,
    SubscriptionCharge,
    SubscriptionCustomView,
    SubscriptionDiscount,
    SubscriptionPreference,
    TaxAuthority,
    TaxRate,
    Tenant,
    TenantCurrency,
    Vendor,
)


@dataclass(frozen=True)
class ResourceDefinition:
    model: type[DeclarativeBase]
    object_name: str
    id_prefix: str
    id_attribute: str = "id"
    tenant_scoped: bool = True
    archive_attribute: str | None = None
    archive_value: Any = None


RESOURCE_MATCHERS: tuple[tuple[str, ResourceDefinition], ...] = (
    ("/banking/accounts/{accountId}/transactions", ResourceDefinition(BankTransaction, "bank_transaction", "btxn")),
    ("/banking/accounts", ResourceDefinition(BankAccount, "bank_account", "bacc")),
    ("/bank-accounts", ResourceDefinition(BankAccount, "bank_account", "bacc")),
    ("/discounts/promotion-codes", ResourceDefinition(PromotionCode, "promotion_code", "promo")),
    (
        "/discounts/coupons",
        ResourceDefinition(Coupon, "coupon", "coupon", archive_attribute="status", archive_value="CANCELED"),
    ),
    (
        "/payment-providers/connections",
        ResourceDefinition(PaymentProviderConnection, "payment_provider_connection", "ppconn"),
    ),
    ("/payment-providers", ResourceDefinition(PaymentProvider, "payment_provider", "pprov", tenant_scoped=False)),
    ("/payments/modes", ResourceDefinition(PaymentMode, "payment_mode", "pmode")),
    ("/payment-modes", ResourceDefinition(PaymentMode, "payment_mode", "pmode")),
    ("/subscription-views", ResourceDefinition(SubscriptionCustomView, "subscription_view", "subview")),
    (
        "/subscription-preferences",
        ResourceDefinition(SubscriptionPreference, "subscription_preference", "subpref", id_attribute="tenant_id"),
    ),
    (
        "/subscriptions/{subscriptionId}/charges",
        ResourceDefinition(SubscriptionCharge, "subscription_charge", "subchg"),
    ),
    (
        "/subscriptions/{subscriptionId}/discounts",
        ResourceDefinition(SubscriptionDiscount, "subscription_discount", "subdisc"),
    ),
    ("/tax-authorities", ResourceDefinition(TaxAuthority, "tax_authority", "taxauth")),
    ("/tax-rates", ResourceDefinition(TaxRate, "tax_rate", "taxrate")),
    (
        "/invoice-preferences",
        ResourceDefinition(InvoicePreference, "invoice_preference", "invpref", id_attribute="tenant_id"),
    ),
    ("/finance-connections", ResourceDefinition(AppFinanceConnection, "app_finance_connection", "afconn")),
    ("/credit-notes", ResourceDefinition(CreditNote, "credit_note", "cn")),
    ("/price-lists", ResourceDefinition(PriceList, "price_list", "plist")),
    ("/payment-terms", ResourceDefinition(PaymentTerm, "payment_term", "pterm")),
    ("/salespeople", ResourceDefinition(Salesperson, "salesperson", "sales")),
    ("/currencies", ResourceDefinition(TenantCurrency, "currency", "currency", id_attribute="currency_code")),
    (
        "/customers",
        ResourceDefinition(Customer, "customer", "cust", archive_attribute="status", archive_value="ARCHIVED"),
    ),
    ("/estimates", ResourceDefinition(Estimate, "estimate", "est")),
    ("/invoices", ResourceDefinition(Invoice, "invoice", "inv")),
    ("/items", ResourceDefinition(Item, "item", "item", archive_attribute="is_active", archive_value=False)),
    ("/payments", ResourceDefinition(Payment, "payment", "pay")),
    ("/addons", ResourceDefinition(Addon, "addon", "addon", archive_attribute="is_active", archive_value=False)),
    ("/plans", ResourceDefinition(Plan, "plan", "plan", archive_attribute="is_active", archive_value=False)),
    ("/prices", ResourceDefinition(Price, "price", "price", archive_attribute="is_active", archive_value=False)),
    ("/products", ResourceDefinition(Product, "product", "prod", archive_attribute="is_active", archive_value=False)),
    ("/quotes", ResourceDefinition(Quote, "quote", "quote")),
    ("/refunds", ResourceDefinition(Refund, "refund", "refund")),
    ("/roles", ResourceDefinition(Role, "billing_role", "brole")),
    ("/members", ResourceDefinition(Member, "billing_member", "bmember", id_attribute="user_id")),
    ("/subscriptions", ResourceDefinition(Subscription, "subscription", "sub")),
    ("/vendors", ResourceDefinition(Vendor, "vendor", "vendor", archive_attribute="status", archive_value="ARCHIVED")),
    ("/tenants", ResourceDefinition(Tenant, "billing_tenant", "btenant", tenant_scoped=False)),
)


def resource_for_path(path: str) -> ResourceDefinition | None:
    normalized = re.sub(r"^/integrations/organizations/\{organizationId\}", "", path)
    normalized = re.sub(r"^/admin", "", normalized)
    for prefix, definition in RESOURCE_MATCHERS:
        if normalized.startswith(prefix):
            return definition
    return None


def snake_case(value: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()


def camel_case(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


def generated_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(12)}"


class ResourceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list(
        self,
        definition: ResourceDefinition,
        tenant_id: str | None,
        path_params: dict[str, str],
        query_params: dict[str, str],
    ) -> dict[str, Any]:
        statement = select(definition.model)
        statement = self._scope(statement, definition, tenant_id, path_params)
        mapper = definition.model.__mapper__
        for name, value in query_params.items():
            attribute_name = snake_case(name)
            if attribute_name in mapper.attrs and value not in {"", "all"}:
                statement = statement.where(getattr(definition.model, attribute_name) == value)
        limit = min(max(int(query_params.get("limit", "100")), 1), 100)
        id_column = getattr(definition.model, definition.id_attribute)
        statement = statement.order_by(id_column).limit(limit + 1)
        rows = list((await self.session.scalars(statement)).all())
        has_more = len(rows) > limit
        rows = rows[:limit]
        return {
            "object": "list",
            "data": [serialize_resource(row, definition.object_name) for row in rows],
            "has_more": has_more,
            "total_count": len(rows),
            "url": path_without_params(query_params.get("_request_path", "")),
        }

    async def retrieve(
        self,
        definition: ResourceDefinition,
        tenant_id: str | None,
        path_params: dict[str, str],
    ) -> DeclarativeBase:
        identifier = self._identifier(definition, path_params, tenant_id)
        statement = select(definition.model).where(getattr(definition.model, definition.id_attribute) == identifier)
        statement = self._scope(statement, definition, tenant_id, path_params)
        row = (await self.session.scalars(statement)).first()
        if row is None:
            raise AppHTTPException(
                code=f"{definition.object_name}/not-found",
                message=f"The requested {definition.object_name.replace('_', ' ')} was not found.",
                http_status_code=404,
            )
        return row

    async def find_idempotent(
        self,
        definition: ResourceDefinition,
        tenant_id: str,
        source_app_id: str,
        idempotency_key: str,
    ) -> DeclarativeBase | None:
        mapper = definition.model.__mapper__
        required = {"tenant_id", "source_app_id", "source_idempotency_key"}
        if not required.issubset(mapper.attrs.keys()):
            return None
        statement = select(definition.model).where(
            mapper.attrs["tenant_id"].class_attribute == tenant_id,
            mapper.attrs["source_app_id"].class_attribute == source_app_id,
            mapper.attrs["source_idempotency_key"].class_attribute == idempotency_key,
        )
        return (await self.session.scalars(statement)).first()

    async def create(
        self,
        definition: ResourceDefinition,
        tenant_id: str | None,
        body: dict[str, Any],
        path_params: dict[str, str],
    ) -> DeclarativeBase:
        values = self._values(definition, body)
        mapper = definition.model.__mapper__
        now = int(time.time())
        if definition.tenant_scoped and "tenant_id" in mapper.attrs and tenant_id is not None:
            values["tenant_id"] = tenant_id
        if definition.id_attribute == "id" and "id" in mapper.attrs and not values.get("id"):
            values["id"] = generated_id(definition.id_prefix)
        for attribute in ("created_at", "updated_at"):
            if attribute in mapper.attrs and attribute not in values:
                values[attribute] = now
        self._apply_parent_fields(values, mapper.attrs.keys(), path_params)
        self._require_values(definition, values)
        row = definition.model(**values)
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def update(
        self,
        definition: ResourceDefinition,
        tenant_id: str | None,
        body: dict[str, Any],
        path_params: dict[str, str],
    ) -> DeclarativeBase:
        row = await self.retrieve(definition, tenant_id, path_params)
        values = self._values(definition, body)
        for protected in ("id", "tenant_id", "created_at"):
            values.pop(protected, None)
        for attribution in ("source_app_id", "source_idempotency_key", "source_payload_hash"):
            values.pop(attribution, None)
        if "updated_at" in definition.model.__mapper__.attrs:
            values["updated_at"] = int(time.time())
        for key, value in values.items():
            setattr(row, key, value)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def delete(
        self,
        definition: ResourceDefinition,
        tenant_id: str | None,
        path_params: dict[str, str],
    ) -> dict[str, Any]:
        row = await self.retrieve(definition, tenant_id, path_params)
        identifier = getattr(row, definition.id_attribute)
        if definition.archive_attribute:
            setattr(row, definition.archive_attribute, definition.archive_value)
            if "updated_at" in definition.model.__mapper__.attrs:
                setattr(row, "updated_at", int(time.time()))  # noqa: B010 - model type is selected at runtime
        else:
            await self.session.delete(row)
        await self.session.flush()
        return {"object": definition.object_name, "id": identifier, "deleted": True}

    def _scope(
        self,
        statement: Select[Any],
        definition: ResourceDefinition,
        tenant_id: str | None,
        path_params: dict[str, str],
    ) -> Select[Any]:
        mapper = definition.model.__mapper__
        if definition.tenant_scoped and "tenant_id" in mapper.attrs:
            statement = statement.where(mapper.attrs["tenant_id"].class_attribute == tenant_id)
        parent_fields: tuple[tuple[str, str], ...] = (
            ("accountId", "account_id"),
            ("subscriptionId", "subscription_id"),
        )
        for parameter, attribute in parent_fields:
            if parameter in path_params and attribute in mapper.attrs:
                statement = statement.where(getattr(definition.model, attribute) == path_params[parameter])
        return statement

    def _identifier(
        self,
        definition: ResourceDefinition,
        path_params: dict[str, str],
        tenant_id: str | None,
    ) -> str:
        if definition.id_attribute == "tenant_id":
            if tenant_id is None:
                raise AppHTTPException(
                    code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
                )
            return tenant_id
        for name, value in reversed(path_params.items()):
            if name != "organizationId" and (name.lower().endswith("id") or name == "code"):
                return value
        raise AppHTTPException(
            code="billing/id-required", message="A resource identifier is required.", http_status_code=400
        )

    def _values(self, definition: ResourceDefinition, body: dict[str, Any]) -> dict[str, Any]:
        mapper = definition.model.__mapper__
        values: dict[str, Any] = {}
        for key, value in body.items():
            attribute = snake_case(key)
            if attribute == "metadata" and "metadata_" in mapper.attrs:
                attribute = "metadata_"
            if attribute not in mapper.attrs or attribute.startswith("_"):
                continue
            column = mapper.attrs[attribute].columns[0]
            if value is not None and isinstance(column.type, (BigInteger,)):
                value = int(value)
            elif value is not None and isinstance(column.type, Numeric):
                value = Decimal(str(value))
            values[attribute] = value
        return values

    def _apply_parent_fields(self, values: dict[str, Any], attributes: Any, path_params: dict[str, str]) -> None:
        for parameter, attribute in (("accountId", "account_id"), ("subscriptionId", "subscription_id")):
            if parameter in path_params and attribute in attributes:
                values[attribute] = path_params[parameter]

    def _require_values(self, definition: ResourceDefinition, values: dict[str, Any]) -> None:
        missing = []
        for column in definition.model.__table__.columns:
            attribute = column.key
            if attribute == "metadata" and "metadata_" in definition.model.__mapper__.attrs:
                attribute = "metadata_"
            if (
                not column.nullable
                and column.default is None
                and column.server_default is None
                and attribute not in values
                and not (column.primary_key and definition.id_attribute != "id")
            ):
                missing.append(camel_case(column.name))
        if missing:
            raise AppHTTPException(
                code="validation/invalid-request",
                message=f"Missing required fields: {', '.join(missing)}.",
                http_status_code=422,
            )


def serialize_value(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_value(item) for key, item in value.items()}
    return value


def serialize_resource(row: DeclarativeBase, object_name: str) -> dict[str, Any]:
    result: dict[str, Any] = {"object": object_name}
    for attribute in row.__mapper__.column_attrs:
        key = attribute.key
        if key in {"tenant_id", "source_idempotency_key", "source_payload_hash"}:
            continue
        output_key = "metadata" if key == "metadata_" else camel_case(key)
        value = getattr(row, key)
        if isinstance(attribute.columns[0].type, BigInteger) and value is not None:
            value = str(value)
        result[output_key] = serialize_value(value)
    return result


def path_without_params(path: str) -> str:
    return path.split("?", 1)[0]
