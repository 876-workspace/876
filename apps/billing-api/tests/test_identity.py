from __future__ import annotations

import httpx

from core.config import Settings
from core.identity import HTTPIdentityGateway


async def test_identity_gateway_uses_the_required_credential_tiers() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/apps/current":
            return httpx.Response(200, json={"data": {"id": "app_courier"}, "error": None})
        if request.url.path == "/oauth/introspect":
            return httpx.Response(
                200,
                json={
                    "data": {
                        "active": True,
                        "sub": "user_123",
                        "app_id": "app_courier",
                        "scope": "billing.customers.read billing.customers.write",
                    },
                    "error": None,
                },
            )
        return httpx.Response(
            200,
            json={
                "data": {
                    "object": "list",
                    "data": [
                        {
                            "status": "active",
                            "organization": {"id": "org_123", "status": "active"},
                        }
                    ],
                },
                "error": None,
            },
        )

    gateway = HTTPIdentityGateway(
        Settings(environment="test", identity_api_key="876_app_secret_billing"),
        transport=httpx.MockTransport(handler),
    )

    app = await gateway.app_for_api_key("876_app_secret_courier")
    token = await gateway.introspect("oauth_access_token")
    membership = await gateway.user_belongs_to_organization("oauth_access_token", "org_123")

    assert app is not None and app.id == "app_courier"
    assert token.active and token.subject == "user_123"
    assert token.scopes == {"billing.customers.read", "billing.customers.write"}
    assert membership is True
    assert requests[0].headers["x-876-api-key"] == "876_app_secret_courier"
    assert requests[1].headers["authorization"] == "Bearer 876_app_secret_billing"
    assert requests[1].content == b"token=oauth_access_token"
    assert requests[2].headers["authorization"] == "Bearer oauth_access_token"
    assert requests[2].headers["x-876-api-key"] == "876_app_secret_billing"

    # Pin the exact core paths. The core API mounts every router at the root
    # (no /api/v1 prefix), so a stray prefix here 404s and is misreported as an
    # invalid key — the original couriers "app API key is invalid" bug.
    assert [request.url.path for request in requests] == [
        "/apps/current",
        "/oauth/introspect",
        "/users/me/memberships",
    ]


async def test_identity_gateway_fails_closed_without_resource_server_key() -> None:
    gateway = HTTPIdentityGateway(
        Settings(environment="test", identity_api_key=""),
        transport=httpx.MockTransport(lambda request: httpx.Response(500)),
    )

    assert (await gateway.introspect("token")).active is False
    assert await gateway.user_belongs_to_organization("token", "org_123") is False
