from __future__ import annotations

import time
from typing import Any

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from core.logging import get_logger
from db.models import App, OauthRefreshToken, Session, User
from domains.oauth.errors import make_oauth_error
from domains.oauth.schemas import TokenResponse
from domains.oauth.scopes import grants_offline_access, resolve_identity_claims
from domains.oauth.tokens import generate_provider_token, sha256_hash, sign_provider_jwt
from domains.oauth.validation import get_provider_issuer, is_client_secret_valid

logger = get_logger(__name__)


async def issue_token_response(
    request: Request,
    db: AsyncSession,
    *,
    app: App,
    user: User,
    scope: str,
    nonce: str | None,
    auth_time: int | None,
    org_id: str | None = None,
) -> TokenResponse:
    """Mint an access token (+ optional id/refresh tokens) and persist the session.

    `auth_time` is when the user authenticated: pass it for the initial code
    exchange so an OIDC id token is issued, and `None` on refresh (no new id token).
    A refresh token is issued only when `offline_access` is among the scopes.
    """
    settings = request.app.state.settings
    issuer = get_provider_issuer(request)
    now = int(time.time())
    session_id = generate_id("session")
    expires_in = settings.oauth_access_token_ttl_seconds
    expires_at = now + expires_in
    granted_scopes = scope.split()

    realm = "enterprise" if org_id else "consumer"
    access_claims: dict[str, Any] = {
        "iss": issuer,
        "sub": user.id,
        "aud": app.client_id,
        "exp": expires_at,
        "iat": now,
        "sid": session_id,
        "scope": scope,
        "token_use": "access",
        "realm": realm,
    }
    if org_id:
        access_claims["org_id"] = org_id
    access_token = sign_provider_jwt(access_claims, settings)

    id_token: str | None = None
    if auth_time is not None and "openid" in granted_scopes:
        id_claims: dict[str, Any] = {
            "iss": issuer,
            "sub": user.id,
            "aud": app.client_id,
            "exp": expires_at,
            "iat": now,
            "sid": session_id,
            "token_use": "id",
            "nonce": nonce,
            "auth_time": int(auth_time),
            "realm": realm,
        }
        if org_id:
            id_claims["org_id"] = org_id
        id_claims.update(resolve_identity_claims(granted_scopes, user))
        id_token = sign_provider_jwt(id_claims, settings)

    session_rec = Session(
        id=session_id,
        user_id=user.id,
        app_id=app.id,
        token=None,
        token_hash=sha256_hash(access_token),
        expires_at=expires_at,
        created_at=now,
        updated_at=now,
    )
    db.add(session_rec)

    refresh_token: str | None = None
    if grants_offline_access(granted_scopes):
        refresh_token = generate_provider_token("876_rt")
        db.add(
            OauthRefreshToken(
                id=generate_id("refreshToken"),
                token_hash=sha256_hash(refresh_token),
                user_id=user.id,
                app_id=app.id,
                session_id=session_id,
                scope=scope,
                expires_at=now + settings.oauth_refresh_token_ttl_seconds,
                created_at=now,
            )
        )

    await db.flush()

    logger.info(
        "oauth.token.issued",
        user_id=user.id,
        app_id=app.id,
        client_id=app.client_id,
        session_id=session_id,
        scope=scope,
        realm=realm,
        has_refresh=refresh_token is not None,
        has_id_token=id_token is not None,
        org_id=org_id,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=expires_in,
        scope=scope,
        id_token=id_token,
        refresh_token=refresh_token,
    )


async def handle_client_credentials_grant(
    request: Request,
    db: AsyncSession,
    resolved_client_id: str,
    resolved_client_secret: str | None,
    scope: str | None,
) -> Any:
    stmt = select(App).where(App.client_id == resolved_client_id)
    app = (await db.scalars(stmt)).first()
    if not app:
        return make_oauth_error("provider/invalid-client", "The OAuth client is invalid.", 401)

    if app.client_type != "confidential":
        return make_oauth_error(
            "provider/unauthorized-client",
            "The client_credentials grant requires a confidential client.",
            400,
        )

    if not is_client_secret_valid(app, resolved_client_secret):
        return make_oauth_error("provider/invalid-client-secret", "The OAuth client secret is invalid.", 401)

    requested_scopes = set((scope or "").split()) if scope else set()
    allowed_scopes = set(app.scopes_allowed or [])
    # Remove user-centric scopes that make no sense without a user subject
    allowed_scopes.discard("openid")
    allowed_scopes.discard("offline_access")
    if requested_scopes and not requested_scopes.issubset(allowed_scopes):
        return make_oauth_error("provider/invalid-scope", "One or more requested scopes are not permitted.", 400)

    granted_scope = " ".join(sorted(requested_scopes or allowed_scopes))

    logger.info(
        "oauth.token.client_credentials_issued",
        client_id=app.client_id,
        app_id=app.id,
        scope=granted_scope,
    )

    settings = request.app.state.settings
    issuer = get_provider_issuer(request)
    now = int(time.time())
    expires_in = settings.oauth_access_token_ttl_seconds
    expires_at = now + expires_in

    access_token = sign_provider_jwt(
        {
            "iss": issuer,
            "sub": app.client_id,
            "aud": app.client_id,
            "exp": expires_at,
            "iat": now,
            "scope": granted_scope,
            "token_use": "service",
        },
        settings,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=expires_in,
        scope=granted_scope,
        id_token=None,
        refresh_token=None,
    )


async def handle_refresh_token_grant(
    request: Request,
    db: AsyncSession,
    resolved_client_id: str,
    resolved_client_secret: str | None,
    refresh_token: str | None,
) -> Any:
    if not refresh_token:
        return make_oauth_error("provider/invalid-request", "A refresh token is required.", 400)

    token_hash = sha256_hash(refresh_token)
    stmt = select(OauthRefreshToken).where(OauthRefreshToken.token_hash == token_hash)
    record = (await db.scalars(stmt)).first()
    if not record:
        return make_oauth_error("provider/code-not-found", "The refresh token is invalid.", 400)

    app = await db.get(App, record.app_id)
    if not app or app.client_id != resolved_client_id:
        return make_oauth_error("provider/invalid-client", "The OAuth client is invalid.", 401)

    if not is_client_secret_valid(app, resolved_client_secret):
        return make_oauth_error("provider/invalid-client-secret", "The OAuth client secret is invalid.", 401)

    now = int(time.time())
    if record.revoked_at is not None or record.expires_at < now:
        return make_oauth_error("provider/token-expired", "The refresh token has expired.", 400)

    # Rotation reuse detection: presenting a token after it was rotated is a
    # replay. Revoke the whole family for this user+app and reject the request.
    if record.used_at is not None:
        logger.warning(
            "oauth.refresh.reuse_detected",
            user_id=record.user_id,
            app_id=record.app_id,
            client_id=resolved_client_id,
            refresh_token_id=record.id,
            session_id=record.session_id,
        )
        await db.execute(
            update(OauthRefreshToken)
            .where(
                OauthRefreshToken.user_id == record.user_id,
                OauthRefreshToken.app_id == record.app_id,
                OauthRefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        return make_oauth_error("provider/code-used", "The refresh token has already been used.", 400)

    # Mark used (not revoked): a later replay must fall through to the reuse
    # branch above, which revokes the whole family. Revoking here would instead
    # trip the expired/revoked guard and mask the theft signal.
    consume = await db.execute(
        update(OauthRefreshToken)
        .where(OauthRefreshToken.id == record.id, OauthRefreshToken.used_at.is_(None))
        .values(used_at=now)
    )
    if getattr(consume, "rowcount", 0) == 0:
        return make_oauth_error("provider/code-used", "The refresh token has already been used.", 400)

    user = await db.get(User, record.user_id)
    if not user:
        return make_oauth_error("provider/login-required", "The account is no longer available.", 400)

    return await issue_token_response(request, db, app=app, user=user, scope=record.scope, nonce=None, auth_time=None)
