from __future__ import annotations

import hashlib
import hmac
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.errors import AppHTTPException
from core.identity import IdentityGateway, TokenIntrospection, get_identity_gateway
from core.logging import get_logger
from db.models import Tenant
from db.models.generated.enums import TenantStatus
from db.repositories.auth import AuthRepository
from db.session import get_db

logger = get_logger(__name__)
CredentialKind = Literal["internal", "scheduler", "app_api_key", "oauth"]


@dataclass(frozen=True)
class BillingPrincipal:
    kind: CredentialKind
    tenant_id: str | None = None
    organization_id: str | None = None
    user_id: str | None = None
    app_id: str | None = None
    scopes: frozenset[str] = frozenset()
    permissions: frozenset[str] = frozenset()
    platform_admin: bool = False


def get_auth_repository(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthRepository:
    return AuthRepository(db)


def _settings(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


def _secret_matches(presented: str, expected: str) -> bool:
    presented_digest = hashlib.sha256(presented.encode()).digest()
    expected_digest = hashlib.sha256(expected.encode()).digest()
    return hmac.compare_digest(presented_digest, expected_digest)


def _bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip() or None


def _credentials(request: Request) -> dict[CredentialKind, str]:
    values: dict[CredentialKind, str] = {}
    header_mapping: tuple[tuple[CredentialKind, str], ...] = (
        ("internal", "x-internal-key"),
        ("app_api_key", "x-876-api-key"),
        ("scheduler", "x-scheduler-key"),
    )
    for kind, header in header_mapping:
        value = request.headers.get(header)
        if value and value.strip():
            values[kind] = value.strip()
    bearer = _bearer_token(request)
    if bearer:
        values["oauth"] = bearer
    return values


def _require_single_credential(request: Request) -> tuple[CredentialKind, str]:
    credentials = _credentials(request)
    if not credentials:
        raise AppHTTPException(
            code="auth/missing-credential",
            message="An authentication credential is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if len(credentials) > 1:
        raise AppHTTPException(
            code="auth/ambiguous-credential",
            message="Use exactly one authentication credential.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    return next(iter(credentials.items()))


def require_internal_service(request: Request) -> BillingPrincipal:
    kind, presented = _require_single_credential(request)
    configured = _settings(request).internal_key
    if not configured:
        raise AppHTTPException(
            code="auth/internal-disabled",
            message="Internal service access is disabled.",
            http_status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if kind != "internal" or not _secret_matches(presented, configured):
        raise AppHTTPException(
            code="auth/invalid-internal-key",
            message="The internal service credential is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    principal = BillingPrincipal(kind="internal", platform_admin=True)
    request.state.billing_principal = principal
    return principal


def require_scheduler(request: Request) -> BillingPrincipal:
    kind, presented = _require_single_credential(request)
    configured = _settings(request).scheduler_key
    if not configured:
        raise AppHTTPException(
            code="auth/scheduler-disabled",
            message="Scheduler access is disabled.",
            http_status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if kind != "scheduler" or not _secret_matches(presented, configured):
        raise AppHTTPException(
            code="auth/invalid-scheduler-key",
            message="The scheduler credential is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    principal = BillingPrincipal(kind="scheduler")
    request.state.billing_principal = principal
    return principal


async def _active_tenant(repository: AuthRepository, organization_id: str) -> Tenant:
    tenant = await repository.tenant_by_organization_id(organization_id)
    if tenant is None or tenant.status != TenantStatus.ACTIVE:
        raise AppHTTPException(
            code="billing/tenant-not-found",
            message="The Billing workspace was not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return tenant


async def _active_oauth_identity(
    gateway: IdentityGateway,
    token: str,
    organization_id: str,
) -> TokenIntrospection:
    identity = await gateway.introspect(token)
    if not identity.active or not identity.subject:
        raise AppHTTPException(
            code="auth/invalid-token",
            message="The access token is invalid or expired.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if not await gateway.user_belongs_to_organization(token, organization_id):
        raise AppHTTPException(
            code="auth/organization-forbidden",
            message="The authenticated user cannot access this organization.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )
    return identity


def require_tenant_permission(permission: str) -> Callable[..., Awaitable[BillingPrincipal]]:
    async def dependency(
        request: Request,
        repository: Annotated[AuthRepository, Depends(get_auth_repository)],
        gateway: Annotated[IdentityGateway, Depends(get_identity_gateway)],
        organization_id: Annotated[
            str | None,
            Header(alias="X-Billing-Organization-Id"),
        ] = None,
    ) -> BillingPrincipal:
        kind, token = _require_single_credential(request)
        if kind != "oauth":
            raise AppHTTPException(
                code="auth/session-required",
                message="A delegated user access token is required.",
                http_status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if not organization_id:
            raise AppHTTPException(
                code="billing/organization-required",
                message="X-Billing-Organization-Id is required.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
        identity = await _active_oauth_identity(gateway, token, organization_id)
        tenant = await _active_tenant(repository, organization_id)
        member = await repository.active_member(tenant.id, identity.subject or "")
        if member is None or permission not in member.permissions:
            raise AppHTTPException(
                code="auth/forbidden",
                message="The authenticated user lacks the required Billing permission.",
                http_status_code=status.HTTP_403_FORBIDDEN,
            )
        principal = BillingPrincipal(
            kind="oauth",
            tenant_id=tenant.id,
            organization_id=organization_id,
            user_id=identity.subject,
            app_id=identity.app_id,
            scopes=identity.scopes,
            permissions=member.permissions,
        )
        request.state.billing_principal = principal
        return principal

    return dependency


async def require_organization_member(
    request: Request,
    gateway: Annotated[IdentityGateway, Depends(get_identity_gateway)],
    organization_id: Annotated[
        str | None,
        Header(alias="X-Billing-Organization-Id"),
    ] = None,
) -> BillingPrincipal:
    kind, token = _require_single_credential(request)
    if kind != "oauth":
        raise AppHTTPException(
            code="auth/session-required",
            message="A delegated user access token is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if not organization_id:
        raise AppHTTPException(
            code="billing/organization-required",
            message="X-Billing-Organization-Id is required.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    identity = await _active_oauth_identity(gateway, token, organization_id)
    principal = BillingPrincipal(
        kind="oauth",
        organization_id=organization_id,
        user_id=identity.subject,
        app_id=identity.app_id,
        scopes=identity.scopes,
    )
    request.state.billing_principal = principal
    return principal


def require_integration_scope(required_scope: str) -> Callable[..., Awaitable[BillingPrincipal]]:
    async def dependency(
        request: Request,
        repository: Annotated[AuthRepository, Depends(get_auth_repository)],
        gateway: Annotated[IdentityGateway, Depends(get_identity_gateway)],
    ) -> BillingPrincipal:
        organization_id = request.path_params.get("organizationId") or request.path_params.get("organization_id")
        if not organization_id:
            raise AppHTTPException(
                code="billing/organization-required",
                message="An organization path parameter is required.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
        kind, credential = _require_single_credential(request)
        if kind == "internal":
            internal = require_internal_service(request)
            tenant = await _active_tenant(repository, organization_id)
            principal = BillingPrincipal(
                kind=internal.kind,
                tenant_id=tenant.id,
                organization_id=organization_id,
                platform_admin=True,
            )
            request.state.billing_principal = principal
            return principal

        if kind == "app_api_key":
            app = await gateway.app_for_api_key(credential)
            if app is None:
                raise AppHTTPException(
                    code="auth/invalid-api-key",
                    message="The 876 app API key is invalid.",
                    http_status_code=status.HTTP_401_UNAUTHORIZED,
                )
            app_id = app.id
            subject = None
            token_scopes: frozenset[str] = frozenset()
        else:
            identity = await _active_oauth_identity(gateway, credential, organization_id)
            if not identity.app_id or required_scope not in identity.scopes:
                raise AppHTTPException(
                    code="auth/insufficient-scope",
                    message="The integration token lacks the required scope.",
                    http_status_code=status.HTTP_403_FORBIDDEN,
                )
            app_id = identity.app_id
            subject = identity.subject
            token_scopes = identity.scopes

        tenant = await _active_tenant(repository, organization_id)
        connection = await repository.active_connection(tenant.id, app_id)
        if connection is None or required_scope not in (connection.scopes or []):
            raise AppHTTPException(
                code="billing/connection-forbidden",
                message="The app finance connection lacks the required scope.",
                http_status_code=status.HTTP_403_FORBIDDEN,
            )
        principal = BillingPrincipal(
            kind=kind,
            tenant_id=tenant.id,
            organization_id=organization_id,
            user_id=subject,
            app_id=app_id,
            scopes=token_scopes,
        )
        request.state.billing_principal = principal
        return principal

    return dependency


InternalDep = Annotated[BillingPrincipal, Depends(require_internal_service)]
SchedulerDep = Annotated[BillingPrincipal, Depends(require_scheduler)]
