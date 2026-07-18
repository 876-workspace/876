from __future__ import annotations

from typing import Any

import httpx

from core.logging import get_logger
from providers.protocol import AuthEvent, AuthSession, ProviderUser
from providers.workos.client import WorkOSClient, get_workos_client
from providers.workos.errors import normalize_workos_error
from providers.workos.types.auth import WorkosAuthSuccess, WorkosUser

logger = get_logger(__name__)

_AUTH_FLOW_CODES = frozenset(
    {
        "email_verification_required",
        "mfa_enrollment",
        "mfa_challenge",
        "organization_selection_required",
        "sso_required",
        "organization_authentication_methods_required",
        "authentication_method_not_allowed",
        "email_password_auth_disabled",
        "passkey_progressive_enrollment",
        "radar_challenge",
        "radar_sign_up_challenge",
    }
)


class WorkOSAuthProvider:
    """Implements AuthProvider over the raw WorkOSClient HTTP client.

    - Returns AuthSession for successful authentication.
    - Returns AuthEvent for auth-flow steps (email verification required, MFA, etc.).
    - Raises AppHTTPException for hard errors (wrong password, banned, timeout).
    """

    def __init__(self, client: WorkOSClient) -> None:
        self._client = client

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _to_provider_user(wu: WorkosUser) -> ProviderUser:
        return ProviderUser(
            id=wu.id,
            email=wu.email,
            first_name=wu.first_name,
            last_name=wu.last_name,
            email_verified=wu.email_verified,
            avatar=wu.profile_picture_url,
        )

    @staticmethod
    def _parse_success(raw: dict[str, Any]) -> AuthSession:
        success = WorkosAuthSuccess.model_validate(raw)
        return AuthSession(
            access_token=success.access_token,
            refresh_token=success.refresh_token,
            user=WorkOSAuthProvider._to_provider_user(success.user),
            organization_id=success.organization_id,
        )

    @staticmethod
    def _extract_event(exc: httpx.HTTPStatusError) -> AuthEvent | None:
        """Return AuthEvent for auth-flow codes; None for hard errors."""
        try:
            body = exc.response.json()
        except Exception:
            body = {}
        code: str = body.get("code") or body.get("error") or ""
        if code not in _AUTH_FLOW_CODES:
            return None
        return AuthEvent(
            kind=code,
            email=body.get("email"),
            pending_token=body.get("pending_authentication_token"),
            organizations=body.get("organizations") or [],
            auth_factors=body.get("authentication_factors") or [],
            connection_ids=body.get("connection_ids") or [],
        )

    def _handle_http_error(self, exc: httpx.HTTPStatusError) -> AuthEvent:
        """Return AuthEvent or raise AppHTTPException — never returns None."""
        event = self._extract_event(exc)
        if event is not None:
            return event
        logger.warning("workos.auth.hard_error", status=exc.response.status_code)
        raise normalize_workos_error(exc) from exc

    # ── Auth operations ────────────────────────────────────────────────────────

    async def login(
        self,
        *,
        email: str,
        password: str,
        client_id: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuthSession | AuthEvent:
        try:
            raw = await self._client.authenticate_with_password(
                email=email,
                password=password,
                client_id=client_id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return self._parse_success(raw)
        except httpx.HTTPStatusError as exc:
            return self._handle_http_error(exc)

    async def register(
        self,
        *,
        email: str,
        password: str,
        first_name: str | None = None,
        last_name: str | None = None,
        email_verified: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> ProviderUser:
        try:
            raw = await self._client.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                email_verified=email_verified,
                metadata=metadata,
            )
            return self._to_provider_user(WorkosUser.model_validate(raw))
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def get_user_by_email(self, *, email: str) -> ProviderUser | None:
        try:
            users = await self._client.list_users(email=email)
            if not users:
                return None
            return self._to_provider_user(WorkosUser.model_validate(users[0]))
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def delete_user(self, *, user_id: str) -> None:
        try:
            await self._client.delete_user(user_id)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def send_otp(self, *, email: str, client_id: str) -> dict[str, Any]:
        try:
            return await self._client.create_magic_auth(email=email, client_id=client_id)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def verify_otp(self, *, code: str, email: str, client_id: str) -> AuthSession | AuthEvent:
        try:
            raw = await self._client.authenticate_with_magic_auth(code=code, email=email, client_id=client_id)
            return self._parse_success(raw)
        except httpx.HTTPStatusError as exc:
            return self._handle_http_error(exc)

    async def send_recovery(self, *, email: str, client_id: str) -> None:
        try:
            await self._client.create_password_reset(email=email, client_id=client_id)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def reset_password(self, *, token: str, new_password: str) -> ProviderUser:
        try:
            raw = await self._client.reset_password(token=token, new_password=new_password)
            return self._to_provider_user(WorkosUser.model_validate(raw["user"]))
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def verify_email(
        self,
        *,
        code: str,
        pending_authentication_token: str,
        client_id: str,
    ) -> AuthSession | AuthEvent:
        try:
            raw = await self._client.authenticate_with_email_verification(
                code=code,
                pending_authentication_token=pending_authentication_token,
                client_id=client_id,
            )
            return self._parse_success(raw)
        except httpx.HTTPStatusError as exc:
            return self._handle_http_error(exc)

    async def authenticate_with_code(
        self,
        *,
        code: str,
        client_id: str,
        code_verifier: str | None = None,
        invitation_token: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuthSession | AuthEvent:
        try:
            raw = await self._client.authenticate_with_code(
                code=code,
                client_id=client_id,
                code_verifier=code_verifier,
                invitation_token=invitation_token,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return self._parse_success(raw)
        except httpx.HTTPStatusError as exc:
            return self._handle_http_error(exc)

    async def refresh(
        self,
        *,
        refresh_token: str,
        client_id: str,
        organization_id: str | None = None,
    ) -> AuthSession | AuthEvent:
        try:
            raw = await self._client.authenticate_with_refresh_token(
                refresh_token=refresh_token,
                client_id=client_id,
                organization_id=organization_id,
            )
            return self._parse_success(raw)
        except httpx.HTTPStatusError as exc:
            return self._handle_http_error(exc)

    async def revoke_session(self, *, session_id: str) -> None:
        await self._client.revoke_session(session_id=session_id)

    # ── Organization operations ───────────────────────────────────────────────

    async def create_organization(
        self,
        *,
        name: str,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            return await self._client.create_organization(name=name, external_id=external_id, metadata=metadata)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def create_organization_membership(
        self,
        *,
        user_id: str,
        organization_id: str,
        role_slug: str | None = None,
    ) -> dict[str, Any]:
        try:
            return await self._client.create_organization_membership(
                user_id=user_id,
                organization_id=organization_id,
                role_slug=role_slug,
            )
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def delete_organization(self, *, organization_id: str) -> None:
        try:
            await self._client.delete_organization(organization_id)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    # ── Feature flag operations ───────────────────────────────────────────────

    async def add_feature_target(self, *, slug: str, target_id: str) -> None:
        try:
            await self._client.add_feature_flag_target(slug=slug, target_id=target_id)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    async def remove_feature_target(self, *, slug: str, target_id: str) -> None:
        try:
            await self._client.remove_feature_flag_target(slug=slug, target_id=target_id)
        except httpx.HTTPStatusError as exc:
            raise normalize_workos_error(exc) from exc

    # ── OAuth / JWKS ─────────────────────────────────────────────────────────

    def get_authorization_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        provider: str | None = None,
        screen_hint: str | None = None,
        login_hint: str | None = None,
        state: str | None = None,
    ) -> str:
        return self._client.get_authorization_url(
            client_id=client_id,
            redirect_uri=redirect_uri,
            provider=provider,
            screen_hint=screen_hint,
            login_hint=login_hint,
            state=state,
        )

    async def get_jwks(self, *, client_id: str) -> dict[str, Any]:
        return await self._client.get_jwks(client_id=client_id)


# ── Factory ───────────────────────────────────────────────────────────────────

_provider_cache: WorkOSAuthProvider | None = None


def get_auth_provider(settings: Any) -> WorkOSAuthProvider:
    global _provider_cache
    if _provider_cache is None:
        _provider_cache = WorkOSAuthProvider(get_workos_client(settings))
    return _provider_cache
