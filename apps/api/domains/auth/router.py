from __future__ import annotations

import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.logging import get_logger
from core.rate_limit import enforce_rate_limit
from core.responses import ErrorEnvelope, ListObject
from core.security import AdminDep
from core.session import seal_session, select_account
from db.models import App, Membership, Organization, Session, User
from db.repositories.auth_providers import AuthProviderRepository
from db.repositories.sessions import SessionRepository
from db.repositories.users import UserRepository
from db.session import get_db
from domains.auth.schemas import (
    AuthEventResponse,
    AuthRefreshResponse,
    AuthSessionResponse,
    CallbackRequest,
    EmailResolveRequest,
    EmailResolveResponse,
    EmptyResponse,
    LoginRequest,
    MagicOtpSendRequest,
    MagicOtpSendResponse,
    MagicOtpVerifyRequest,
    OAuthSessionRequest,
    RecoverRequest,
    RecoverResponse,
    RefreshRequest,
    RegisterBusinessRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    RoutingMembership,
    RoutingMembershipsResponse,
    RoutingOrganization,
    SessionDataResponse,
    SessionSignoutResponse,
    SessionSwitchResponse,
    SocialLoginRequest,
    SocialLoginResponse,
    SocialProviderResponse,
    SwitchSessionRequest,
    VerifiedUserResponse,
    VerifyEmailRequest,
)
from domains.auth.session_state import (
    SESSION_TTL_SECONDS as _SESSION_TTL_SECONDS,
)
from domains.auth.session_state import (
    auth_event_dict as _auth_event_dict,
)
from domains.auth.session_state import (
    clear_session_cookie,
)
from domains.auth.session_state import (
    complete_auth as _complete_auth,
)
from domains.auth.session_state import (
    establish_session as _establish_session,
)
from domains.auth.session_state import (
    read_session_payload as _read_session_payload,
)
from domains.auth.session_state import (
    require_cookie_secret as _require_cookie_secret,
)
from domains.auth.session_state import (
    session_dict as _session_dict,
)
from domains.auth.session_state import (
    set_session_cookie as _set_session_cookie,
)
from domains.oauth.tokens import verify_provider_jwt
from services.auth import AuthServiceDep, ServiceAuthPending
from services.provisioning import resolve_member_permissions

from . import docs

logger = get_logger(__name__)

_UNAUTH: dict[int | str, dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {"model": ErrorEnvelope, "description": "No active session."}
}

_VALIDATION: dict[int | str, dict[str, Any]] = {
    status.HTTP_422_UNPROCESSABLE_CONTENT: {"description": "Request body failed validation."}
}

router = APIRouter(tags=["Auth"])


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post(
    "/resolve",
    response_model=EmailResolveResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve email access",
    description=(
        "Checks whether the given email address has access to the platform and "
        "returns metadata about the account type. Used by the auth flow to decide "
        "which login screen variant to show."
    ),
    responses={
        status.HTTP_200_OK: {"model": EmailResolveResponse, "description": "Email resolved successfully."},
        **_VALIDATION,
    },
)
async def resolve_email(
    body: EmailResolveRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
) -> EmailResolveResponse:
    # Validate identifier and resolve to email
    if "@" in (body.identifier or ""):
        email = service._validate_email(body.identifier)
    else:
        email = await service._resolve_identifier(body.identifier)

    user = await UserRepository(db).get_by_email(email)
    exists = user is not None
    business = False
    if user:
        stmt = (
            select(Membership)
            .where(Membership.user_id == user.id, Membership.status.in_(["active", "invited"]))
            .limit(1)
        )
        m = (await db.scalars(stmt)).first()
        if m:
            business = True

    return EmailResolveResponse(
        email=email,
        exists=exists,
        business=business,
        methods=["password"] if exists else [],
    )


@router.post(
    "/login",
    response_model=AuthSessionResponse | AuthEventResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Password login",
    description=docs.LOGIN_DESCRIPTION,
    responses={
        status.HTTP_200_OK: {"description": "Authentication successful. Returns session envelope or auth_event."},
        **docs.LOGIN_RESPONSES,
        **_VALIDATION,
    },
)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthSessionResponse | AuthEventResponse | dict[str, Any]:
    # Keyed on the identifier: it is what a password-guessing attacker must
    # hold constant, and per-IP limits are useless behind the app bridges.
    enforce_rate_limit(
        "auth.login",
        body.identifier.strip().lower(),
        max_attempts=10,
        window_seconds=300,
    )
    result = await service.login(identifier=body.identifier, password=body.password)
    if isinstance(result, ServiceAuthPending):
        logger.info("auth.login.pending", reason=result.event.kind)
        return _auth_event_dict(result.event)
    session = await _complete_auth(request, response, result, db, settings)
    logger.info("auth.login.succeeded", user_id=session["user"]["id"], method="password")
    return session


@router.post(
    "/oauth/session",
    response_model=AuthSessionResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary=docs.OAUTH_SESSION_SUMMARY,
    description=docs.OAUTH_SESSION_DESCRIPTION,
    responses={
        **docs.OAUTH_SESSION_RESPONSES,
        **_VALIDATION,
    },
)
async def create_session_from_oauth(
    body: OAuthSessionRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthSessionResponse | dict[str, Any]:
    claims = verify_provider_jwt(body.id_token, settings)
    if not claims or claims.get("token_use") != "id":
        raise AppHTTPException(
            code="auth/invalid-token",
            message="The id token is invalid.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    # Defense in depth: the id token must have been issued to the calling app.
    app_id = getattr(request.state, "app_id", None)
    if app_id:
        app = await db.get(App, app_id)
        if app and claims.get("aud") != app.client_id:
            logger.warning(
                "auth.oauth_session.audience_mismatch",
                app_id=app_id,
                token_aud=claims.get("aud"),
                client_id=app.client_id,
                user_id=claims.get("sub"),
            )
            raise AppHTTPException(
                code="auth/forbidden",
                message="The id token was not issued to this client.",
                http_status_code=status.HTTP_403_FORBIDDEN,
            )

    user = await db.get(User, claims.get("sub"))
    if not user:
        raise AppHTTPException(
            code="auth/no-session",
            message="The account is no longer available.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    await _establish_session(request, response, user, None, db, settings)
    logger.info("auth.oauth_session.established", user_id=user.id, app_id=app_id)
    return _session_dict(user)


@router.post(
    "/register",
    response_model=AuthSessionResponse | AuthEventResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Register consumer account",
    description=docs.REGISTER_DESCRIPTION,
    responses={
        status.HTTP_200_OK: {"description": "Registration successful. Returns session envelope or auth_event."},
        **docs.REGISTER_RESPONSES,
        **_VALIDATION,
    },
)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthSessionResponse | AuthEventResponse | dict[str, Any]:
    result = await service.register(
        email=body.email,
        password=body.password,
        first_name=body.first_name,
        last_name=body.last_name,
    )
    if isinstance(result, ServiceAuthPending):
        return _auth_event_dict(result.event)
    return await _complete_auth(request, response, result, db, settings)


@router.post(
    "/register-business",
    response_model=AuthSessionResponse | AuthEventResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Register business account",
    description=docs.REGISTER_BUSINESS_DESCRIPTION,
    responses={
        status.HTTP_200_OK: {"description": "Business registration successful. Returns session or auth_event."},
        **docs.REGISTER_BUSINESS_RESPONSES,
        **_VALIDATION,
    },
)
async def register_business(
    body: RegisterBusinessRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthSessionResponse | AuthEventResponse | dict[str, Any]:
    result = await service.register_business(
        email=body.email,
        password=body.password,
        first_name=body.first_name,
        last_name=body.last_name,
        organization_name=body.organization_name,
        organization_slug=body.organization_slug,
    )
    if isinstance(result, ServiceAuthPending):
        return _auth_event_dict(result.event)
    return await _complete_auth(request, response, result, db, settings)


@router.post(
    "/social-login",
    response_model=SocialLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Get OAuth provider URL",
    description=(
        "Generates a WorkOS authorization URL for the requested social/SSO provider. "
        "The client should redirect the user to this URL to begin the OAuth flow."
    ),
    responses={
        status.HTTP_200_OK: {"model": SocialLoginResponse, "description": "Authorization URL generated."},
        **_VALIDATION,
    },
)
async def social_login(
    request: Request,
    body: SocialLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
) -> SocialLoginResponse:
    if not body.provider or not body.provider.strip():
        raise AppHTTPException(
            code="auth/provider-disabled",
            message="This sign-in method is currently unavailable. Please try another method.",
            http_status_code=403,
        )
    provider = await AuthProviderRepository(db).get_enabled_by_id(body.provider.strip().lower())
    if not provider or not provider.workos_provider_id:
        raise AppHTTPException(
            code="auth/provider-disabled",
            message="This sign-in method is currently unavailable. Please try another method.",
            http_status_code=403,
        )
    url = service.get_authorization_url(
        provider=provider.workos_provider_id,
        screen_hint=body.screen_hint,
        login_hint=body.login_hint,
        redirect_origin=request.headers.get("x-876-origin"),
    )
    return SocialLoginResponse(url=url)


@router.get(
    "/providers",
    response_model=ListObject[SocialProviderResponse],
    status_code=status.HTTP_200_OK,
    summary="List social providers",
    description=(
        "Lists the social/SSO providers currently enabled for sign-in, in display order. "
        "Clients render these dynamically instead of hardcoding a provider list; pass a "
        "provider `id` to `POST /auth/social-login` to begin the flow."
    ),
    responses={
        status.HTTP_200_OK: {
            "model": ListObject[SocialProviderResponse],
            "description": "Enabled social providers.",
        },
    },
)
async def list_providers(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[SocialProviderResponse]:
    rows = await AuthProviderRepository(db).list_enabled()
    data = [
        SocialProviderResponse(
            id=provider.id,
            label=provider.label,
            icon_slug=provider.icon_slug,
        )
        for provider in rows
    ]
    return ListObject[SocialProviderResponse](
        data=data,
        has_more=False,
        url="/auth/providers",
        total_count=len(data),
    )


@router.post(
    "/magic-otp/send",
    response_model=MagicOtpSendResponse,
    status_code=status.HTTP_200_OK,
    summary="Send magic OTP",
    description=(
        "Sends a one-time password to the given email address using WorkOS magic auth. "
        "Enforces a 300-second resend cooldown tracked in the database."
    ),
    responses={
        status.HTTP_200_OK: {"model": MagicOtpSendResponse, "description": "OTP sent."},
        status.HTTP_429_TOO_MANY_REQUESTS: {"model": ErrorEnvelope, "description": "Resend cooldown has not elapsed."},
        **_VALIDATION,
    },
)
async def send_magic_otp(
    body: MagicOtpSendRequest,
    service: AuthServiceDep,
) -> MagicOtpSendResponse:
    data = await service.send_otp(email=body.email)
    return MagicOtpSendResponse(email=data["email"], canResendAt=data["canResendAt"])


@router.post(
    "/magic-otp/verify",
    response_model=VerifiedUserResponse | AuthEventResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Verify magic OTP",
    description=("Verifies a magic-auth OTP code via WorkOS. Returns the authenticated WorkOS user object."),
    responses={
        status.HTTP_200_OK: {"description": "OTP verified. Returns the WorkOS user."},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorEnvelope, "description": "OTP is invalid or expired."},
        **_VALIDATION,
    },
)
async def verify_magic_otp(
    body: MagicOtpVerifyRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> VerifiedUserResponse | AuthEventResponse | dict[str, Any]:
    # OTP codes are short enough to brute-force; cap guesses per email.
    enforce_rate_limit(
        "auth.magic_otp_verify",
        body.email.strip().lower(),
        max_attempts=5,
        window_seconds=300,
    )
    result = await service.verify_otp(code=body.code, email=body.email)
    if isinstance(result, ServiceAuthPending):
        return _auth_event_dict(result.event)
    session = await _complete_auth(request, response, result, db, settings)
    return {"user": session["user"]}


@router.post(
    "/recover",
    response_model=RecoverResponse,
    status_code=status.HTTP_200_OK,
    summary="Send password recovery email",
    description=(
        "Triggers a password reset email for the given email address via WorkOS. "
        "If the email is not registered, the response is identical to a successful "
        "send to avoid account enumeration."
    ),
    responses={
        status.HTTP_200_OK: {
            "model": RecoverResponse,
            "description": "Recovery email dispatched (or silently swallowed for unknown accounts).",
        },
        **_VALIDATION,
    },
)
async def recover(
    body: RecoverRequest,
    service: AuthServiceDep,
) -> RecoverResponse:
    # Caps recovery-email flooding to a target inbox.
    enforce_rate_limit(
        "auth.recover",
        body.email.strip().lower(),
        max_attempts=3,
        window_seconds=900,
    )
    email = await service.send_recovery(email=body.email)
    return RecoverResponse(email=email)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset password",
    description=(
        "Confirms a password reset using the token from the recovery email. "
        "Calls WorkOS to update the credential and returns the associated email."
    ),
    responses={
        status.HTTP_200_OK: {"model": ResetPasswordResponse, "description": "Password reset successfully."},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorEnvelope, "description": "Reset token is invalid or expired."},
        **_VALIDATION,
    },
)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthServiceDep,
) -> ResetPasswordResponse:
    # Caps guesses against a stolen/enumerated reset token.
    enforce_rate_limit(
        "auth.reset_password",
        body.token,
        max_attempts=5,
        window_seconds=300,
    )
    email = await service.reset_password(token=body.token, new_password=body.password)
    logger.info("auth.password_reset.completed", email=email)
    return ResetPasswordResponse(email=email)


@router.post(
    "/verify-email",
    response_model=VerifiedUserResponse | AuthEventResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Verify email address",
    description=(
        "Verifies an email address using a WorkOS email verification code. "
        "Called after registration when WorkOS requires email confirmation before "
        "issuing a session. Returns the verified user object."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Email verified. Returns the WorkOS user."},
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorEnvelope,
            "description": "Verification code is invalid or expired.",
        },
        **_VALIDATION,
    },
)
async def verify_email(
    body: VerifyEmailRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> VerifiedUserResponse | AuthEventResponse | dict[str, Any]:
    # Verification codes are short enough to brute-force; cap guesses per
    # pending authentication (the token scopes the code being attacked).
    enforce_rate_limit(
        "auth.verify_email",
        body.pending_authentication_token or "",
        max_attempts=5,
        window_seconds=300,
    )
    result = await service.verify_email(
        code=body.code,
        pending_authentication_token=body.pending_authentication_token,
    )
    if isinstance(result, ServiceAuthPending):
        return _auth_event_dict(result.event)

    session = await _complete_auth(request, response, result, db, settings)
    return {"user": session["user"]}


@router.post(
    "/callback",
    response_model=AuthSessionResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="WorkOS OAuth callback",
    description=(
        "Exchanges a WorkOS authorization code for an authentication response "
        "containing access and refresh tokens. Cookie writing is intentionally "
        "absent — the auth app's /callback page receives these tokens and "
        "seals the AuthKit session locally."
    ),
    responses={
        status.HTTP_200_OK: {"description": "Code exchanged. Returns access/refresh tokens and user."},
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorEnvelope,
            "description": "Authorization code is invalid or expired.",
        },
        **_VALIDATION,
    },
)
async def callback(
    body: CallbackRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthSessionResponse | dict[str, Any]:
    try:
        result = await service.authenticate_with_code(
            code=body.code,
            code_verifier=body.code_verifier,
            invitation_token=body.invitation_token,
            ip_address=body.ip_address,
            user_agent=body.user_agent,
        )
    except Exception:
        logger.warning("auth.callback.failed", exc_info=True)
        raise AppHTTPException(
            code="auth/oauth-failed",
            message="OAuth authentication failed. Please try again.",
            http_status_code=401,
        )
    if isinstance(result, ServiceAuthPending):
        raise AppHTTPException(
            code="auth/oauth-failed",
            message="OAuth authentication failed. Please try again.",
            http_status_code=401,
        )
    return await _complete_auth(request, response, result, db, settings)


@router.get(
    "/session",
    response_model=SessionDataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current session",
    description=docs.SESSION_DESCRIPTION,
    responses={**docs.SESSION_RESPONSES},
)
async def get_session(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionDataResponse:
    cookie = request.cookies.get(settings.session_cookie_name)
    cookie_secret = settings.resolved_session_cookie_secret
    if not cookie or not cookie_secret:
        raise AppHTTPException(
            code="auth/not-signed-in",
            message="No active session.",
            http_status_code=401,
        )
    session = _read_session_payload(request, settings, cookie_secret)
    if not session:
        raise AppHTTPException(
            code="auth/invalid-session",
            message="Session is invalid or expired. Please sign in again.",
            http_status_code=401,
        )
    # The provider access token lives in the HttpOnly cookie precisely so
    # browser JS can never read it — echoing it back here would defeat that.
    return SessionDataResponse(
        data={k: v for k, v in session.items() if k != "accessToken"},
        error=None,
    )


@router.post(
    "/refresh",
    response_model=AuthRefreshResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description=docs.REFRESH_DESCRIPTION,
    responses={
        status.HTTP_200_OK: {"description": "Token refreshed. Returns new access/refresh tokens."},
        **docs.REFRESH_RESPONSES,
        **_VALIDATION,
    },
)
async def refresh(
    body: RefreshRequest,
    service: AuthServiceDep,
) -> AuthRefreshResponse | dict[str, Any]:
    try:
        result = await service.refresh(
            refresh_token=body.refresh_token,
            organization_id=body.organization_id,
        )
    except Exception:
        logger.warning("auth.refresh.failed", exc_info=True)
        raise AppHTTPException(
            code="auth/oauth-failed",
            message="OAuth authentication failed. Please try again.",
            http_status_code=401,
        )
    if isinstance(result, ServiceAuthPending):
        raise AppHTTPException(
            code="auth/oauth-failed",
            message="OAuth authentication failed. Please try again.",
            http_status_code=401,
        )
    s = result.session
    return {
        "accessToken": s.access_token,
        "refreshToken": s.refresh_token,
        "user": {
            "id": s.user.id,
            "email": s.user.email,
            "firstName": s.user.first_name,
            "lastName": s.user.last_name,
            "emailVerified": s.user.email_verified,
            "avatar": s.user.avatar,
        },
    }


@router.post(
    "/logout",
    response_model=EmptyResponse,
    status_code=status.HTTP_200_OK,
    summary="Sign out",
    description="Signs out every account in the set: deletes their session rows and clears the cookie.",
)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> EmptyResponse:
    cookie_secret = settings.resolved_session_cookie_secret
    if cookie_secret:
        payload = _read_session_payload(request, settings, cookie_secret)
        if payload:
            repo = SessionRepository(db)
            sids = {a.get("sid") for a in (payload.get("accounts") or []) if a.get("sid")}
            active_sid = payload.get("sid")
            if active_sid:
                sids.add(active_sid)
            for sid in sids:
                await repo.delete(sid)
            logger.info("auth.logout", sessions_deleted=len(sids))
    clear_session_cookie(response, settings)
    return EmptyResponse()


@router.post(
    "/sessions/switch",
    response_model=SessionSwitchResponse,
    status_code=status.HTTP_200_OK,
    summary="Switch active account",
    description=(
        "Makes another already-signed-in account active without re-authenticating. "
        "The target sid must belong to the caller's own account set and its session "
        "row must still be valid."
    ),
    responses={**_UNAUTH, **_VALIDATION},
)
async def switch_session(
    body: SwitchSessionRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionSwitchResponse | dict[str, Any]:
    cookie_secret = _require_cookie_secret(settings)
    payload = _read_session_payload(request, settings, cookie_secret)
    if not payload:
        raise AppHTTPException(
            code="auth/no-session",
            message="No active session.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    accounts = payload.get("accounts") or []
    target = select_account(accounts, body.sid)
    if target is None:
        # The sid is not part of THIS caller's account set — never trust a
        # client-supplied sid beyond the accounts the cookie already vouches for.
        raise AppHTTPException(
            code="auth/session-not-found",
            message="That account is not signed in on this device.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    row = await db.get(Session, body.sid)
    if row is None or row.expires_at < int(time.time()):
        raise AppHTTPException(
            code="auth/session-expired",
            message="That session has expired. Please sign in again.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    sealed = seal_session(
        target,
        None,
        cookie_secret,
        ttl_seconds=_SESSION_TTL_SECONDS,
        session_id=body.sid,
        accounts=accounts,
        realm=target.get("realm") or "consumer",
        org_id=target.get("orgId"),
        cross_realm=bool(target.get("crossRealm")),
    )
    _set_session_cookie(response, sealed, settings)
    return {"object": "session", "active_sid": body.sid, "user": target}


@router.post(
    "/sessions/{sid}/signout",
    response_model=SessionSignoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Sign out one account",
    description=(
        "Signs out a single account from the set: deletes its session row and "
        "removes it from the cookie. If it was the active account, the most "
        "recently used remaining account becomes active; if it was the last "
        "account, the cookie is cleared."
    ),
    responses={**_UNAUTH},
)
async def signout_session(
    sid: str,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SessionSignoutResponse | dict[str, Any]:
    cookie_secret = _require_cookie_secret(settings)
    payload = _read_session_payload(request, settings, cookie_secret)
    if not payload:
        raise AppHTTPException(
            code="auth/no-session",
            message="No active session.",
            http_status_code=status.HTTP_401_UNAUTHORIZED,
        )

    accounts = payload.get("accounts") or []
    if select_account(accounts, sid) is None:
        raise AppHTTPException(
            code="auth/session-not-found",
            message="That account is not signed in on this device.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    await SessionRepository(db).delete(sid)
    remaining = [a for a in accounts if a.get("sid") != sid]

    if not remaining:
        clear_session_cookie(response, settings)
        return {"object": "session", "signed_out": sid, "remaining": 0}

    if payload.get("sid") == sid:
        # Signed out the active account — promote the most recent remaining
        # one, preserving ITS realm stamp (resealing with the default would
        # relabel an enterprise account as consumer and break the realm gate).
        new_active = remaining[-1]
        sealed = seal_session(
            new_active,
            None,
            cookie_secret,
            ttl_seconds=_SESSION_TTL_SECONDS,
            session_id=new_active["sid"],
            accounts=remaining,
            realm=new_active.get("realm") or "consumer",
            org_id=new_active.get("orgId"),
            cross_realm=bool(new_active.get("crossRealm")),
        )
    else:
        # Active account unchanged — keep its snapshot (and access token) intact.
        sealed = seal_session(
            payload,
            payload.get("accessToken"),
            cookie_secret,
            ttl_seconds=_SESSION_TTL_SECONDS,
            session_id=payload.get("sid"),
            accounts=remaining,
            realm=payload.get("realm") or "consumer",
            org_id=payload.get("orgId"),
            cross_realm=bool(payload.get("crossRealm")),
        )
    _set_session_cookie(response, sealed, settings)
    return {"object": "session", "signed_out": sid, "remaining": len(remaining)}


@router.get(
    "/routing/memberships",
    response_model=RoutingMembershipsResponse,
    status_code=status.HTTP_200_OK,
    summary="List memberships for routing",
    description=(
        "Internal endpoint consumed by the consumer app's server-side auth routing "
        "guards. Returns a user's memberships with their associated organization "
        "so the Next.js middleware can determine whether to route to /app (consumer) "
        "or /org/{slug} (enterprise) without an extra org lookup. "
        "Requires the internal service key (AdminDep): it can read any user's "
        "memberships, so it must never be reachable with just an app API key — "
        "the browser-facing auth bridges attach the app key to arbitrary /auth/* "
        "paths."
    ),
    responses={
        status.HTTP_200_OK: {
            "model": RoutingMembershipsResponse,
            "description": "Memberships with organizations returned.",
        },
        status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "userId query parameter is missing."},
        **_UNAUTH,
    },
)
async def get_routing_memberships(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[
        str | None,
        Query(alias="userId", description="The local user ID to look up memberships for.", examples=["usr_01..."]),
    ] = None,
    org_slug: Annotated[
        str | None,
        Query(alias="orgSlug", description="Filter results to memberships in the organization with this slug."),
    ] = None,
    membership_status: Annotated[
        str | None,
        Query(alias="status", description="Filter results to memberships with this status.", examples=["active"]),
    ] = None,
) -> RoutingMembershipsResponse:
    if not user_id or not user_id.strip():
        raise AppHTTPException(
            code="auth/invalid-input",
            message="userId is required",
            http_status_code=400,
        )

    filters = [Membership.user_id == user_id.strip()]
    if membership_status:
        filters.append(Membership.status == membership_status.strip())

    stmt = (
        select(Membership)
        .options(joinedload(Membership.organization))
        .join(Organization, Membership.organization_id == Organization.id)
        .where(*filters)
    )
    if org_slug:
        stmt = stmt.where(Organization.slug == org_slug.strip())

    stmt = stmt.order_by(Membership.created_at.desc())
    results = (await db.scalars(stmt)).unique().all()

    data = [
        RoutingMembership(
            id=m.id,
            role=m.role,
            status=m.status,
            permissions=sorted(await resolve_member_permissions(db, m)),
            organization=RoutingOrganization(
                id=m.organization.id,
                name=m.organization.name,
                slug=m.organization.slug,
                status=m.organization.status,
            ),
        )
        for m in results
    ]
    return RoutingMembershipsResponse(data=data)
