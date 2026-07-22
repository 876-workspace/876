from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import httpx
from fastapi import Request

from core.config import Settings
from core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class IdentityApp:
    id: str


@dataclass(frozen=True)
class TokenIntrospection:
    active: bool
    subject: str | None = None
    app_id: str | None = None
    scopes: frozenset[str] = frozenset()


class IdentityGateway(Protocol):
    async def app_for_api_key(self, api_key: str) -> IdentityApp | None: ...

    async def introspect(self, token: str) -> TokenIntrospection: ...

    async def user_belongs_to_organization(self, token: str, organization_id: str) -> bool: ...


class HTTPIdentityGateway:
    """Narrow, fail-closed client for identity decisions owned by the core API."""

    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._base_url = settings.identity_api_url.rstrip("/")
        self._resource_server_key = settings.identity_api_key
        self._timeout = settings.identity_timeout_seconds
        self._transport = transport

    async def app_for_api_key(self, api_key: str) -> IdentityApp | None:
        payload = await self._request(
            "GET",
            "/api/v1/apps/current",
            headers={"x-876-api-key": api_key},
        )
        app_id = payload.get("id") if payload else None
        return IdentityApp(id=app_id) if isinstance(app_id, str) and app_id else None

    async def introspect(self, token: str) -> TokenIntrospection:
        if not self._resource_server_key:
            logger.error("identity.introspection.disabled", reason="missing_resource_server_key")
            return TokenIntrospection(active=False)
        payload = await self._request(
            "POST",
            "/api/v1/oauth/introspect",
            headers={"authorization": f"Bearer {self._resource_server_key}"},
            data={"token": token},
        )
        if not payload or payload.get("active") is not True:
            return TokenIntrospection(active=False)
        subject = payload.get("sub")
        app_id = payload.get("app_id")
        scope = payload.get("scope")
        return TokenIntrospection(
            active=True,
            subject=subject if isinstance(subject, str) else None,
            app_id=app_id if isinstance(app_id, str) else None,
            scopes=frozenset(scope.split()) if isinstance(scope, str) else frozenset(),
        )

    async def user_belongs_to_organization(self, token: str, organization_id: str) -> bool:
        if not self._resource_server_key:
            return False
        payload = await self._request(
            "GET",
            "/api/v1/users/me/memberships",
            headers={
                "authorization": f"Bearer {token}",
                "x-876-api-key": self._resource_server_key,
            },
            params={"status": "active"},
        )
        rows = payload.get("data") if payload else None
        if not isinstance(rows, list):
            return False
        return any(
            isinstance(row, dict)
            and isinstance(row.get("organization"), dict)
            and row["organization"].get("id") == organization_id
            and row["organization"].get("status") == "active"
            for row in rows
        )

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any] | None:
        try:
            async with httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self._timeout,
                transport=self._transport,
            ) as client:
                response = await client.request(method, path, **kwargs)
            if response.status_code >= 400:
                logger.warning("identity.request.rejected", path=path, status=response.status_code)
                return None
            raw = response.json()
        except (httpx.HTTPError, ValueError):
            logger.error("identity.request.failed", path=path, exc_info=True)
            return None
        if not isinstance(raw, dict):
            return None
        data = raw.get("data") if "data" in raw else raw
        return data if isinstance(data, dict) else None


def get_identity_gateway(request: Request) -> IdentityGateway:
    override = getattr(request.app.state, "identity_gateway", None)
    if override is not None:
        return override  # type: ignore[no-any-return]
    return HTTPIdentityGateway(request.app.state.settings)
