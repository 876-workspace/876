from __future__ import annotations

import time
from typing import Any, cast

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from core.errors import AppHTTPException
from core.security import BillingPrincipal
from db.models import (
    AppFinanceConnection,
    CreditNote,
    Customer,
    Estimate,
    Invoice,
    InvoicePreference,
    Payment,
    Quote,
    Subscription,
    Tenant,
)
from db.models.generated.enums import InvoiceStatus, SubscriptionStatus
from domains.billing.contracts import RouteSpec
from domains.billing.idempotency import integration_create_body
from domains.billing.resources import ResourceDefinition, ResourceService, resource_for_path, serialize_resource
from domains.billing.workflows.actions import (
    record_opening_balance,
    resolve_price,
    save_addon_associations,
    subscription_preview,
    update_invoice_modes,
)
from domains.billing.workflows.credits import apply_credit_note, void_credit_note
from domains.billing.workflows.currencies import (
    create_currency,
    list_currencies,
    remove_currency,
    set_default_currency,
    update_currency,
)
from domains.billing.workflows.documents import create_document
from domains.billing.workflows.engine import bill_subscription, run_billing_sweep
from domains.billing.workflows.late_fees import assess_late_fees
from domains.billing.workflows.payments import apply_payment, cancel_payment, create_payment

ACTION_SEGMENTS = {
    "account",
    "amendments",
    "apply",
    "assess-late-fees",
    "associations",
    "bill",
    "cancel",
    "clone",
    "ensure",
    "extend",
    "finalize",
    "import",
    "invoice-modes",
    "link",
    "opening-balance",
    "pause",
    "preview-proration",
    "reactivate",
    "resolve",
    "resume",
    "run",
    "stats",
    "unlink",
    "upcoming-invoice",
    "void",
}
SINGLETON_PATHS = {"/invoice-preferences", "/subscription-preferences"}
INTEGRATION_CREATE_PATHS = {
    "/integrations/organizations/{organizationId}/customers",
    "/integrations/organizations/{organizationId}/invoices",
    "/integrations/organizations/{organizationId}/items",
    "/integrations/organizations/{organizationId}/payments",
}


async def dispatch(request: Request, session: AsyncSession, spec: RouteSpec) -> Any:
    principal: BillingPrincipal | None = getattr(request.state, "billing_principal", None)
    if principal is None:
        raise AppHTTPException(
            code="auth/missing-principal", message="Authentication is required.", http_status_code=401
        )

    body = await _json_body(request)
    if spec.path in INTEGRATION_CREATE_PATHS and request.method == "POST":
        body = integration_create_body(request, principal, body)
    elif spec.auth_tier == "tenant":
        for attribution_key in ("sourceAppId", "sourceIdempotencyKey", "sourcePayloadHash"):
            body.pop(attribution_key, None)

    if spec.path == "/integrations/organizations/{organizationId}":
        return await _organization_resource(session, principal)
    if spec.path.startswith("/admin/stats/apps"):
        return await _app_stats(session, request.path_params.get("sourceAppId"))
    if spec.path == "/admin/billing/run":
        return await run_billing_sweep(
            session,
            as_of=_optional_integer(body.get("asOf"), "asOf"),
            limit=_optional_integer(body.get("limit"), "limit") or 100,
        )
    if spec.path == "/currencies":
        if principal.tenant_id is None:
            raise AppHTTPException(
                code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
            )
        if request.method == "GET":
            return await list_currencies(session, principal.tenant_id, request.url.path)
        if request.method == "POST":
            return JSONResponse(await create_currency(session, principal.tenant_id, body), status_code=201)
        return await set_default_currency(session, principal.tenant_id, body)
    if spec.path == "/currencies/{code}":
        if principal.tenant_id is None:
            raise AppHTTPException(
                code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
            )
        if request.method == "PATCH":
            return await update_currency(session, principal.tenant_id, request.path_params["code"], body)
        return await remove_currency(session, principal.tenant_id, request.path_params["code"])

    definition = resource_for_path(spec.path)
    if definition is None:
        raise AppHTTPException(
            code="billing/unsupported-operation",
            message="The Billing operation has no resource mapping.",
            http_status_code=501,
        )
    service = ResourceService(session)
    tenant_id = principal.tenant_id
    path_params = dict(request.path_params)
    query_params = dict(request.query_params)
    query_params["_request_path"] = request.url.path

    if spec.path == "/tenants" and request.method == "POST":
        body.setdefault("organizationId", principal.organization_id)
        body.setdefault("provisionedAt", int(time.time()))
        body.setdefault("provisioningVersion", 3)
        return await _created(service, definition, None, body, path_params)
    if "/admin/" in spec.path and spec.path.endswith("/ensure"):
        return await _ensure(service, definition, body, path_params)
    if spec.path == "/customers/import":
        return await _import_customers(service, definition, tenant_id, body, path_params)

    final_segment = spec.path.rsplit("/", 1)[-1]
    if final_segment in ACTION_SEGMENTS:
        return await _action(service, definition, tenant_id, body, path_params, final_segment)

    singleton = spec.path in SINGLETON_PATHS
    detail = final_segment.startswith("{") or singleton
    if request.method == "GET":
        if detail:
            row = await service.retrieve(definition, tenant_id, path_params)
            return serialize_resource(row, definition.object_name)
        return await service.list(definition, tenant_id, path_params, query_params)
    if request.method == "POST":
        return await _created(service, definition, tenant_id, body, path_params)
    if request.method in {"PATCH", "PUT"}:
        row = await service.update(definition, tenant_id, body, path_params)
        return serialize_resource(row, definition.object_name)
    if request.method == "DELETE":
        if definition.model is Payment:
            if tenant_id is None:
                raise AppHTTPException(
                    code="billing/tenant-required",
                    message="A Billing tenant is required.",
                    http_status_code=400,
                )
            row = await cancel_payment(session, tenant_id, path_params["paymentId"])
            return {"object": "payment", "id": row.id, "deleted": True}
        return await service.delete(definition, tenant_id, path_params)

    raise AppHTTPException(code="billing/method-not-allowed", message="Method not allowed.", http_status_code=405)


async def _created(
    service: ResourceService,
    definition: ResourceDefinition,
    tenant_id: str | None,
    body: dict[str, Any],
    path_params: dict[str, str],
) -> JSONResponse:
    source_app_id = body.get("sourceAppId")
    idempotency_key = body.get("sourceIdempotencyKey")
    payload_hash = body.get("sourcePayloadHash")
    if tenant_id and source_app_id and idempotency_key:
        existing = await service.find_idempotent(definition, tenant_id, source_app_id, idempotency_key)
        if existing is not None:
            existing_hash = getattr(existing, "source_payload_hash", None)
            if existing_hash != payload_hash:
                raise AppHTTPException(
                    code="billing/idempotency-conflict",
                    message="The idempotency key was already used with a different payload.",
                    http_status_code=409,
                )
            return JSONResponse(serialize_resource(existing, definition.object_name), status_code=200)
    row: DeclarativeBase
    if definition.model is Payment:
        if tenant_id is None:
            raise AppHTTPException(
                code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
            )
        row = await create_payment(service, definition, tenant_id, body)
    elif definition.model in {Invoice, Quote, Estimate}:
        if tenant_id is None:
            raise AppHTTPException(
                code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
            )
        row = await create_document(service, definition, tenant_id, body)
    else:
        row = await service.create(definition, tenant_id, body, path_params)
    return JSONResponse(serialize_resource(row, definition.object_name), status_code=201)


async def _ensure(
    service: ResourceService,
    definition: ResourceDefinition,
    body: dict[str, Any],
    path_params: dict[str, str],
) -> dict[str, Any]:
    tenant_id = body.get("tenantId")
    identifier = body.get("id")
    if identifier:
        path_params = {**path_params, f"{definition.object_name}Id": str(identifier)}
        try:
            row = await service.update(definition, tenant_id, body, path_params)
            return {"object": "acknowledgement", "id": getattr(row, definition.id_attribute), "created": False}
        except AppHTTPException as exc:
            if exc.status_code != 404:
                raise
    row = await service.create(definition, tenant_id, body, path_params)
    return {"object": "acknowledgement", "id": getattr(row, definition.id_attribute), "created": True}


async def _import_customers(
    service: ResourceService,
    definition: ResourceDefinition,
    tenant_id: str | None,
    body: dict[str, Any],
    path_params: dict[str, str],
) -> dict[str, Any]:
    rows = body.get("customers") or body.get("data") or []
    if not isinstance(rows, list):
        raise AppHTTPException(
            code="validation/invalid-request", message="customers must be a list.", http_status_code=422
        )
    created = []
    for item in rows:
        if isinstance(item, dict):
            created.append(await service.create(definition, tenant_id, item, path_params))
    return {
        "object": "customer_import",
        "created": len(created),
        "customers": [serialize_resource(row, "customer") for row in created],
    }


async def _action(
    service: ResourceService,
    definition: ResourceDefinition,
    tenant_id: str | None,
    body: dict[str, Any],
    path_params: dict[str, str],
    action: str,
) -> Any:
    if action == "clone":
        source = await service.retrieve(definition, tenant_id, path_params)
        clone_body = {
            attribute.key: getattr(source, attribute.key)
            for attribute in source.__mapper__.column_attrs
            if attribute.key not in {"id", "tenant_id", "created_at", "updated_at"}
        }
        clone_body.update(body)
        row = await service.create(definition, tenant_id, clone_body, {})
        return JSONResponse(serialize_resource(row, definition.object_name), status_code=201)

    if action in {"finalize", "void"} and definition.model is Invoice:
        row = cast(Invoice, await service.retrieve(definition, tenant_id, path_params))
        now = int(time.time())
        if action == "finalize":
            if row.status != InvoiceStatus.DRAFT:
                raise AppHTTPException(
                    code="invoice/invalid-state", message="Only draft invoices can be finalized.", http_status_code=409
                )
            row.status = InvoiceStatus.OPEN
            row.finalized_at = now
            row.issue_at = row.issue_at or now
            row.amount_due = max(row.total_amount - row.amount_paid - row.amount_credited, 0)
        else:
            if row.status == InvoiceStatus.PAID:
                raise AppHTTPException(
                    code="invoice/invalid-state", message="A paid invoice cannot be voided.", http_status_code=409
                )
            row.status = InvoiceStatus.VOID
            row.voided_at = now
            row.amount_due = 0
        row.updated_at = now
        await service.session.flush()
        return serialize_resource(row, definition.object_name)

    if definition.model is Subscription and action in {"cancel", "pause", "reactivate", "resume", "extend"}:
        row = cast(Subscription, await service.retrieve(definition, tenant_id, path_params))
        now = int(time.time())
        if action == "pause":
            row.status, row.paused_at = SubscriptionStatus.PAUSED, now
        elif action == "cancel":
            row.status, row.canceled_at = SubscriptionStatus.CANCELED, now
        elif action in {"reactivate", "resume"}:
            row.status, row.paused_at, row.canceled_at = SubscriptionStatus.ACTIVE, None, None
        elif action == "extend":
            row.expires_at = body.get("expiresAt", row.expires_at)
        row.updated_at = now
        await service.session.flush()
        return serialize_resource(row, definition.object_name)

    if action == "account" and definition.model is Customer:
        customer = cast(Customer, await service.retrieve(definition, tenant_id, path_params))
        return {
            "object": "customer_account",
            "customer": serialize_resource(customer, "customer"),
            "outstandingReceivable": str(customer.outstanding_receivable),
            "unusedCredits": str(customer.unused_credits),
            "entries": [],
        }

    if action in {"link", "unlink"} and definition.model is Customer:
        update = body if action == "link" else {"organizationId": None, "userId": None, "customerType": "EXTERNAL"}
        row = await service.update(definition, tenant_id, update, path_params)
        return serialize_resource(row, definition.object_name)

    if action == "associations" and tenant_id is not None:
        return await save_addon_associations(service.session, tenant_id, path_params["addonId"], body)

    if action == "opening-balance" and tenant_id is not None:
        return await record_opening_balance(service.session, tenant_id, path_params["customerId"], body)

    if action == "invoice-modes" and tenant_id is not None:
        return await update_invoice_modes(service.session, tenant_id, body)

    if action == "resolve" and tenant_id is not None:
        return await resolve_price(service.session, tenant_id, body)

    if action == "upcoming-invoice" and tenant_id is not None:
        return await subscription_preview(service.session, tenant_id, path_params["subscriptionId"])

    if action == "preview-proration" and tenant_id is not None:
        return await subscription_preview(service.session, tenant_id, path_params["subscriptionId"], body)

    if action == "assess-late-fees" and definition.model is InvoicePreference and tenant_id is not None:
        return await assess_late_fees(
            service.session,
            tenant_id,
            as_of=_optional_integer(body.get("asOf"), "asOf"),
        )

    if action == "bill" and definition.model is Subscription and tenant_id is not None:
        result = await bill_subscription(
            service.session,
            tenant_id,
            path_params["subscriptionId"],
            as_of=_optional_integer(body.get("asOf"), "asOf"),
        )
        return {"object": "subscription_billing_result", "status": result.status, "invoiceId": result.invoice_id}

    if action == "apply" and definition.model is Payment:
        if tenant_id is None:
            raise AppHTTPException(
                code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
            )
        row = await apply_payment(service.session, tenant_id, path_params["paymentId"], body)
        return {"object": "payment", "id": row.id}

    if action in {"apply", "void"} and definition.model is CreditNote:
        if tenant_id is None:
            raise AppHTTPException(
                code="billing/tenant-required", message="A Billing tenant is required.", http_status_code=400
            )
        if action == "apply":
            row = await apply_credit_note(service.session, tenant_id, path_params["creditNoteId"], body)
        else:
            row = await void_credit_note(service.session, tenant_id, path_params["creditNoteId"])
        return {"object": "credit_note", "id": row.id}

    raise AppHTTPException(
        code="billing/unsupported-action",
        message=f"The {action} action is not implemented.",
        http_status_code=501,
    )


async def _organization_resource(session: AsyncSession, principal: BillingPrincipal) -> dict[str, Any]:
    tenant = await session.scalar(select(Tenant).where(Tenant.id == principal.tenant_id))
    if tenant is None:
        raise AppHTTPException(
            code="billing/tenant-not-found", message="The Billing workspace was not found.", http_status_code=404
        )
    return serialize_resource(tenant, "billing_tenant")


async def _app_stats(session: AsyncSession, source_app_id: str | None) -> dict[str, Any]:
    connection_filter = [] if source_app_id is None else [AppFinanceConnection.source_app_id == source_app_id]
    customer_filter = [] if source_app_id is None else [Customer.source_app_id == source_app_id]
    invoice_filter = [] if source_app_id is None else [Invoice.source_app_id == source_app_id]
    subscription_filter = [] if source_app_id is None else [Subscription.source_app_id == source_app_id]
    connections = await session.scalar(select(func.count()).select_from(AppFinanceConnection).where(*connection_filter))
    customers = await session.scalar(select(func.count()).select_from(Customer).where(*customer_filter))
    invoices = await session.scalar(select(func.count()).select_from(Invoice).where(*invoice_filter))
    subscriptions = await session.scalar(select(func.count()).select_from(Subscription).where(*subscription_filter))
    return {
        "object": "billing_app_stats",
        "sourceAppId": source_app_id,
        "connections": connections or 0,
        "customers": customers or 0,
        "invoices": invoices or 0,
        "subscriptions": subscriptions or 0,
    }


async def _json_body(request: Request) -> dict[str, Any]:
    if request.method in {"GET", "DELETE"}:
        return {}
    try:
        body = await request.json()
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        raise AppHTTPException(
            code="validation/invalid-request", message="A JSON object is required.", http_status_code=422
        )
    return body


def _optional_integer(value: Any, field: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise AppHTTPException(
            code="validation/invalid-request",
            message=f"{field} must be a positive integer.",
            http_status_code=422,
        )
    return int(value)
