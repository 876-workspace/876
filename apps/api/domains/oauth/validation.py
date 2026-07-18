from __future__ import annotations

import hmac
from dataclasses import dataclass
from typing import cast

from fastapi import Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.models import App
from utils.security_helpers import hash_client_secret, is_redirect_uri_safe


@dataclass(frozen=True)
class OAuthClientRequest:
    app: App
    scopes: list[str]


async def validate_oauth_client_request(
    db: AsyncSession,
    *,
    response_type: str,
    client_id: str,
    redirect_uri: str,
    scope: str | None = "openid",
    require_client_parameters: bool = False,
    response_type_error_code: str = "provider/invalid-request",
    response_type_error_message: str = "Invalid request parameters.",
    invalid_client_code: str = "provider/invalid-client",
    invalid_client_message: str = "The OAuth client is invalid.",
    invalid_client_status: int = status.HTTP_401_UNAUTHORIZED,
    validate_scopes: bool = True,
) -> OAuthClientRequest:
    if response_type != "code":
        raise AppHTTPException(
            code=response_type_error_code,
            message=response_type_error_message,
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    if require_client_parameters and (not client_id or not redirect_uri):
        raise AppHTTPException(
            code="provider/invalid-request",
            message="Invalid request parameters.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    stmt = select(App).where(App.client_id == client_id)
    app = (await db.scalars(stmt)).first()
    if not app:
        raise AppHTTPException(
            code=invalid_client_code,
            message=invalid_client_message,
            http_status_code=invalid_client_status,
        )

    if redirect_uri not in (app.allowed_redirect_uris or []) or not is_redirect_uri_safe(redirect_uri):
        raise AppHTTPException(
            code="provider/invalid-redirect-uri",
            message="The redirect URI is not registered for this app.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    scopes = (scope or "openid").split(" ")
    if validate_scopes:
        allowed_scopes = set(app.scopes_allowed or [])
        if any(s not in allowed_scopes for s in scopes):
            raise AppHTTPException(
                code="provider/invalid-scope",
                message="The requested scope is not allowed for this app.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

    return OAuthClientRequest(app=app, scopes=scopes)


def get_provider_issuer(request: Request) -> str:
    settings = request.app.state.settings
    issuer = settings.oauth_issuer or settings.next_public_site_url
    if not issuer:
        issuer = f"{request.url.scheme}://{request.url.netloc}"
    return cast(str, issuer).rstrip("/")


def is_client_secret_valid(app: App, client_secret: str | None) -> bool:
    requires_secret = (app.client_type == "confidential") or bool(app.client_secret_hash)
    if not requires_secret:
        return not client_secret
    if not client_secret or not app.client_secret_hash:
        return False
    return hmac.compare_digest(hash_client_secret(client_secret), app.client_secret_hash)
