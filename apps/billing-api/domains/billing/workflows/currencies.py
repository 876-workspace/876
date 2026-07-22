from __future__ import annotations

import time
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import Currency, Tenant, TenantCurrency


async def list_currencies(session: AsyncSession, tenant_id: str, request_path: str) -> dict[str, Any]:
    statement = (
        select(TenantCurrency, Currency)
        .join(Currency, Currency.code == TenantCurrency.currency_code)
        .where(TenantCurrency.tenant_id == tenant_id, TenantCurrency.is_enabled.is_(True))
        .order_by(TenantCurrency.is_default.desc(), TenantCurrency.currency_code)
    )
    rows = (await session.execute(statement)).all()
    data = [currency_resource(link, currency) for link, currency in rows]
    return {
        "object": "list",
        "data": data,
        "has_more": False,
        "total_count": len(data),
        "url": request_path,
    }


async def create_currency(session: AsyncSession, tenant_id: str, body: dict[str, Any]) -> dict[str, Any]:
    code = _currency_code(body.get("code"))
    name = body.get("name")
    decimal_places = body.get("decimalPlaces")
    if (
        not isinstance(name, str)
        or not name.strip()
        or not isinstance(decimal_places, int)
        or not 0 <= decimal_places <= 4
    ):
        raise _invalid("Enter valid currency details.")
    now = int(time.time())
    currency = await session.get(Currency, code)
    if currency is None:
        currency = Currency(
            code=code,
            name=name.strip(),
            symbol=body.get("symbol"),
            decimal_places=decimal_places,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        session.add(currency)
    else:
        currency.name = name.strip()
        currency.symbol = body.get("symbol")
        currency.decimal_places = decimal_places
        currency.is_active = True
        currency.updated_at = now
    link = await session.get(TenantCurrency, (tenant_id, code))
    if link is None:
        link = TenantCurrency(
            tenant_id=tenant_id,
            currency_code=code,
            is_default=False,
            is_enabled=True,
            created_at=now,
            updated_at=now,
        )
        session.add(link)
    else:
        link.is_enabled = True
        link.updated_at = now
    await session.flush()
    return {"object": "tenant_currency", "currency": code}


async def set_default_currency(session: AsyncSession, tenant_id: str, body: dict[str, Any]) -> dict[str, Any]:
    code = _currency_code(body.get("currency"))
    currency = await session.scalar(select(Currency).where(Currency.code == code, Currency.is_active.is_(True)))
    if currency is None:
        raise _invalid("This currency is not supported.")
    now = int(time.time())
    await session.execute(
        update(TenantCurrency)
        .where(TenantCurrency.tenant_id == tenant_id, TenantCurrency.is_default.is_(True))
        .values(is_default=False, updated_at=now)
    )
    link = await session.get(TenantCurrency, (tenant_id, code))
    if link is None:
        link = TenantCurrency(
            tenant_id=tenant_id,
            currency_code=code,
            is_default=True,
            is_enabled=True,
            created_at=now,
            updated_at=now,
        )
        session.add(link)
    else:
        link.is_default = True
        link.is_enabled = True
        link.updated_at = now
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        raise AppHTTPException(
            code="billing/tenant-not-found", message="The Billing workspace was not found.", http_status_code=404
        )
    tenant.default_currency = code
    tenant.updated_at = now
    await session.flush()
    return {"object": "tenant_currency", "currency": code}


async def update_currency(
    session: AsyncSession,
    tenant_id: str,
    code_value: str,
    body: dict[str, Any],
) -> dict[str, Any]:
    code = _currency_code(code_value)
    link = await session.get(TenantCurrency, (tenant_id, code))
    currency = await session.get(Currency, code)
    if link is None or currency is None:
        raise AppHTTPException(code="currency/not-found", message="Currency not found.", http_status_code=404)
    name = body.get("name")
    decimal_places = body.get("decimalPlaces")
    if (
        not isinstance(name, str)
        or not name.strip()
        or not isinstance(decimal_places, int)
        or not 0 <= decimal_places <= 4
    ):
        raise _invalid("Enter valid currency details.")
    currency.name = name.strip()
    currency.symbol = body.get("symbol")
    currency.decimal_places = decimal_places
    currency.updated_at = int(time.time())
    await session.flush()
    return {"object": "tenant_currency", "currency": code}


async def remove_currency(session: AsyncSession, tenant_id: str, code_value: str) -> dict[str, Any]:
    code = _currency_code(code_value)
    link = await session.get(TenantCurrency, (tenant_id, code))
    if link is None:
        raise AppHTTPException(code="currency/not-found", message="Currency not found.", http_status_code=404)
    if link.is_default:
        raise AppHTTPException(
            code="currency/default-cannot-delete",
            message="Cannot delete the default base currency.",
            http_status_code=400,
        )
    await session.delete(link)
    await session.flush()
    return {"object": "tenant_currency", "currency": code}


def currency_resource(link: TenantCurrency, currency: Currency) -> dict[str, Any]:
    return {
        "object": "currency",
        "currencyCode": link.currency_code,
        "isDefault": link.is_default,
        "isEnabled": link.is_enabled,
        "createdAt": link.created_at,
        "updatedAt": link.updated_at,
        "currency": {
            "code": currency.code,
            "name": currency.name,
            "symbol": currency.symbol,
            "decimalPlaces": currency.decimal_places,
            "isActive": currency.is_active,
        },
    }


def _currency_code(value: Any) -> str:
    if not isinstance(value, str) or len(value.strip()) != 3:
        raise _invalid("Enter a valid currency code.")
    return value.strip().upper()


def _invalid(message: str) -> AppHTTPException:
    return AppHTTPException(code="validation/invalid-request", message=message, http_status_code=422)
