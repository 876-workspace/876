from __future__ import annotations

import base64
import hmac
import time
from typing import Annotated, Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from fastapi import APIRouter, Depends, Form, Header, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.platform_apps import FIRST_PARTY_APP_KINDS
from db.models import (
    ApiKey,
    App,
    AuthorizationCode,
    OauthGrant,
    Session,
    User,
)
from db.session import get_db
from domains.oauth.errors import make_oauth_error
from domains.oauth.grants import (
    handle_client_credentials_grant,
    handle_refresh_token_grant,
    issue_token_response,
)
from domains.oauth.schemas import (
    ConsentApproveRequest,
    ConsentDenyRequest,
    IntrospectResponse,
    TokenResponse,
    UserinfoResponse,
)
from domains.oauth.scopes import (
    resolve_identity_claims,
    supported_claims,
    supported_scopes,
)
from domains.oauth.tokens import (
    generate_provider_token,
    get_provider_jwk,
    sha256_base64url,
    sha256_hash,
    verify_provider_jwt,
)
from domains.oauth.validation import get_provider_issuer, is_client_secret_valid, validate_oauth_client_request

from . import docs  # noqa: F401

logger = get_logger(__name__)

router = APIRouter(prefix="/oauth", tags=["OAuth"])


def build_consent_path(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    scope: str,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    state: str | None = None,
    nonce: str | None = None,
    prompt: str | None = None,
) -> str:
    params: dict[str, str] = {
        "response_type": response_type,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
    }
    if code_challenge:
        params["code_challenge"] = code_challenge
    if code_challenge_method:
        params["code_challenge_method"] = code_challenge_method
    if state:
        params["state"] = state
    if nonce:
        params["nonce"] = nonce
    if prompt:
        params["prompt"] = prompt
    return f"/oauth/consent?{urlencode(params)}"


# ── Authentication Helpers ─────────────────────────────────────────────────────────


def has_trusted_internal_key(request: Request) -> bool:
    """True when the request carries the configured internal key.

    Only first-party callers (the app's server-side OAuth proxy) hold this key,
    so an asserted user identity (`user_id` / `X-User-Id`) is trusted only when
    it is present. The OAuth endpoints are publicly reachable, so without this
    gate the headers could be spoofed to impersonate any user.
    """
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        return False

    expected = settings.internal_key
    provided = request.headers.get("x-internal-key")
    return bool(expected) and bool(provided) and hmac.compare_digest(provided, expected)


async def get_current_user(
    request: Request,
    db: AsyncSession,
    x_user_id: str | None,
    user_id: str | None,
) -> User:
    # Identity on the authorization/consent endpoints comes only from a
    # first-party caller holding the internal key (the app's OAuth proxy, which
    # unseals the session cookie). There is deliberately no bearer-token fallback
    # here: it would let an access-token holder drive /consent/approve and
    # self-grant scopes without the user ever seeing the consent screen.
    if not has_trusted_internal_key(request):
        raise AppHTTPException(
            code="provider/login-required",
            message="A signed-in 876 account is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    uid = user_id or x_user_id
    if not uid:
        raise AppHTTPException(
            code="provider/login-required",
            message="A signed-in 876 account is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    user_rec = await db.get(User, uid)
    if not user_rec:
        raise AppHTTPException(
            code="provider/login-required",
            message="A signed-in 876 account is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    return user_rec


def get_client_credentials(
    request: Request, client_id: str | None, client_secret: str | None
) -> tuple[str | None, str | None] | None:
    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Basic "):
        try:
            encoded = base64.b64decode(authorization[len("Basic ") :].encode("utf-8")).decode("utf-8")
            if ":" in encoded:
                b_client_id, b_client_secret = encoded.split(":", 1)
                from urllib.parse import unquote

                b_client_id = unquote(b_client_id)
                b_client_secret = unquote(b_client_secret)
                if client_id and client_id != b_client_id:
                    return None
                return b_client_id, b_client_secret
        except Exception:
            logger.debug("oauth.token.basic_auth_decode_failed")
            return None
    return client_id, client_secret


async def authenticate_api_key(db: AsyncSession, key: str) -> ApiKey | None:
    key_hash = sha256_hash(key)
    stmt = select(ApiKey).where(ApiKey.key_hash == key_hash)
    record = (await db.scalars(stmt)).first()
    if not record:
        return None
    if record.revoked:
        return None
    if record.expires_at and record.expires_at < int(time.time()):
        return None

    record.last_used_at = int(time.time())
    await db.flush()
    return record


# ── Routes ─────────────────────────────────────────────────────────────────────────


@router.get(
    "/.well-known/openid-configuration",
    summary="OIDC discovery document",
    status_code=status.HTTP_200_OK,
)
async def get_openid_configuration(request: Request) -> JSONResponse:
    issuer = get_provider_issuer(request)

    doc = {
        "issuer": issuer,
        "authorization_endpoint": f"{issuer}/oauth/authorize",
        "token_endpoint": f"{issuer}/oauth/token",
        "userinfo_endpoint": f"{issuer}/oauth/userinfo",
        "end_session_endpoint": f"{issuer}/oauth/end-session",
        "revocation_endpoint": f"{issuer}/oauth/revoke",
        "introspection_endpoint": f"{issuer}/oauth/introspect",
        "jwks_uri": f"{issuer}/.well-known/jwks.json",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "scopes_supported": supported_scopes(),
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": [
            "none",
            "client_secret_basic",
            "client_secret_post",
        ],
        "claims_supported": supported_claims(),
        "frontchannel_logout_supported": False,
        "backchannel_logout_supported": False,
    }
    return JSONResponse(content=doc)


@router.get(
    "/.well-known/jwks.json",
    summary="JSON Web Key Set",
    status_code=status.HTTP_200_OK,
)
async def get_jwks(request: Request) -> JSONResponse:
    settings = request.app.state.settings
    jwk = get_provider_jwk(settings)
    return JSONResponse(content={"keys": [jwk]})


@router.get(
    "/authorize",
    summary="Authorization endpoint",
    status_code=status.HTTP_200_OK,
)
async def get_authorize(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    response_type: str = "",
    client_id: str = "",
    redirect_uri: str = "",
    scope: str = "openid",
    state: str | None = None,
    nonce: str | None = None,
    prompt: str | None = None,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    x_org_id: Annotated[str | None, Header(alias="X-Org-Id")] = None,
    user_id: str | None = None,
) -> JSONResponse:
    oauth_request = await validate_oauth_client_request(
        db,
        response_type=response_type,
        client_id=client_id,
        redirect_uri=redirect_uri,
        scope=scope,
        require_client_parameters=True,
        response_type_error_code="provider/unsupported-response-type" if response_type else "provider/invalid-request",
        response_type_error_message="Unsupported response type." if response_type else "Invalid request parameters.",
    )
    app = oauth_request.app
    scopes = oauth_request.scopes

    user_rec = await get_current_user(request, db, x_user_id, user_id)

    stmt_grant = select(OauthGrant).where(OauthGrant.user_id == user_rec.id, OauthGrant.app_id == app.id)
    grant = (await db.scalars(stmt_grant)).first()

    prompt_list = (prompt or "").split(" ")

    if "select_account" in prompt_list:
        raise AppHTTPException(
            code="provider/account-selection-required",
            message="Account selection is required.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    has_revoked_grant = grant is None or grant.revoked_at is not None
    grant_scopes = set(grant.scopes if grant else [])
    has_all_scopes = all(s in grant_scopes for s in scopes)

    needs_consent = True
    if app.app_kind in FIRST_PARTY_APP_KINDS:
        needs_consent = False
    elif "consent" in prompt_list:
        needs_consent = True
    elif not has_revoked_grant and has_all_scopes:
        needs_consent = False

    if needs_consent:
        if "none" in prompt_list:
            raise AppHTTPException(
                code="provider/consent-required",
                message="The app requires account permission before continuing.",
                http_status_code=status.HTTP_403_FORBIDDEN,
            )
        consent_path = build_consent_path(
            response_type=response_type,
            client_id=client_id,
            redirect_uri=redirect_uri,
            scope=scope,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            state=state,
            nonce=nonce,
            prompt=prompt,
        )
        return JSONResponse(
            content={
                "status": "consent_required",
                "consentPath": consent_path,
            }
        )

    code = generate_provider_token("876_code")
    code_hash = sha256_hash(code)

    parsed_redirect = urlparse(redirect_uri)
    query_params = dict(parse_qsl(parsed_redirect.query))
    query_params["code"] = code
    if state:
        query_params["state"] = state
    redirect_url = urlunparse(parsed_redirect._replace(query=urlencode(query_params)))

    auth_code = AuthorizationCode(
        id=generate_id("authorizationCode"),
        code_hash=code_hash,
        user_id=user_rec.id,
        app_id=app.id,
        org_id=x_org_id or None,
        redirect_uri=redirect_uri,
        code_challenge=code_challenge or "",
        code_challenge_method=code_challenge_method or "S256",
        scope=scope,
        state=state,
        nonce=nonce,
        auth_time=int(time.time()),
        expires_at=int(time.time()) + 10 * 60,
        created_at=int(time.time()),
    )
    db.add(auth_code)
    await db.flush()

    logger.info(
        "oauth.authorize.code_issued",
        user_id=user_rec.id,
        app_id=app.id,
        client_id=client_id,
        scope=scope,
        org_id=x_org_id or None,
    )

    return JSONResponse(
        content={
            "status": "authorized",
            "redirectTo": redirect_url,
        }
    )


@router.post(
    "/token",
    summary="Token endpoint",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
async def post_token(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    grant_type: Annotated[str, Form(description="'authorization_code', 'refresh_token', or 'client_credentials'.")],
    code: Annotated[str | None, Form(description="The authorization code received.")] = None,
    redirect_uri: Annotated[
        str | None, Form(description="Must match the redirect_uri used at authorization time.")
    ] = None,
    refresh_token: Annotated[str | None, Form(description="Refresh token, for the refresh_token grant.")] = None,
    client_id: Annotated[str | None, Form(description="The registered OAuth client ID.")] = None,
    code_verifier: Annotated[str | None, Form(description="PKCE code verifier.")] = None,
    client_secret: Annotated[str | None, Form(description="Client secret.")] = None,
    scope: Annotated[str | None, Form(description="Requested scope, for the client_credentials grant.")] = None,
) -> Any:
    creds = get_client_credentials(request, client_id, client_secret)
    if not creds:
        return make_oauth_error("provider/invalid-client", "Invalid client credentials.", 401)

    resolved_client_id, resolved_client_secret = creds
    if not resolved_client_id:
        return make_oauth_error("provider/invalid-client", "Client ID is required.", 401)

    if grant_type == "refresh_token":
        return await handle_refresh_token_grant(request, db, resolved_client_id, resolved_client_secret, refresh_token)

    if grant_type == "client_credentials":
        return await handle_client_credentials_grant(request, db, resolved_client_id, resolved_client_secret, scope)

    if grant_type != "authorization_code":
        return make_oauth_error(
            "provider/unsupported-grant-type",
            "The OAuth grant type is not supported.",
            400,
        )

    if not code or not redirect_uri:
        return make_oauth_error("provider/invalid-request", "Missing code or redirect_uri.", 400)

    code_hash = sha256_hash(code)
    stmt = (
        select(AuthorizationCode)
        .where(AuthorizationCode.code_hash == code_hash)
        .options(selectinload(AuthorizationCode.app), selectinload(AuthorizationCode.user))
    )
    record = (await db.scalars(stmt)).first()

    if not record:
        return make_oauth_error("provider/code-not-found", "The authorization code is invalid.", 400)
    if record.used_at:
        return make_oauth_error("provider/code-used", "The authorization code has already been used.", 400)
    if record.expires_at < int(time.time()):
        return make_oauth_error("provider/code-expired", "The authorization code has expired.", 400)
    if record.redirect_uri != redirect_uri:
        return make_oauth_error(
            "provider/invalid-redirect-uri",
            "The redirect URI is not registered for this app.",
            400,
        )
    if record.app.client_id != resolved_client_id:
        return make_oauth_error("provider/invalid-client", "The OAuth client is invalid.", 401)

    if not is_client_secret_valid(record.app, resolved_client_secret):
        return make_oauth_error("provider/invalid-client-secret", "The OAuth client secret is invalid.", 401)

    if record.code_challenge != sha256_base64url(code_verifier or ""):
        logger.warning(
            "oauth.token.pkce_failed",
            code_id=record.id,
            app_id=record.app_id,
            client_id=resolved_client_id,
        )
        return make_oauth_error("provider/invalid-code-verifier", "The PKCE code verifier is invalid.", 400)

    stmt_consume = (
        update(AuthorizationCode)
        .where(AuthorizationCode.id == record.id, AuthorizationCode.used_at.is_(None))
        .values(used_at=int(time.time()))
    )
    res = await db.execute(stmt_consume)
    if getattr(res, "rowcount", 0) == 0:
        logger.warning(
            "oauth.authorization_code.reuse_detected",
            code_id=record.id,
            user_id=record.user_id,
            app_id=record.app_id,
            client_id=resolved_client_id,
        )
        return make_oauth_error("provider/code-used", "The authorization code has already been used.", 400)

    return await issue_token_response(
        request,
        db,
        app=record.app,
        user=record.user,
        scope=record.scope,
        nonce=record.nonce,
        auth_time=record.auth_time,
        org_id=record.org_id,
    )


@router.get(
    "/userinfo",
    summary="UserInfo endpoint",
    response_model=UserinfoResponse,
    status_code=status.HTTP_200_OK,
)
async def get_userinfo(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Any:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return make_oauth_error("provider/token-invalid", "The access token is invalid.", 401)

    access_token = auth_header[len("Bearer ") :].strip()
    settings = request.app.state.settings
    claims = verify_provider_jwt(access_token, settings)

    if not claims or claims.get("token_use") != "access":
        return make_oauth_error("provider/token-invalid", "The access token is invalid.", 401)

    token_hash = sha256_hash(access_token)
    stmt = select(Session).where(Session.token_hash == token_hash).options(selectinload(Session.user))
    session_rec = (await db.scalars(stmt)).first()

    if not session_rec:
        return make_oauth_error("provider/token-invalid", "The access token is invalid.", 401)

    if session_rec.expires_at < int(time.time()):
        return make_oauth_error("provider/token-expired", "The access token has expired.", 401)

    granted_scopes = claims.get("scope", "").split()

    res_data: dict[str, Any] = {"sub": session_rec.user.id}
    res_data.update(resolve_identity_claims(granted_scopes, session_rec.user))

    return UserinfoResponse(**res_data)


@router.get(
    "/end-session",
    summary="RP-Initiated Logout",
    status_code=status.HTTP_302_FOUND,
    include_in_schema=True,
)
async def get_end_session(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    id_token_hint: str | None = None,
    post_logout_redirect_uri: str | None = None,
    client_id: str | None = None,
    state: str | None = None,
) -> Any:
    from fastapi.responses import RedirectResponse

    issuer = get_provider_issuer(request)
    settings = request.app.state.settings

    app: App | None = None
    user_id: str | None = None
    session_id: str | None = None

    if id_token_hint:
        claims = verify_provider_jwt(id_token_hint, settings)
        if claims:
            token_use = claims.get("token_use")
            if token_use == "id":
                user_id = claims.get("sub")
                session_id = claims.get("sid")
                aud = claims.get("aud") or client_id
                if aud:
                    stmt = select(App).where(App.client_id == aud)
                    app = (await db.scalars(stmt)).first()

    # If only client_id provided, look up the app to validate redirect URI
    if app is None and client_id:
        stmt = select(App).where(App.client_id == client_id)
        app = (await db.scalars(stmt)).first()

    # Revoke the specific session identified by the id_token_hint
    if session_id and user_id:
        await db.execute(
            delete(Session).where(Session.id == session_id, Session.user_id == user_id)
        )
        await db.flush()
        logger.info(
            "oauth.session.ended",
            user_id=user_id,
            session_id=session_id,
            client_id=client_id,
        )

    # Validate post_logout_redirect_uri against app's allowed_logout_uris
    redirect_target = issuer
    if (
        post_logout_redirect_uri
        and app
        and app.allowed_logout_uris
        and post_logout_redirect_uri in app.allowed_logout_uris
    ):
        parsed = urlparse(post_logout_redirect_uri)
        params = dict(parse_qsl(parsed.query))
        if state:
            params["state"] = state
        redirect_target = urlunparse(parsed._replace(query=urlencode(params)))

    return RedirectResponse(url=redirect_target, status_code=302)


@router.post(
    "/revoke",
    summary="Revoke token",
    status_code=status.HTTP_200_OK,
)
async def post_revoke(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Form(description="The token to revoke.")],
) -> JSONResponse:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AppHTTPException(
            code="api-key/invalid",
            message="API key is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    bearer_token = auth_header[len("Bearer ") :].strip()
    api_key_rec = await authenticate_api_key(db, bearer_token)
    if not api_key_rec:
        raise AppHTTPException(
            code="api-key/invalid",
            message="API key is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    token_hash = sha256_hash(token)
    stmt = delete(Session).where(Session.token_hash == token_hash)
    res = await db.execute(stmt)
    await db.flush()

    logger.info(
        "oauth.token.revoked",
        api_key_id=api_key_rec.id,
        sessions_deleted=getattr(res, "rowcount", 0),
    )

    return JSONResponse(content={"revoked": True})


@router.post(
    "/introspect",
    summary="Token introspection",
    response_model=IntrospectResponse,
    status_code=status.HTTP_200_OK,
)
async def post_introspect(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Form(description="The token to introspect.")],
) -> IntrospectResponse:
    # RFC 7662: the endpoint is protected. The calling resource server
    # authenticates with its 876 API key (matching /revoke).
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AppHTTPException(
            code="api-key/invalid",
            message="API key is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    api_key_rec = await authenticate_api_key(db, auth_header[len("Bearer ") :].strip())
    if not api_key_rec:
        raise AppHTTPException(
            code="api-key/invalid",
            message="API key is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    settings = request.app.state.settings
    claims = verify_provider_jwt(token, settings)
    if not claims or claims.get("token_use") != "access":
        return IntrospectResponse(active=False)

    token_hash = sha256_hash(token)
    stmt = select(Session).where(Session.token_hash == token_hash)
    session_rec = (await db.scalars(stmt)).first()
    if not session_rec or session_rec.expires_at < int(time.time()):
        return IntrospectResponse(active=False)

    return IntrospectResponse(
        active=True,
        scope=claims.get("scope"),
        app_id=session_rec.app_id,
        client_id=claims.get("aud"),
        sub=claims.get("sub"),
        token_type="Bearer",
        exp=claims.get("exp"),
        iat=claims.get("iat"),
    )


@router.get(
    "/consent",
    summary="Consent screen data",
    status_code=status.HTTP_200_OK,
)
async def get_consent(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    response_type: str = "",
    client_id: str = "",
    redirect_uri: str = "",
    scope: str = "openid",
    state: str | None = None,
    nonce: str | None = None,
    prompt: str | None = None,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    user_id: str | None = None,
) -> JSONResponse:
    oauth_request = await validate_oauth_client_request(
        db,
        response_type=response_type,
        client_id=client_id,
        redirect_uri=redirect_uri,
        scope=scope,
    )
    app = oauth_request.app
    scopes = oauth_request.scopes

    user_rec = await get_current_user(request, db, x_user_id, user_id)

    stmt_grant = select(OauthGrant).where(OauthGrant.user_id == user_rec.id, OauthGrant.app_id == app.id)
    grant = (await db.scalars(stmt_grant)).first()

    prev_granted = []
    if grant and not grant.revoked_at:
        prev_granted = [s for s in grant.scopes if s in ("openid", "profile", "email")]

    consent_details = {
        "app": {
            "id": app.id,
            "name": app.name,
            "clientId": app.client_id,
            "logoUrl": app.logo_url,
            "homepageUrl": app.homepage_url,
        },
        "user": {
            "id": user_rec.id,
            "email": user_rec.email,
            "name": f"{user_rec.first_name} {user_rec.last_name}".strip() or user_rec.email,
            "avatar": user_rec.avatar,
        },
        "scopes": scopes,
        "previouslyGrantedScopes": prev_granted,
    }
    return JSONResponse(content=consent_details)


@router.post(
    "/consent/approve",
    summary="Approve consent",
    status_code=status.HTTP_200_OK,
)
async def post_consent_approve(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ConsentApproveRequest,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    x_org_id: Annotated[str | None, Header(alias="X-Org-Id")] = None,
    user_id: str | None = Query(default=None),
) -> JSONResponse:
    oauth_request = await validate_oauth_client_request(
        db,
        response_type=body.response_type,
        client_id=body.client_id,
        redirect_uri=body.redirect_uri,
        scope=body.scope,
    )
    app = oauth_request.app
    scopes = oauth_request.scopes

    user_rec = await get_current_user(request, db, x_user_id, user_id)

    stmt_grant = select(OauthGrant).where(OauthGrant.user_id == user_rec.id, OauthGrant.app_id == app.id)
    grant = (await db.scalars(stmt_grant)).first()

    existing_scopes = grant.scopes if grant else []
    provider_scopes = ["openid", "profile", "email"]
    merged_scopes = list(dict.fromkeys(existing_scopes + scopes))
    merged_scopes = [s for s in provider_scopes if s in merged_scopes]

    if grant:
        grant.scopes = merged_scopes
        grant.revoked_at = None
        grant.updated_at = int(time.time())
    else:
        grant = OauthGrant(
            id=generate_id("oauthGrant"),
            user_id=user_rec.id,
            app_id=app.id,
            scopes=merged_scopes,
            created_at=int(time.time()),
            updated_at=int(time.time()),
        )
        db.add(grant)
    await db.flush()

    logger.info(
        "oauth.consent.approved",
        user_id=user_rec.id,
        app_id=app.id,
        client_id=body.client_id,
        scopes=merged_scopes,
    )

    code = generate_provider_token("876_code")
    code_hash = sha256_hash(code)

    parsed_redirect = urlparse(body.redirect_uri)
    query_params = dict(parse_qsl(parsed_redirect.query))
    query_params["code"] = code
    if body.state:
        query_params["state"] = body.state
    redirect_url = urlunparse(parsed_redirect._replace(query=urlencode(query_params)))

    auth_code = AuthorizationCode(
        id=generate_id("authorizationCode"),
        code_hash=code_hash,
        user_id=user_rec.id,
        app_id=app.id,
        org_id=x_org_id or None,
        redirect_uri=body.redirect_uri,
        code_challenge=body.code_challenge or "",
        code_challenge_method=body.code_challenge_method or "S256",
        scope=body.scope,
        state=body.state,
        nonce=body.nonce,
        auth_time=int(time.time()),
        expires_at=int(time.time()) + 10 * 60,
        created_at=int(time.time()),
    )
    db.add(auth_code)
    await db.flush()

    return JSONResponse(
        content={
            "status": "authorized",
            "redirectTo": redirect_url,
        }
    )


@router.post(
    "/consent/deny",
    summary="Deny consent",
    status_code=status.HTTP_200_OK,
)
async def post_consent_deny(
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ConsentDenyRequest,
) -> JSONResponse:
    await validate_oauth_client_request(
        db,
        response_type=body.response_type,
        client_id=body.client_id,
        redirect_uri=body.redirect_uri,
        scope=None,
        invalid_client_code="provider/invalid-redirect-uri",
        invalid_client_message="The redirect URI is not registered for this app.",
        invalid_client_status=status.HTTP_400_BAD_REQUEST,
        validate_scopes=False,
    )

    parsed_redirect = urlparse(body.redirect_uri)
    query_params = dict(parse_qsl(parsed_redirect.query))
    query_params["error"] = "access_denied"
    query_params["error_description"] = "The account owner denied access."
    if body.state:
        query_params["state"] = body.state
    redirect_url = urlunparse(parsed_redirect._replace(query=urlencode(query_params)))

    return JSONResponse(
        content={
            "status": "authorized",
            "redirectTo": redirect_url,
        }
    )
