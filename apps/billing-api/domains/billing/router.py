from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import (
    require_integration_scope,
    require_internal_service,
    require_organization_member,
    require_tenant_permission,
)
from db.session import get_db
from domains.billing.contracts import RouteSpec
from domains.billing.dispatcher import dispatch
from domains.billing.generated_routes import ROUTES

router = APIRouter(tags=["Billing"])


def _endpoint(spec: RouteSpec) -> Callable[..., Awaitable[Any]]:
    async def endpoint(
        request: Request,
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> Any:
        return await dispatch(request, db, spec)

    endpoint.__name__ = _operation_id(spec)
    endpoint.__doc__ = f"Ported from `{spec.source}`."
    return endpoint


def _dependency(spec: RouteSpec) -> Any:
    if spec.auth_tier == "admin":
        return require_internal_service
    if spec.auth_tier == "integration":
        return require_integration_scope(spec.scope or "")
    if spec.path == "/tenants":
        return require_organization_member
    return require_tenant_permission(spec.permission or "billing:access")


def _operation_id(spec: RouteSpec) -> str:
    path = re.sub(r"[^a-zA-Z0-9]+", "_", spec.path).strip("_")
    return f"billing_{spec.method.lower()}_{path}"


def _openapi_security(spec: RouteSpec) -> list[dict[str, list[str]]]:
    if spec.auth_tier == "admin":
        return [{"internalKey": []}]
    if spec.auth_tier == "integration":
        scope = [spec.scope] if spec.scope else []
        return [{"internalKey": []}, {"appApiKey": []}, {"tenantOAuth": scope}]
    return [{"tenantOAuth": []}]


for route_spec in sorted(ROUTES, key=lambda item: (item.path.count("{"), item.path, item.method)):
    router.add_api_route(
        route_spec.path,
        _endpoint(route_spec),
        methods=[route_spec.method],
        dependencies=[Depends(_dependency(route_spec))],
        name=_operation_id(route_spec),
        summary=f"Billing {route_spec.method} {route_spec.path}",
        openapi_extra={"security": _openapi_security(route_spec)},
    )
