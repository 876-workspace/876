from __future__ import annotations

import hashlib
import secrets
import time
from typing import Any

from fastapi import Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.session import account_entry, merge_accounts, seal_session, unseal_session
from core.timestamps import now_unix_seconds
from db.models import Membership, Organization, Session, User
from db.repositories.user_app_enrollments import UserAppEnrollmentRepository
from db.repositories.users import UserRepository
from providers.protocol import AuthEvent
from services.auth import ServiceAuthOk
from services.provisioning import assign_member_apps, link_membership_role

logger = get_logger(__name__)

SESSION_TTL_SECONDS = 60 * 60 * 24 * 400

# Client-safe message shown when a banned user attempts to authenticate. Kept
# generic on purpose — never leak the internal `banned_reason` to the user.
BANNED_MESSAGE = (
    "Your account has been suspended for violating our Terms of Service. "
    "If you believe this is a mistake, please contact support."
)


def ensure_not_banned(local_user: User) -> None:
    """Refuse to mint or refresh a session for a banned user.

    Enforced at `establish_session` (the single mint point for every login,
    OAuth, OTP, and email-verification path) and again on token refresh, so a
    ban blocks new sessions regardless of entry point.
    """
    if local_user.banned:
        raise AppHTTPException(
            code="auth/account-banned",
            message=BANNED_MESSAGE,
            http_status_code=403,
        )


def serialize_local_user(user: User) -> dict[str, Any]:
    return {
        "object": "user",
        "id": user.id,
        "stripeCustomerId": user.stripe_customer_id,
        "email": user.email,
        "username": user.username,
        "emailVerified": user.email_verified,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "middleName": user.middle_name,
        "avatar": user.avatar,
        "status": user.status or "active",
        "createdAt": int(user.created_at),
        "updatedAt": int(user.updated_at),
    }


def auth_event_dict(event: AuthEvent) -> dict[str, Any]:
    return {
        "object": "auth_event",
        "type": event.kind,
        "email": event.email,
        "pendingAuthenticationToken": event.pending_token,
    }


def session_dict(local_user: User) -> dict[str, Any]:
    return {
        "object": "session",
        "user": serialize_local_user(local_user),
    }


def user_identity_dict(local_user: User) -> dict[str, Any]:
    return {
        "id": local_user.id,
        "email": local_user.email,
        "firstName": local_user.first_name,
        "lastName": local_user.last_name,
        "emailVerified": local_user.email_verified,
        "username": local_user.username,
        "avatar": local_user.avatar,
    }


def require_cookie_secret(settings: Settings) -> str:
    cookie_secret = settings.resolved_session_cookie_secret
    if not cookie_secret:
        raise AppHTTPException(
            code="auth/internal-error",
            message="Session cookie signing is not configured.",
            http_status_code=500,
        )
    return cookie_secret


def read_existing_accounts(request: Request, settings: Settings, secret: str) -> list[dict[str, Any]]:
    """Read the signed-in account set from the incoming cookie."""
    payload = read_session_payload(request, settings, secret)
    if not payload:
        return []

    accounts = payload.get("accounts")
    return accounts if isinstance(accounts, list) else []


def set_session_cookie(response: Response, sealed: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=sealed,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_SECONDS,
        path="/",
        secure=settings.resolved_cookie_secure,
    )


async def establish_session(
    request: Request,
    response: Response,
    local_user: User,
    access_token: str | None,
    db: AsyncSession,
    settings: Settings,
    *,
    realm: str = "consumer",
    org_id: str | None = None,
) -> None:
    """Create a DB-backed session row and write the multi-account cookie.

    ``realm`` is the login entry point's realm (consumer/enterprise), declared by
    the calling app via ``X-876-Realm`` and forwarded through ``complete_auth``.
    It is stamped into the sealed session cookie so the app's proxy.ts can enforce
    the realm gate without an API round-trip.
    """
    ensure_not_banned(local_user)
    cookie_secret = require_cookie_secret(settings)

    now = int(time.time())
    app_id: str | None = getattr(request.state, "app_id", None)
    session_id = generate_id("session")
    raw_token = secrets.token_urlsafe(32)
    db.add(
        Session(
            id=session_id,
            user_id=local_user.id,
            app_id=app_id,
            token=None,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=now + SESSION_TTL_SECONDS,
            created_at=now,
            updated_at=now,
        )
    )
    await db.flush()

    if app_id:
        try:
            await UserAppEnrollmentRepository(db).upsert(local_user.id, app_id, now)
        except Exception:
            logger.warning("enrollment.upsert_failed", user_id=local_user.id, app_id=app_id, exc_info=True)

    user_data = user_identity_dict(local_user)
    entry = account_entry(user_data, session_id, realm=realm, org_id=org_id)
    accounts = merge_accounts(read_existing_accounts(request, settings, cookie_secret), entry)
    sealed = seal_session(
        user_data,
        access_token,
        cookie_secret,
        ttl_seconds=SESSION_TTL_SECONDS,
        session_id=session_id,
        accounts=accounts,
        realm=realm,
        org_id=org_id,
    )
    set_session_cookie(response, sealed, settings)


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/", samesite="lax")


async def _ensure_org_membership(db: AsyncSession, *, user_id: str, org_id: str) -> None:
    """Upsert an active membership when SSO delivers an org context.

    Called only when WorkOS returns an organization_id, meaning the user
    authenticated via enterprise SSO. Creates the membership at 'member' level
    if it doesn't exist; activates it if it was previously deactivated.
    """
    stmt = select(Membership).where(
        Membership.organization_id == org_id,
        Membership.user_id == user_id,
    )
    now = now_unix_seconds()
    membership = (await db.scalars(stmt)).first()
    if membership:
        if membership.status != "active":
            membership.status = "active"
            membership.updated_at = now
            await db.flush()
        await link_membership_role(db, membership, now)
        await assign_member_apps(db, org_id=org_id, user_id=user_id, now=now)
        return

    membership = Membership(
        id=generate_id("membership"),
        organization_id=org_id,
        user_id=user_id,
        role="member",
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(membership)
    await db.flush()
    await link_membership_role(db, membership, now)
    await assign_member_apps(db, org_id=org_id, user_id=user_id, now=now)


async def complete_auth(
    request: Request,
    response: Response,
    result: ServiceAuthOk,
    db: AsyncSession,
    settings: Settings,
    *,
    realm: str | None = None,
) -> dict[str, Any]:
    """Ensure local user exists, establish a DB session + cookie, return session dict.

    ``realm`` is the login entry point's realm (consumer vs enterprise), declared
    by the calling app via the ``X-876-Realm`` request header. When not explicitly
    passed, the function reads the header from the request. Falls back to
    ``"consumer"`` when neither is present.
    """
    if realm is None:
        realm = request.headers.get("x-876-realm", "consumer")

    local_user = await UserRepository(db).ensure_from_workos(result.session.user)

    org_id: str | None = None
    workos_org_id = result.session.organization_id
    if workos_org_id:
        org_stmt = select(Organization).where(Organization.workos_organization_id == workos_org_id)
        org = (await db.scalars(org_stmt)).first()
        if org:
            org_id = org.id
            await _ensure_org_membership(db, user_id=local_user.id, org_id=org.id)

    await establish_session(
        request, response, local_user, result.session.access_token, db, settings,
        realm=realm,
        org_id=org_id,
    )
    return session_dict(local_user)


def read_session_payload(request: Request, settings: Settings, secret: str) -> dict[str, Any] | None:
    cookie = request.cookies.get(settings.session_cookie_name)
    if not cookie:
        return None

    return unseal_session(cookie, secret)
