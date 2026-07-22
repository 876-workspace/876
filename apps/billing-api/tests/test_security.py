from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace
from typing import Annotated

from fastapi import Depends
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.identity import IdentityApp, TokenIntrospection, get_identity_gateway
from core.security import (
    BillingPrincipal,
    get_auth_repository,
    require_integration_scope,
    require_internal_service,
    require_scheduler,
    require_tenant_permission,
)
from db.models.generated.enums import TenantStatus
from db.repositories.auth import MemberAuthorization
from main import create_app


@dataclass
class FakeIdentityGateway:
    app: IdentityApp | None = IdentityApp("app_courier")
    introspection: TokenIntrospection = TokenIntrospection(
        active=True,
        subject="user_123",
        app_id="app_courier",
        scopes=frozenset({"billing.customers.read"}),
    )
    member: bool = True

    async def app_for_api_key(self, api_key: str) -> IdentityApp | None:
        return self.app if api_key == "876_app_secret_valid" else None

    async def introspect(self, token: str) -> TokenIntrospection:
        return self.introspection if token == "oauth_valid" else TokenIntrospection(active=False)

    async def user_belongs_to_organization(self, token: str, organization_id: str) -> bool:
        return self.member and token == "oauth_valid" and organization_id == "org_123"


class FakeAuthRepository:
    def __init__(self) -> None:
        self.tenant = SimpleNamespace(id="btenant_123", status=TenantStatus.ACTIVE)
        self.connection = SimpleNamespace(scopes=["billing.customers.read"])
        self.member = MemberAuthorization("user_123", frozenset({"billing:access", "customers:read"}))

    async def tenant_by_organization_id(self, organization_id: str):
        return self.tenant if organization_id == "org_123" else None

    async def active_connection(self, tenant_id: str, app_id: str):
        if tenant_id == "btenant_123" and app_id == "app_courier":
            return self.connection
        return None

    async def active_member(self, tenant_id: str, user_id: str):
        if tenant_id == "btenant_123" and user_id == "user_123":
            return self.member
        return None


def auth_test_app(
    repository: FakeAuthRepository | None = None,
    identity: FakeIdentityGateway | None = None,
):
    app = create_app(
        Settings(
            environment="test",
            internal_key="internal-secret",
            scheduler_key="scheduler-secret",
        )
    )
    repository = repository or FakeAuthRepository()
    identity = identity or FakeIdentityGateway()
    app.dependency_overrides[get_auth_repository] = lambda: repository
    app.dependency_overrides[get_identity_gateway] = lambda: identity

    @app.get("/api/v1/_test/internal")
    async def internal(principal: Annotated[BillingPrincipal, Depends(require_internal_service)]):
        return {"kind": principal.kind, "admin": principal.platform_admin}

    @app.get("/api/v1/_test/scheduler")
    async def scheduler(principal: Annotated[BillingPrincipal, Depends(require_scheduler)]):
        return {"kind": principal.kind}

    @app.get("/api/v1/_test/tenant")
    async def tenant(
        principal: Annotated[
            BillingPrincipal,
            Depends(require_tenant_permission("customers:read")),
        ],
    ):
        return {"tenantId": principal.tenant_id, "userId": principal.user_id}

    @app.get("/api/v1/_test/integrations/{organizationId}")
    async def integration(
        organizationId: str,
        principal: Annotated[
            BillingPrincipal,
            Depends(require_integration_scope("billing.customers.read")),
        ],
    ):
        return {"tenantId": principal.tenant_id, "appId": principal.app_id, "kind": principal.kind}

    return app


async def test_internal_and_scheduler_credentials_are_isolated() -> None:
    transport = ASGITransport(app=auth_test_app())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        internal = await client.get("/api/v1/_test/internal", headers={"x-internal-key": "internal-secret"})
        wrong_tier = await client.get("/api/v1/_test/scheduler", headers={"x-internal-key": "internal-secret"})
        scheduler = await client.get("/api/v1/_test/scheduler", headers={"x-scheduler-key": "scheduler-secret"})

    assert internal.status_code == 200
    assert internal.json()["data"] == {"kind": "internal", "admin": True}
    assert wrong_tier.status_code == 401
    assert wrong_tier.json()["error"]["code"] == "auth/invalid-scheduler-key"
    assert scheduler.status_code == 200
    assert scheduler.json()["data"] == {"kind": "scheduler"}


async def test_multiple_credentials_are_rejected_before_authorization() -> None:
    transport = ASGITransport(app=auth_test_app())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/_test/internal",
            headers={"x-internal-key": "internal-secret", "authorization": "Bearer oauth_valid"},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "auth/ambiguous-credential"

    transport = ASGITransport(app=auth_test_app())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        cross_tier = await client.get(
            "/api/v1/_test/internal",
            headers={
                "x-internal-key": "internal-secret",
                "x-scheduler-key": "scheduler-secret",
            },
        )

    assert cross_tier.status_code == 400
    assert cross_tier.json()["error"]["code"] == "auth/ambiguous-credential"


async def test_tenant_access_requires_identity_membership_and_local_permission() -> None:
    transport = ASGITransport(app=auth_test_app())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/_test/tenant",
            headers={
                "authorization": "Bearer oauth_valid",
                "x-billing-organization-id": "org_123",
            },
        )

    assert response.status_code == 200
    assert response.json()["data"] == {"tenantId": "btenant_123", "userId": "user_123"}


async def test_tenant_access_fails_closed_when_identity_membership_is_missing() -> None:
    transport = ASGITransport(app=auth_test_app(identity=FakeIdentityGateway(member=False)))
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/_test/tenant",
            headers={
                "authorization": "Bearer oauth_valid",
                "x-billing-organization-id": "org_123",
            },
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "auth/organization-forbidden"


async def test_app_key_integration_requires_active_finance_connection_scope() -> None:
    transport = ASGITransport(app=auth_test_app())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/_test/integrations/org_123",
            headers={"x-876-api-key": "876_app_secret_valid"},
        )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "tenantId": "btenant_123",
        "appId": "app_courier",
        "kind": "app_api_key",
    }


async def test_invalid_internal_key_is_checked_before_tenant_lookup() -> None:
    repository = FakeAuthRepository()
    repository.tenant = None
    transport = ASGITransport(app=auth_test_app(repository=repository))
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/_test/integrations/org_missing",
            headers={"x-internal-key": "wrong-secret"},
        )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth/invalid-internal-key"


async def test_oauth_integration_requires_token_and_connection_scopes() -> None:
    identity = FakeIdentityGateway(
        introspection=TokenIntrospection(
            active=True,
            subject="user_123",
            app_id="app_courier",
            scopes=frozenset(),
        )
    )
    transport = ASGITransport(app=auth_test_app(identity=identity))
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/_test/integrations/org_123",
            headers={"authorization": "Bearer oauth_valid"},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "auth/insufficient-scope"
