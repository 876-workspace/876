from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Annotated, Any
from urllib.parse import urlparse

import httpx
from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings, is_platform_owner_email
from core.errors import AppHTTPException
from core.id import generate_id, generate_platform_owner_user_id
from core.logging import get_logger
from core.org_permissions import OWNER_ROLE_NAME
from core.timestamps import now_unix_seconds
from db.models import Feature, User
from db.repositories.auth_email_otps import AuthEmailOtpRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.user_features import UserFeatureRepository
from db.repositories.users import UserRepository
from db.session import get_db
from providers.protocol import AuthEvent, AuthProvider, AuthSession, ProviderUser
from providers.workos.adapter import get_auth_provider
from services.billing_customer_sync import enqueue_customer_ensure_for_user
from services.organization_bootstrap import OrganizationBootstrapService
from services.provisioning import (
    assign_member_apps,
    ensure_default_contact,
    provision_organization,
)
from utils.email import is_disposable_email_domain

logger = get_logger(__name__)


@dataclass(frozen=True)
class ServiceAuthOk:
    session: AuthSession


@dataclass(frozen=True)
class ServiceAuthPending:
    event: AuthEvent


ServiceAuthResult = ServiceAuthOk | ServiceAuthPending

# AuthEvent kinds WorkOS only returns after the submitted password was verified.
# Kinds outside this set (sso_required, email_password_auth_disabled, radar
# challenges, ...) can fire before credential validation, so they must never be
# treated as proof of account ownership when adopting an existing user.
_CREDENTIAL_PROVEN_EVENT_KINDS = frozenset(
    {
        "email_verification_required",
        "mfa_enrollment",
        "mfa_challenge",
        "organization_selection_required",
    }
)


class AuthService:
    """Business logic layer for authentication.

    Owns: input validation, email resolution, disposable domain checks,
    local DB reads/writes, feature flag grants, and provider coordination.

    Does NOT own: HTTP concerns (cookies, headers, status codes, serialization).
    Those remain in the router.
    """

    def __init__(
        self,
        provider: AuthProvider,
        db: AsyncSession,
        settings: Settings,
    ) -> None:
        self._provider = provider
        self._db = db
        self._settings = settings
        self._email_otps = AuthEmailOtpRepository(db)
        self._memberships = MembershipRepository(db)
        self._organizations = OrganizationRepository(db)
        self._organization_bootstrap = OrganizationBootstrapService(provider, db)
        self._user_features = UserFeatureRepository(db)
        self._users = UserRepository(db)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _check_required(self, val: str | None, code: str, message: str, status: int = 400) -> str:
        if not val or not val.strip():
            raise AppHTTPException(code=code, message=message, http_status_code=status)
        return val.strip()

    def _validate_email(self, email: str) -> str:
        email = email.strip().lower()
        if "@" not in email:
            raise AppHTTPException(
                code="auth/invalid-email",
                message="Please enter a valid email address.",
                http_status_code=400,
            )
        if is_disposable_email_domain(email):
            raise AppHTTPException(
                code="auth/domain-blacklisted",
                message="This email domain cannot be used to sign in or register.",
                http_status_code=403,
            )
        return email

    def _validate_password(self, password: str | None) -> str:
        pw = self._check_required(password, "auth/missing-password", "Please enter your password.")
        if len(pw) < 8:
            raise AppHTTPException(
                code="auth/invalid-password",
                message="Password must be at least 8 characters long.",
                http_status_code=400,
            )
        return pw

    def _invalid_credentials_message(self, identifier: str | None = None) -> str:
        normalized = identifier.strip() if identifier else ""
        if not normalized:
            return "The sign-in information you entered is incorrect."
        if "@" in normalized:
            return "The email or password you entered is incorrect."
        return "The username or password you entered is incorrect."

    async def _resolve_identifier(self, identifier: str) -> str:
        """Resolve username or email identifier to a canonical email address."""
        identifier = identifier.strip()
        if "@" in identifier:
            return self._validate_email(identifier)

        username = identifier.lower()
        if not (3 <= len(username) <= 32 and re.match(r"^[A-Za-z0-9._-]+$", username)):
            raise AppHTTPException(
                code="auth/invalid-identifier",
                message="Please enter a valid username or email.",
                http_status_code=400,
            )
        stmt = select(User).where(User.username == username)
        user = (await self._db.scalars(stmt)).first()
        if not user:
            raise AppHTTPException(
                code="auth/invalid-credentials",
                message=self._invalid_credentials_message(identifier),
                http_status_code=401,
            )
        return self._validate_email(user.email)

    async def _grant_default_consumer_features(self, _workos_user_id: str, local_user_id: str, now: int) -> None:
        stmt = select(Feature).where(Feature.consumer_default_enabled == True, Feature.enabled == True)  # noqa: E712
        defaults = (await self._db.scalars(stmt)).all()
        for feature in defaults:
            await self._user_features.upsert(
                user_id=local_user_id,
                feature_id=feature.id,
                id=generate_id("userFeature"),
                status="enabled",
                synced_at=now,
                created_at=now,
                updated_at=now,
            )

    async def _register_or_adopt_workos_user(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        metadata: dict[str, Any] | None = None,
    ) -> tuple[ProviderUser, bool]:
        """Return a newly registered WorkOS user or adopt one after proving credentials."""
        try:
            workos_user = await self._provider.register(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                email_verified=False,
                metadata=metadata,
            )
            return workos_user, True
        except AppHTTPException as registration_error:
            if registration_error.app_code not in {
                "auth/email-already-exists",
                "auth/registration-failed",
            }:
                raise

            try:
                login_result = await self._provider.login(
                    email=email,
                    password=password,
                    client_id=self._settings.workos_client_id,
                )
            except AppHTTPException as login_error:
                raise AppHTTPException(
                    code="auth/email-already-exists",
                    message="An account with this email already exists. Sign in to continue.",
                    http_status_code=409,
                ) from login_error

            if isinstance(login_result, AuthSession):
                return login_result.user, False

            if login_result.kind not in _CREDENTIAL_PROVEN_EVENT_KINDS:
                raise AppHTTPException(
                    code="auth/email-already-exists",
                    message="An account with this email already exists. Sign in to continue.",
                    http_status_code=409,
                ) from None

            adopted_user = await self._provider.get_user_by_email(email=email)
            if adopted_user is None:
                raise registration_error
            return adopted_user, False

    # ── Public auth operations ────────────────────────────────────────────────

    async def login(
        self,
        *,
        identifier: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ServiceAuthResult:
        identifier = self._check_required(identifier, "auth/missing-identifier", "Please enter your username or email.")
        self._check_required(password, "auth/missing-password", "Please enter your password.")

        email = await self._resolve_identifier(identifier)
        try:
            result = await self._provider.login(
                email=email,
                password=password,
                client_id=self._settings.workos_client_id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except AppHTTPException as exc:
            if exc.app_code == "auth/invalid-credentials":
                raise AppHTTPException(
                    code=exc.app_code,
                    message=self._invalid_credentials_message(identifier),
                    http_status_code=exc.status_code,
                ) from exc
            raise
        if isinstance(result, AuthEvent):
            return ServiceAuthPending(event=result)
        return ServiceAuthOk(session=result)

    async def register(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
    ) -> ServiceAuthResult:
        self._check_required(email, "auth/missing-email", "Please enter your email address.")
        first_name = self._check_required(first_name, "auth/missing-first-name", "Please enter your first name.")
        last_name = self._check_required(last_name, "auth/missing-last-name", "Please enter your last name.")
        password = self._validate_password(password)
        email = self._validate_email(email)

        workos_user, _created_now = await self._register_or_adopt_workos_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        now = now_unix_seconds()
        local_email = workos_user.email.lower().strip()
        local_user = await self._users.get_by_workos_id(workos_user.id)
        if local_user is None:
            user_id = generate_platform_owner_user_id() if is_platform_owner_email(local_email) else generate_id("user")
            local_user = await self._users.create(
                id=user_id,
                workos_user_id=workos_user.id,
                email=local_email,
                email_verified=workos_user.email_verified,
                first_name=workos_user.first_name or first_name,
                last_name=workos_user.last_name or last_name,
                avatar=workos_user.avatar,
                platform_role="owner" if is_platform_owner_email(local_email) else None,
                status="inactive",
                created_at=now,
                updated_at=now,
            )
            await enqueue_customer_ensure_for_user(self._db, local_user, now)
            await self._grant_default_consumer_features(workos_user.id, local_user.id, now)

        # Attempt login to discover if email verification is required
        login_result = await self._provider.login(
            email=email,
            password=password,
            client_id=self._settings.workos_client_id,
        )
        if isinstance(login_result, AuthEvent):
            return ServiceAuthPending(event=login_result)

        # Verification not required — activate user
        await self._users.update(
            user_id=local_user.id,
            email_verified=login_result.user.email_verified,
            status="active",
            updated_at=now,
        )
        logger.info(
            "auth.register.succeeded",
            user_id=local_user.id,
            workos_user_id=workos_user.id,
            email_verified=login_result.user.email_verified,
        )
        return ServiceAuthOk(session=login_result)

    async def register_business(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        organization_name: str,
        organization_slug: str | None,
    ) -> ServiceAuthResult:
        self._check_required(email, "auth/missing-email", "Please enter your email address.")
        first_name = self._check_required(first_name, "auth/missing-first-name", "Please enter your first name.")
        last_name = self._check_required(last_name, "auth/missing-last-name", "Please enter your last name.")
        organization_name = self._check_required(
            organization_name, "auth/missing-organization-name", "Please enter your organization name."
        )
        password = self._validate_password(password)
        email = self._validate_email(email)

        slug_val = await self._organization_bootstrap.resolve_registration_slug(
            organization_name,
            organization_slug,
        )

        workos_user, created_now = await self._register_or_adopt_workos_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            metadata={},
        )
        workos_organization_id: str | None = None

        try:
            now = now_unix_seconds()
            local_email = workos_user.email.lower().strip()
            local_user = await self._users.get_by_workos_id(workos_user.id)
            if local_user is None:
                user_id = (
                    generate_platform_owner_user_id() if is_platform_owner_email(local_email) else generate_id("user")
                )
                local_user = await self._users.create(
                    id=user_id,
                    workos_user_id=workos_user.id,
                    email=local_email,
                    email_verified=workos_user.email_verified,
                    first_name=workos_user.first_name or first_name,
                    last_name=workos_user.last_name or last_name,
                    avatar=workos_user.avatar,
                    platform_role="owner" if is_platform_owner_email(local_email) else None,
                    status="inactive",
                    created_at=now,
                    updated_at=now,
                )
                await enqueue_customer_ensure_for_user(self._db, local_user, now)

            if not created_now:
                memberships, _ = await self._memberships.list(limit=1, user_id=local_user.id)
                if memberships:
                    login_result = await self._provider.login(
                        email=email,
                        password=password,
                        client_id=self._settings.workos_client_id,
                    )
                    if isinstance(login_result, AuthEvent):
                        return ServiceAuthPending(event=login_result)
                    await self._users.update(
                        user_id=local_user.id,
                        email_verified=login_result.user.email_verified,
                        status="active",
                        updated_at=now,
                    )
                    return ServiceAuthOk(session=login_result)

            organization_id = generate_id("organization")
            workos_org = await self._provider.create_organization(
                name=organization_name,
                external_id=organization_id,
                metadata={"slug": slug_val, "owner_workos_user_id": workos_user.id},
            )
            workos_organization_id = workos_org["id"]
            workos_membership = await self._provider.create_organization_membership(
                user_id=workos_user.id,
                organization_id=workos_organization_id,
                role_slug="admin",
            )

            local_org = await self._organizations.create(
                id=organization_id,
                workos_organization_id=workos_organization_id,
                name=organization_name,
                slug=slug_val,
                status="active",
                metadata_=workos_org.get("metadata"),
                created_at=now,
                updated_at=now,
            )
            org_roles = await provision_organization(self._db, local_org.id, now)
            owner_role = org_roles.get(OWNER_ROLE_NAME)

            login_result = await self._provider.login(
                email=email,
                password=password,
                client_id=self._settings.workos_client_id,
            )
            if isinstance(login_result, AuthEvent):
                await self._memberships.create(
                    id=generate_id("membership"),
                    organization_id=local_org.id,
                    user_id=local_user.id,
                    workos_membership_id=workos_membership["id"],
                    role=OWNER_ROLE_NAME,
                    role_id=owner_role.id if owner_role else None,
                    status="invited",
                    created_at=now,
                    updated_at=now,
                )
                await ensure_default_contact(self._db, local_org.id, local_user, now)
                return ServiceAuthPending(event=login_result)

            await self._memberships.create(
                id=generate_id("membership"),
                organization_id=local_org.id,
                user_id=local_user.id,
                workos_membership_id=workos_membership["id"],
                role=OWNER_ROLE_NAME,
                role_id=owner_role.id if owner_role else None,
                status="active",
                created_at=now,
                updated_at=now,
            )
            await assign_member_apps(self._db, org_id=local_org.id, user_id=local_user.id, now=now)
            await ensure_default_contact(self._db, local_org.id, local_user, now)

            await self._users.update(
                user_id=local_user.id,
                email_verified=login_result.user.email_verified,
                status="active",
                updated_at=now,
            )
            return ServiceAuthOk(session=login_result)
        except Exception:
            if workos_organization_id is not None:
                try:
                    await self._provider.delete_organization(organization_id=workos_organization_id)
                    logger.info(
                        "auth.register_business.compensated",
                        resource="organization",
                        workos_organization_id=workos_organization_id,
                    )
                except Exception:
                    logger.warning(
                        "auth.register_business.compensation_failed",
                        resource="organization",
                        workos_organization_id=workos_organization_id,
                        exc_info=True,
                    )
            raise

    async def send_otp(self, *, email: str) -> dict[str, Any]:
        self._check_required(email, "auth/missing-email", "Please enter your email address.")
        email = self._validate_email(email)

        # Enforce cooldown
        challenge = await self._email_otps.get_by_email(email)
        now = now_unix_seconds()
        if challenge and challenge.can_resend_at and now < challenge.can_resend_at:
            raise AppHTTPException(
                code="auth/too-many-requests",
                message="Resend cooldown has not elapsed.",
                http_status_code=429,
            )

        magic_auth = await self._provider.send_otp(email=email, client_id=self._settings.workos_client_id)

        # Deliver OTP code via configured delivery URL
        otp_code: str = magic_auth.get("code") or ""
        delivery_url = os.environ.get("EMAIL_AUTH_OTP_DELIVERY_URL", "").strip()
        if delivery_url:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(delivery_url, json={"email": email, "code": otp_code, "type": "magic_otp"})
                    if not resp.is_success:
                        raise AppHTTPException(
                            code="auth/internal-error",
                            message="An unexpected error occurred during authentication. Please try again later.",
                            http_status_code=500,
                        )
            except AppHTTPException:
                raise
            except Exception:
                raise AppHTTPException(
                    code="auth/internal-error",
                    message="An unexpected error occurred during authentication. Please try again later.",
                    http_status_code=500,
                )

        challenge_id: str = magic_auth.get("id") or "dummy-id"
        can_resend_at = now + 300
        expires_at = now + 900

        await self._email_otps.upsert(
            email=email,
            pending_auth_token=challenge_id,
            email_verification_id=challenge_id,
            can_resend_at=can_resend_at,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )

        return {"email": email, "canResendAt": can_resend_at}

    async def verify_otp(self, *, code: str, email: str) -> ServiceAuthResult:
        self._check_required(email, "auth/missing-email", "Please enter your email address.")
        self._check_required(code, "auth/missing-code", "Please enter the verification code.")

        result = await self._provider.verify_otp(code=code, email=email, client_id=self._settings.workos_client_id)
        if isinstance(result, AuthEvent):
            return ServiceAuthPending(event=result)
        return ServiceAuthOk(session=result)

    async def send_recovery(self, *, email: str) -> str:
        """Send password recovery email. Returns the normalized email address."""
        self._check_required(email, "auth/missing-email", "Please enter your email address.")
        email = self._validate_email(email)
        try:
            await self._provider.send_recovery(email=email, client_id=self._settings.workos_client_id)
        except AppHTTPException as exc:
            # Silently swallow unknown-user errors to prevent account enumeration
            if exc.app_code in ("auth/oauth-failed",) and exc.status_code == 404:
                return email
            raise
        return email

    async def reset_password(self, *, token: str, new_password: str) -> str:
        """Reset password. Returns the email of the affected account."""
        self._check_required(token, "auth/invalid-token", "Invalid authentication token. Please sign in again.", 401)
        new_password = self._validate_password(new_password)
        user = await self._provider.reset_password(token=token, new_password=new_password)
        return user.email

    async def verify_email(
        self,
        *,
        code: str,
        pending_authentication_token: str,
    ) -> ServiceAuthResult:
        """Verify email via code + pending token. Returns an authenticated session."""
        self._check_required(code, "auth/missing-code", "Please enter the verification code.")
        self._check_required(
            pending_authentication_token,
            "auth/invalid-token",
            "Invalid authentication token. Please sign in again.",
            401,
        )

        result = await self._provider.verify_email(
            code=code,
            pending_authentication_token=pending_authentication_token,
            client_id=self._settings.workos_client_id,
        )

        # verify_email always produces a session (no further flow step expected)
        if isinstance(result, AuthEvent):
            # Treat unexpected auth events post-verification as an error
            raise AppHTTPException(
                code="auth/verification-failed",
                message="Email verification could not be completed. Please try again.",
                http_status_code=401,
            )

        provider_user = result.user
        email = self._validate_email(provider_user.email)

        # Upsert local user
        now = now_unix_seconds()
        local_user = await self._users.get_by_email(email)
        if local_user:
            await self._users.update(
                user_id=local_user.id,
                email=email,
                email_verified=provider_user.email_verified,
                first_name=provider_user.first_name or local_user.first_name,
                last_name=provider_user.last_name or local_user.last_name,
                avatar=provider_user.avatar or local_user.avatar,
                status="active",
                updated_at=now,
            )
        else:
            user_id = generate_platform_owner_user_id() if is_platform_owner_email(email) else generate_id("user")
            local_user = await self._users.create(
                id=user_id,
                workos_user_id=provider_user.id,
                email=email,
                email_verified=provider_user.email_verified,
                first_name=provider_user.first_name or "Unknown",
                last_name=provider_user.last_name or "User",
                avatar=provider_user.avatar,
                platform_role="owner" if is_platform_owner_email(email) else None,
                status="active",
                created_at=now,
                updated_at=now,
            )
            await enqueue_customer_ensure_for_user(self._db, local_user, now)

        return ServiceAuthOk(session=result)

    async def authenticate_with_code(
        self,
        *,
        code: str,
        code_verifier: str | None = None,
        invitation_token: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> ServiceAuthResult:
        self._check_required(code, "auth/invalid-input", "Please check your input.")
        result = await self._provider.authenticate_with_code(
            code=code,
            client_id=self._settings.workos_client_id,
            code_verifier=code_verifier,
            invitation_token=invitation_token,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        if isinstance(result, AuthEvent):
            return ServiceAuthPending(event=result)
        return ServiceAuthOk(session=result)

    async def refresh(
        self,
        *,
        refresh_token: str,
        organization_id: str | None = None,
    ) -> ServiceAuthResult:
        self._check_required(refresh_token, "auth/invalid-input", "Please check your input.")
        result = await self._provider.refresh(
            refresh_token=refresh_token,
            client_id=self._settings.workos_client_id,
            organization_id=organization_id,
        )
        if isinstance(result, AuthEvent):
            return ServiceAuthPending(event=result)
        return ServiceAuthOk(session=result)

    def get_authorization_url(
        self,
        *,
        provider: str,
        screen_hint: str | None = None,
        login_hint: str | None = None,
        redirect_origin: str | None = None,
    ) -> str:
        redirect_uri = self._resolve_workos_redirect_uri(redirect_origin)
        if not redirect_uri:
            raise AppHTTPException(
                code="auth/internal-error",
                message="WorkOS Redirect URI is not configured.",
                http_status_code=500,
            )
        return self._provider.get_authorization_url(
            client_id=self._settings.workos_client_id,
            redirect_uri=redirect_uri,
            provider=provider,
            screen_hint=screen_hint,
            login_hint=login_hint,
        )

    def _resolve_workos_redirect_uri(self, request_origin: str | None) -> str | None:
        configured = normalize_url(self._settings.workos_redirect_uri)
        request_callback = callback_uri_from_origin(request_origin)

        if request_callback and (not configured or is_local_origin(configured)):
            return request_callback

        return configured


# ── Dependency injection ──────────────────────────────────────────────────────


def get_auth_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(
        provider=get_auth_provider(settings),
        db=db,
        settings=settings,
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def callback_uri_from_origin(origin: str | None) -> str | None:
    normalized = normalize_origin(origin)
    if not normalized:
        return None

    return f"{normalized}/callback"


def normalize_origin(value: str | None) -> str | None:
    normalized = value.strip() if value else ""
    if not normalized:
        return None

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return f"{parsed.scheme}://{parsed.netloc}"


def normalize_url(value: str | None) -> str | None:
    normalized = value.strip().rstrip("/") if value else ""
    if not normalized:
        return None

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    return normalized


def is_local_origin(value: str) -> bool:
    parsed = urlparse(value)

    return parsed.hostname in {"localhost", "127.0.0.1"}
