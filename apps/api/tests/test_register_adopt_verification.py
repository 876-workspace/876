"""Re-registering an existing, unverified account.

Registration deliberately *adopts* an account when the supplied password proves
ownership, so a half-finished signup can be resumed rather than rejected. The
gap this covers: adopting an account that still needs email verification issued
no new code, so the user was prompted for one that had never been sent — or one
from an abandoned signup days earlier — and every attempt came back
`invalid_one_time_code`.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from core.errors import AppHTTPException
from providers.protocol import AuthEvent
from services.auth import AuthService

EMAIL = "alejandra@example.com"
PASSWORD = "sm2uTmv6InrQH6Az"


def _provider_user(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "user_01KYR91QK88J15SDZDEQWWR65W",
        "email": EMAIL,
        "first_name": "Alejandra",
        "last_name": "Reyes",
        "email_verified": False,
        "avatar": None,
    }
    return SimpleNamespace(**{**defaults, **overrides})


class _Provider:
    """A WorkOS stand-in where the account already exists."""

    def __init__(self, login_event_kind: str | None = "email_verification_required") -> None:
        self.login_event_kind = login_event_kind
        self.verification_emails: list[str] = []

    async def register(self, **kwargs: Any) -> Any:
        raise AppHTTPException(
            code="auth/registration-failed",
            message="Could not create user.",
            http_status_code=400,
        )

    async def login(self, **kwargs: Any) -> Any:
        if self.login_event_kind is None:
            raise AppHTTPException(
                code="auth/invalid-credentials",
                message="Invalid credentials.",
                http_status_code=401,
            )
        return AuthEvent(kind=self.login_event_kind, email=EMAIL, pending_token="pat_2kL9mN4q")

    async def get_user_by_email(self, *, email: str) -> Any:
        return _provider_user()

    async def send_verification_email(self, *, user_id: str) -> None:
        self.verification_emails.append(user_id)


def _service(provider: _Provider) -> AuthService:
    service = AuthService.__new__(AuthService)
    service._provider = provider  # type: ignore[attr-defined]
    service._settings = SimpleNamespace(workos_client_id="client_2kL9mN4q")  # type: ignore[attr-defined]
    return service


class TestAdoptingAnUnverifiedAccount:
    async def test_issues_a_fresh_verification_code(self) -> None:
        provider = _Provider()
        service = _service(provider)

        await service._register_or_adopt_workos_user(
            email=EMAIL, password=PASSWORD, first_name="Alejandra", last_name="Reyes"
        )

        assert provider.verification_emails == ["user_01KYR91QK88J15SDZDEQWWR65W"]

    async def test_returns_the_existing_account_rather_than_a_new_one(self) -> None:
        provider = _Provider()
        service = _service(provider)

        user, created_now = await service._register_or_adopt_workos_user(
            email=EMAIL, password=PASSWORD, first_name="Alejandra", last_name="Reyes"
        )

        assert user.id == "user_01KYR91QK88J15SDZDEQWWR65W"
        assert created_now is False

    async def test_does_not_resend_when_verification_is_not_what_is_pending(self) -> None:
        """Only the verification flow needs a code; MFA must not trigger one."""
        provider = _Provider(login_event_kind="mfa_challenge")
        service = _service(provider)

        await service._register_or_adopt_workos_user(
            email=EMAIL, password=PASSWORD, first_name="Alejandra", last_name="Reyes"
        )

        assert provider.verification_emails == []

    async def test_a_failed_resend_does_not_fail_the_registration(self) -> None:
        """The account is usable; stranding the signup would be worse."""
        provider = _Provider()

        async def boom(*, user_id: str) -> None:
            raise RuntimeError("workos unavailable")

        provider.send_verification_email = boom  # type: ignore[assignment]
        service = _service(provider)

        user, _created = await service._register_or_adopt_workos_user(
            email=EMAIL, password=PASSWORD, first_name="Alejandra", last_name="Reyes"
        )

        assert user.id == "user_01KYR91QK88J15SDZDEQWWR65W"


class TestWrongPassword:
    async def test_reports_the_email_as_already_registered(self) -> None:
        """Without proof of ownership the account must not be adopted."""
        provider = _Provider(login_event_kind=None)
        service = _service(provider)

        with pytest.raises(AppHTTPException) as excinfo:
            await service._register_or_adopt_workos_user(
                email=EMAIL, password="wrong-password", first_name="Alejandra", last_name="Reyes"
            )

        assert excinfo.value.app_code == "auth/email-already-exists"
        assert excinfo.value.status_code == 409

    async def test_sends_no_verification_code(self) -> None:
        provider = _Provider(login_event_kind=None)
        service = _service(provider)

        with pytest.raises(AppHTTPException):
            await service._register_or_adopt_workos_user(
                email=EMAIL, password="wrong-password", first_name="Alejandra", last_name="Reyes"
            )

        assert provider.verification_emails == []
