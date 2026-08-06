"""Authorization on `POST /apps` (OAuth client registration).

Registration used to gate on the internal key only when `organizationId` was
absent, so naming an organization skipped authorization entirely. Because this
route has no session principal, it cannot establish that the caller may act for
the organization it names — and an app-key holder could therefore register a
client against an arbitrary organization and choose a first-party `appKind`,
which suppresses the OAuth consent screen. These tests pin the gate shut.
"""

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import require_api_key
from main import create_app

INTERNAL_KEY = "test-internal-key"

VALID_BODY: dict[str, Any] = {
    "name": "Acme Portal",
    "organizationId": "org_victim",
    "appKind": "internal",
    "clientType": "confidential",
    "redirectUris": ["https://acme.example.com/callback"],
}


def _assert_refused(response: Any) -> None:
    """Refusal is 401 without a principal, 403 with a non-admin one."""
    assert response.status_code in (401, 403)
    assert response.json()["error"]["code"] in ("auth/no-session", "auth/forbidden")


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def _app_with_api_key_only() -> Any:
    """An app whose only credential is a valid app API key — the SDK tier."""
    app = create_app(Settings(internal_key=INTERNAL_KEY))
    app.dependency_overrides[require_api_key] = lambda: True
    return app


@pytest.mark.asyncio
async def test_app_key_cannot_register_a_client_for_a_named_organization() -> None:
    async with _client(_app_with_api_key_only()) as client:
        response = await client.post("/apps", json=VALID_BODY)

    _assert_refused(response)


@pytest.mark.asyncio
async def test_app_key_cannot_register_an_organizationless_client() -> None:
    body = {key: value for key, value in VALID_BODY.items() if key != "organizationId"}

    async with _client(_app_with_api_key_only()) as client:
        response = await client.post("/apps", json=body)

    _assert_refused(response)


@pytest.mark.asyncio
@pytest.mark.parametrize("app_kind", ["internal", "platform", "product", "external"])
async def test_no_app_kind_is_reachable_without_the_internal_key(app_kind: str) -> None:
    """A first-party kind skips OAuth consent, so no app-tier caller may choose one."""
    async with _client(_app_with_api_key_only()) as client:
        response = await client.post("/apps", json={**VALID_BODY, "appKind": app_kind})

    _assert_refused(response)


@pytest.mark.asyncio
async def test_a_wrong_internal_key_is_refused() -> None:
    async with _client(_app_with_api_key_only()) as client:
        response = await client.post(
            "/apps",
            json=VALID_BODY,
            headers={"x-internal-key": "not-the-key"},
        )

    _assert_refused(response)


@pytest.mark.asyncio
async def test_registration_is_refused_when_no_internal_key_is_configured() -> None:
    """An empty server-side key must fail closed, never match an empty header."""
    app = create_app(Settings(internal_key=""))
    app.dependency_overrides[require_api_key] = lambda: True

    async with _client(app) as client:
        response = await client.post("/apps", json={**VALID_BODY, "x-internal-key": ""})

    _assert_refused(response)
