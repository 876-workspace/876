"""Session-scoped self-service account security.

These endpoints exist so every app in the ecosystem can build an account
security screen through `@876/sdk` without the internal key. The two things
that must hold: a caller only ever sees their own rows, and the session tier
never receives the fraud-investigation fields (device fingerprint, IP address).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import Principal, require_api_key, require_session
from db.repositories.sessions import SessionRepository
from db.repositories.user_devices import UserDeviceRepository
from db.session import get_db
from main import create_app

OWNER = "user_2kL9mN4q"
STRANGER = "user_9zZ8yY7x"


class _MockDb:
    def __init__(self, session_row: Any = None) -> None:
        self._session_row = session_row

    def add(self, obj: Any) -> None: ...

    async def flush(self) -> None: ...

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None: ...

    async def execute(self, stmt: Any) -> Any: ...

    async def get(self, model: Any, ident: Any) -> Any:
        return self._session_row


def _app(session_row: Any = None, user_id: str = OWNER) -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[_MockDb]:
        yield _MockDb(session_row)

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id=user_id)
    return app


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def _device(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "dev_2kL9mN4q",
        "user_id": OWNER,
        "fingerprint": "fp_9182ab",
        "confidence": "high",
        "device_type": "mobile",
        "device_brand": "Samsung",
        "device_model": "SM-S928B",
        "os_name": "Android",
        "os_version": "15",
        "browser_name": "Chrome",
        "browser_version": "141",
        "is_bot": False,
        "label": None,
        "trusted": True,
        "blocked_at": None,
        "first_seen_at": 1_760_000_000,
        "last_seen_at": 1_760_500_000,
        "last_ip": "203.0.113.5",
        "last_country_code": "JM",
        "sign_in_count": 12,
        "signal": {"components": {"canvas": "a1b2c3"}},
        "created_at": 1_760_000_000,
        "updated_at": 1_760_500_000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _session(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "session_2kL9mN4q",
        "user_id": OWNER,
        "app_id": None,
        "expires_at": 1_799_000_000,
        "ip_address": "203.0.113.5",
        "user_agent": "Mozilla/5.0",
        "device_id": "dev_2kL9mN4q",
        "ip_country_code": "JM",
        "ip_region": "Kingston",
        "ip_city": "Kingston",
        "ip_asn": "30689",
        "ip_as_organization": "Flow Jamaica",
        "last_seen_at": 1_760_500_000,
        "revoked_at": None,
        "revoked_by": None,
        "created_at": 1_760_000_000,
        "updated_at": 1_760_500_000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


async def _async(value: Any) -> Any:
    return value


class TestListMyDevices:
    async def test_scopes_the_query_to_the_calling_user(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The caller never names a user id, so there is nothing to tamper with."""
        captured: dict[str, Any] = {}

        async def fake_list(self: Any, user_id: str, limit: int = 20) -> list[Any]:
            captured["user_id"] = user_id
            return [_device()]

        monkeypatch.setattr(UserDeviceRepository, "list_for_user", fake_list)

        async with _client(_app()) as client:
            response = await client.get("/auth/me/devices")

        assert response.status_code == 200
        assert captured["user_id"] == OWNER

    async def test_never_exposes_the_fingerprint_or_ip(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The assertion that keeps the session tier out of the fraud plane."""
        monkeypatch.setattr(UserDeviceRepository, "list_for_user", lambda self, u, limit=20: _async([_device()]))

        async with _client(_app()) as client:
            response = await client.get("/auth/me/devices")

        body = response.text
        assert "fp_9182ab" not in body
        assert "203.0.113.5" not in body
        assert "components" not in body
        assert "canvas" not in body

    async def test_returns_a_readable_device_name(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserDeviceRepository, "list_for_user", lambda self, u, limit=20: _async([_device()]))

        async with _client(_app()) as client:
            response = await client.get("/auth/me/devices")

        row = response.json()["data"]["data"][0]
        assert row["object"] == "my_device"
        assert row["name"] == "Samsung SM-S928B"
        assert row["last_country_code"] == "JM"

    async def test_prefers_an_assigned_label_for_the_name(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(
            UserDeviceRepository, "list_for_user", lambda self, u, limit=20: _async([_device(label="Work phone")])
        )

        async with _client(_app()) as client:
            response = await client.get("/auth/me/devices")

        assert response.json()["data"]["data"][0]["name"] == "Work phone"


class TestListMySessions:
    async def test_scopes_the_query_to_the_calling_user_and_active_sessions(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        captured: dict[str, Any] = {}

        async def fake_list(self: Any, **kwargs: Any) -> tuple[list[Any], bool]:
            captured.update(kwargs)
            return [_session()], False

        monkeypatch.setattr(SessionRepository, "list", fake_list)

        async with _client(_app()) as client:
            response = await client.get("/auth/me/sessions")

        assert response.status_code == 200
        assert captured["user_id"] == OWNER
        assert captured["status"] == "active"

    async def test_never_exposes_the_ip_address(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(SessionRepository, "list", lambda self, **kw: _async(([_session()], False)))

        async with _client(_app()) as client:
            response = await client.get("/auth/me/sessions")

        assert "203.0.113.5" not in response.text
        assert response.json()["data"]["data"][0]["city"] == "Kingston"


class TestRevokeMySession:
    async def test_revokes_a_session_the_caller_owns(self, monkeypatch: pytest.MonkeyPatch) -> None:
        revoked: dict[str, Any] = {}

        async def fake_revoke(self: Any, session_id: str, revoked_by: str | None = None) -> Any:
            revoked["session_id"] = session_id
            revoked["revoked_by"] = revoked_by
            return _session(revoked_at=1_760_600_000)

        monkeypatch.setattr(SessionRepository, "revoke", fake_revoke)

        async with _client(_app(session_row=_session())) as client:
            response = await client.delete("/auth/me/sessions/session_2kL9mN4q")

        assert response.status_code == 200
        assert response.json()["data"] == {
            "object": "my_session",
            "id": "session_2kL9mN4q",
            "deleted": True,
        }
        assert revoked["session_id"] == "session_2kL9mN4q"

    async def test_refuses_to_revoke_another_users_session(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Someone else's session must not be revocable by id."""

        async def fail_revoke(self: Any, *args: Any, **kwargs: Any) -> Any:
            raise AssertionError("a session belonging to another user must never be revoked")

        monkeypatch.setattr(SessionRepository, "revoke", fail_revoke)

        async with _client(_app(session_row=_session(user_id=STRANGER))) as client:
            response = await client.delete("/auth/me/sessions/session_2kL9mN4q")

        assert response.status_code == 404

    async def test_reports_another_users_session_as_missing_not_forbidden(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A 403 here would confirm the id exists, turning this into an oracle."""
        monkeypatch.setattr(SessionRepository, "revoke", lambda self, *a, **k: _async(None))

        async with _client(_app(session_row=_session(user_id=STRANGER))) as foreign:
            foreign_response = await foreign.delete("/auth/me/sessions/session_2kL9mN4q")

        async with _client(_app(session_row=None)) as missing:
            missing_response = await missing.delete("/auth/me/sessions/session_unknown")

        assert foreign_response.status_code == missing_response.status_code == 404
        assert foreign_response.json()["error"]["code"] == missing_response.json()["error"]["code"]
