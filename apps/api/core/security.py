import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.logging import bind_actor, get_logger
from db.repositories.api_keys import ApiKeyRepository
from db.session import get_db

logger = get_logger(__name__)


def _client_ip(request: Request) -> str | None:
    client = getattr(request, "client", None)
    host = getattr(client, "host", None)
    return host if isinstance(host, str) else None


def _request_path(request: Request) -> str | None:
    url = getattr(request, "url", None)
    path = getattr(url, "path", None)
    return path if isinstance(path, str) else None


@dataclass
class Principal:
    user_id: str | None = None
    app_id: str | None = None
    api_key_id: str | None = None
    internal: bool = False
    realm: str = "consumer"
    org_id: str | None = None
    cross_realm: bool = False


async def resolve_internal_key(
    x_internal_key: Annotated[str | None, Header(include_in_schema=False)] = None,
) -> str | None:
    return x_internal_key


async def resolve_bearer_token(
    authorization: Annotated[str | None, Header(include_in_schema=False)] = None,
) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[len("Bearer ") :].strip() or None


async def resolve_api_key(
    authorization: Annotated[str | None, Header(include_in_schema=False)] = None,
    x_876_api_key: Annotated[str | None, Header(include_in_schema=False)] = None,
    x_api_key: Annotated[str | None, Header(include_in_schema=False)] = None,
) -> str | None:
    if x_876_api_key:
        return x_876_api_key.strip() or None
    if x_api_key:
        return x_api_key.strip() or None
    if authorization and authorization.startswith("Bearer 876_app_secret_"):
        return authorization[len("Bearer ") :].strip() or None
    return None


def _get_settings() -> Any:
    import importlib

    m = importlib.import_module("core.config")
    return m.get_settings()


async def resolve_principal(
    request: Request,
    internal_key: Annotated[str | None, Depends(resolve_internal_key)] = None,
    bearer_token: Annotated[str | None, Depends(resolve_bearer_token)] = None,
) -> Principal:
    from domains.oauth.tokens import verify_provider_jwt

    settings = getattr(request.app.state, "settings", None) or _get_settings()
    if (
        settings.internal_key
        and internal_key
        and hmac.compare_digest(internal_key, settings.internal_key)
    ):
        bind_actor(internal=True)
        return Principal(internal=True)
    if bearer_token:
        claims = verify_provider_jwt(bearer_token, settings)
        if not claims or not claims.get("sub"):
            logger.warning(
                "auth.bearer.rejected",
                reason="invalid_or_expired",
                path=request.url.path,
            )
            raise AppHTTPException(
                code="auth/invalid-token",
                message="The bearer token is invalid or expired.",
                http_status_code=status.HTTP_401_UNAUTHORIZED,
            )
        # Only access tokens carry a user session. id tokens (token_use="id")
        # are for the client to read identity claims, and client-credentials
        # tokens (token_use="service") have an app — not a user — as their
        # subject. Accepting either here would let any OAuth token a client
        # holds stand in for the user's first-party session, ignoring the
        # scopes the user actually consented to.
        if claims.get("token_use") != "access":
            logger.warning(
                "auth.bearer.rejected",
                reason="wrong_token_use",
                token_use=claims.get("token_use"),
                sub=claims.get("sub"),
                aud=claims.get("aud"),
            )
            raise AppHTTPException(
                code="auth/invalid-token",
                message="The bearer token cannot be used to authorize this request.",
                http_status_code=status.HTTP_401_UNAUTHORIZED,
            )
        bind_actor(
            user_id=claims["sub"],
            app_id=claims.get("aud"),
            realm=claims.get("realm", "consumer"),
        )
        return Principal(
            user_id=claims["sub"],
            app_id=claims.get("aud"),
            realm=claims.get("realm", "consumer"),
            org_id=claims.get("org_id"),
        )
    return Principal()


async def require_api_key(
    request: Request,
    api_key: Annotated[str | None, Depends(resolve_api_key)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> bool:
    request.state.app_id = None
    request.state.api_key_id = None

    if not api_key:
        logger.warning(
            "api_key.rejected", reason="missing", path=_request_path(request), client_ip=_client_ip(request)
        )
        raise AppHTTPException(
            code="api-key/missing",
            message="An API key is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    if not api_key.startswith("876_app_secret_"):
        logger.warning(
            "api_key.rejected",
            reason="bad_prefix",
            path=_request_path(request),
            client_ip=_client_ip(request),
        )
        raise AppHTTPException(
            code="api-key/invalid",
            message="Invalid API key.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
    record = await ApiKeyRepository(db).get_by_hash(key_hash)
    if not record:
        # A non-reversible fingerprint lets operators correlate repeated bad
        # keys without ever writing the raw secret to logs.
        logger.warning(
            "api_key.rejected",
            reason="unknown",
            key_fp=key_hash[:12],
            path=_request_path(request),
            client_ip=_client_ip(request),
        )
        raise AppHTTPException(
            code="api-key/invalid",
            message="Invalid API key.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if record.revoked:
        logger.warning(
            "api_key.rejected",
            reason="revoked",
            api_key_id=record.id,
            app_id=record.app_id,
            client_ip=_client_ip(request),
        )
        raise AppHTTPException(
            code="api-key/revoked",
            message="API key has been revoked.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if record.expires_at and record.expires_at < int(time.time()):
        logger.warning(
            "api_key.rejected",
            reason="expired",
            api_key_id=record.id,
            app_id=record.app_id,
            expires_at=record.expires_at,
            client_ip=_client_ip(request),
        )
        raise AppHTTPException(
            code="api-key/expired",
            message="API key has expired.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    record.last_used_at = int(time.time())
    await db.flush()

    request.state.app_id = record.app_id
    request.state.api_key_id = record.id
    bind_actor(app_id=record.app_id, api_key_id=record.id)
    return True


async def require_admin(
    principal: Annotated[Principal, Depends(resolve_principal)],
) -> Principal:
    if principal.internal:
        return principal
    if principal.user_id:
        logger.warning(
            "admin.denied",
            reason="non_internal_principal",
            user_id=principal.user_id,
            realm=principal.realm,
            app_id=principal.app_id,
        )
        raise AppHTTPException(
            code="auth/forbidden",
            message="Forbidden.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )
    raise AppHTTPException(
        code="auth/no-session",
        message="No active session.",
        http_status_code=status.HTTP_401_UNAUTHORIZED,
    )


async def require_session(
    principal: Annotated[Principal, Depends(resolve_principal)],
) -> Principal:
    if principal.internal:
        return principal
    if principal.user_id:
        return principal
    raise AppHTTPException(
        code="auth/no-session",
        message="No active session.",
        http_status_code=status.HTTP_401_UNAUTHORIZED,
    )


def _require_realm(realm: str) -> Any:
    """Build a session dependency that also enforces the caller's identity realm.

    Consumer and enterprise are separate identities; a consumer session must not
    reach enterprise-scoped APIs and vice versa. The internal key (server-to-
    server, AdminDep tier) bypasses the realm check. Realm is read from the
    `Principal` (OAuth bearer claims); first-party apps additionally gate realm
    in their proxy/RSC layer from the sealed cookie snapshot.
    """

    async def dependency(
        principal: Annotated[Principal, Depends(require_session)],
    ) -> Principal:
        if principal.internal:
            return principal
        # Cross-realm accounts (owner + chosen admins) bypass the realm gate.
        if principal.cross_realm:
            return principal
        if principal.realm != realm:
            logger.warning(
                "auth.realm.denied",
                required_realm=realm,
                actual_realm=principal.realm,
                user_id=principal.user_id,
            )
            raise AppHTTPException(
                code="auth/wrong-realm",
                message="This account cannot access this resource.",
                http_status_code=status.HTTP_403_FORBIDDEN,
            )
        return principal

    return dependency


require_consumer_session = _require_realm("consumer")
require_enterprise_session = _require_realm("enterprise")


# Annotated type aliases for cleaner route signatures
ApiKeyDep = Annotated[bool, Depends(require_api_key)]
SessionDep = Annotated[Principal, Depends(require_session)]
ConsumerSessionDep = Annotated[Principal, Depends(require_consumer_session)]
EnterpriseSessionDep = Annotated[Principal, Depends(require_enterprise_session)]
AdminDep = Annotated[Principal, Depends(require_admin)]
