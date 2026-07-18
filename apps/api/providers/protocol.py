from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass(frozen=True)
class ProviderUser:
    """Provider-agnostic user representation returned by auth operations."""

    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    email_verified: bool = False
    avatar: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class AuthSession:
    """Successful authentication result — carries tokens and the provider user."""

    access_token: str
    refresh_token: str | None
    user: ProviderUser
    organization_id: str | None = None


@dataclass(frozen=True)
class AuthEvent:
    """Auth step required before a session can be issued (non-fatal, not an error).

    `kind` is the machine-readable step type:
      - 'email_verification_required'
      - 'mfa_challenge'
      - 'mfa_enrollment'
      - 'organization_selection_required'
      - 'sso_required'
      - any future WorkOS or provider-specific code
    """

    kind: str
    email: str | None = None
    pending_token: str | None = None
    organizations: list[dict[str, Any]] = field(default_factory=list)
    auth_factors: list[dict[str, Any]] = field(default_factory=list)
    connection_ids: list[str] = field(default_factory=list)


@runtime_checkable
class AuthProvider(Protocol):
    """Provider-agnostic auth interface.

    Implementations raise `AppHTTPException` for hard errors (wrong password,
    banned account, provider timeout) and return `AuthEvent` for auth-flow
    steps that require a follow-up action from the caller.
    """

    async def login(
        self,
        *,
        email: str,
        password: str,
        client_id: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuthSession | AuthEvent: ...

    async def register(
        self,
        *,
        email: str,
        password: str,
        first_name: str | None = None,
        last_name: str | None = None,
        email_verified: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> ProviderUser: ...

    async def get_user_by_email(self, *, email: str) -> ProviderUser | None: ...

    async def delete_user(self, *, user_id: str) -> None: ...

    async def send_otp(self, *, email: str, client_id: str) -> dict[str, Any]: ...

    async def verify_otp(self, *, code: str, email: str, client_id: str) -> AuthSession | AuthEvent: ...

    async def send_recovery(self, *, email: str, client_id: str) -> None: ...

    async def reset_password(self, *, token: str, new_password: str) -> ProviderUser: ...

    async def verify_email(
        self,
        *,
        code: str,
        pending_authentication_token: str,
        client_id: str,
    ) -> AuthSession | AuthEvent: ...

    async def authenticate_with_code(
        self,
        *,
        code: str,
        client_id: str,
        code_verifier: str | None = None,
        invitation_token: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuthSession | AuthEvent: ...

    async def refresh(
        self,
        *,
        refresh_token: str,
        client_id: str,
        organization_id: str | None = None,
    ) -> AuthSession | AuthEvent: ...

    async def revoke_session(self, *, session_id: str) -> None: ...

    async def create_organization(
        self,
        *,
        name: str,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...

    async def create_organization_membership(
        self,
        *,
        user_id: str,
        organization_id: str,
        role_slug: str | None = None,
    ) -> dict[str, Any]: ...

    async def delete_organization(self, *, organization_id: str) -> None: ...

    async def add_feature_target(self, *, slug: str, target_id: str) -> None: ...

    async def remove_feature_target(self, *, slug: str, target_id: str) -> None: ...

    def get_authorization_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        provider: str | None = None,
        screen_hint: str | None = None,
        login_hint: str | None = None,
        state: str | None = None,
    ) -> str: ...

    async def get_jwks(self, *, client_id: str) -> dict[str, Any]: ...
