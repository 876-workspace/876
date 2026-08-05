"""Admin device / auth-attempt / session routes.

Covers the invariants that are easy to break silently later:

- every route is `AdminDep`, so the fraud plane is never public;
- `/auth-attempts/summary` resolves to the summary handler rather than being
  swallowed by `/auth-attempts/{attempt_id}`;
- a device response can never carry the raw fingerprint `components`;
- revoking a session returns a tombstone and is soft;
- the session `status` filter reaches the repository instead of being applied
  after the query, which would break pagination.
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import require_api_key
from db.repositories.auth_attempts import AuthAttemptRepository
from db.repositories.sessions import SessionRepository
from db.repositories.user_devices import UserDeviceRepository
from db.session import get_db
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _MockDb:
    async def flush(self) -> None: ...

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None: ...

    async def execute(self, stmt: Any) -> Any: ...

    async def get(self, model: Any, ident: Any) -> Any:
        return None


def _app() -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[_MockDb]:
        yield _MockDb()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _device(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "dev_2kL9mN4q",
        "user_id": "user_2kL9mN4q",
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
        "trusted": False,
        "trusted_at": None,
        "trusted_by": None,
        "blocked_at": None,
        "blocked_by": None,
        "block_reason": None,
        "first_seen_at": 1_760_000_000,
        "last_seen_at": 1_760_500_000,
        "last_ip": "203.0.113.5",
        "last_country_code": "JM",
        "sign_in_count": 12,
        # The raw fingerprinting substrate. It must never reach a response.
        "signal": {
            "visitorId": "fp_9182ab",
            "confidence": "high",
            "components": {"canvas": "a1b2c3", "webgl": "d4e5f6", "fonts": "998877"},
        },
        "created_at": 1_760_000_000,
        "updated_at": 1_760_500_000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _attempt(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "atmp_2kL9mN4q",
        "event": "login",
        "outcome": "failed",
        "failure_code": "auth/invalid-credentials",
        "identifier": "alejandra@example.com",
        "user_id": None,
        "app_id": None,
        "session_id": None,
        "realm": "consumer",
        "device_id": None,
        "device_fingerprint": "fp_9182ab",
        "ip_address": "203.0.113.5",
        "ip_country_code": "JM",
        "ip_region_code": "14",
        "ip_region": "Kingston",
        "ip_city": "Kingston",
        "ip_postal_code": None,
        "ip_timezone": "America/Jamaica",
        "ip_latitude": "17.99702",
        "ip_longitude": "-76.79358",
        "ip_asn": "30689",
        "ip_as_organization": "Flow Jamaica",
        "user_agent": "Mozilla/5.0",
        "device_type": "mobile",
        "device_brand": "Samsung",
        "device_model": "SM-S928B",
        "os_name": "Android",
        "os_version": "15",
        "browser_name": "Chrome",
        "browser_version": "141",
        "is_bot": False,
        "context_trusted": True,
        "risk_score": None,
        "risk_reasons": None,
        "request_id": None,
        "created_at": 1_760_500_000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _session(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "session_2kL9mN4q",
        "user_id": "user_2kL9mN4q",
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


class TestAdminAuthEnforcement:
    """Without the internal key none of this is reachable."""

    @pytest.mark.parametrize(
        "path",
        [
            "/devices",
            "/devices/dev_2kL9mN4q",
            "/auth-attempts",
            "/auth-attempts/summary",
            "/auth-attempts/atmp_2kL9mN4q",
            "/sessions",
            "/sessions/session_2kL9mN4q",
        ],
    )
    async def test_rejects_a_request_without_the_internal_key(self, path: str) -> None:
        app = _app()

        async with _client(app) as client:
            response = await client.get(path)

        assert response.status_code in {401, 403}

    async def test_rejects_a_revoke_without_the_internal_key(self) -> None:
        app = _app()

        async with _client(app) as client:
            response = await client.delete("/sessions/session_2kL9mN4q")

        assert response.status_code in {401, 403}


class TestDeviceSerialization:
    async def test_never_serializes_the_raw_signal_components(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserDeviceRepository, "retrieve", lambda self, device_id: _async(_device()))
        app = _app()

        async with _client(app) as client:
            response = await client.get("/devices/dev_2kL9mN4q", headers=INTERNAL_HEADERS)

        assert response.status_code == 200
        body = response.text
        assert "components" not in body
        assert "canvas" not in body
        assert "signal" not in response.json()["data"]

    async def test_returns_the_derived_device_identity(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserDeviceRepository, "retrieve", lambda self, device_id: _async(_device()))
        app = _app()

        async with _client(app) as client:
            response = await client.get("/devices/dev_2kL9mN4q", headers=INTERNAL_HEADERS)

        payload = response.json()["data"]
        assert payload["object"] == "device"
        assert payload["id"] == "dev_2kL9mN4q"
        assert payload["device_model"] == "SM-S928B"
        assert payload["fingerprint"] == "fp_9182ab"


class TestAuthAttemptRouteOrder:
    async def test_summary_resolves_to_the_summary_route(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """`/auth-attempts/summary` must not be captured by `/{attempt_id}`.

        Declaring the parameterized route first makes the summary unreachable
        while still returning 200, so only the payload shape proves the order.
        """
        captured: dict[str, Any] = {}

        async def fake_summary(self: Any, *, since: int) -> dict[str, object]:
            captured["since"] = since
            return {
                "total": 3,
                "outcomes": {"failed": 2, "succeeded": 1},
                "top_countries": [{"value": "JM", "count": 3}],
                "top_failure_codes": [{"value": "auth/invalid-credentials", "count": 2}],
                "top_failure_ips": [{"value": "203.0.113.5", "count": 2}],
            }

        async def fail_retrieve(self: Any, attempt_id: str) -> Any:
            raise AssertionError(f"summary was routed to retrieve with id {attempt_id!r}")

        monkeypatch.setattr(AuthAttemptRepository, "summary", fake_summary)
        monkeypatch.setattr(AuthAttemptRepository, "retrieve", fail_retrieve)
        app = _app()

        async with _client(app) as client:
            response = await client.get("/auth-attempts/summary", headers=INTERNAL_HEADERS)

        assert response.status_code == 200
        assert response.json()["data"]["object"] == "auth_attempt_summary"
        assert captured["since"] > 0

    async def test_an_attempt_id_still_resolves_to_retrieve(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(AuthAttemptRepository, "retrieve", lambda self, attempt_id: _async(_attempt()))
        app = _app()

        async with _client(app) as client:
            response = await client.get("/auth-attempts/atmp_2kL9mN4q", headers=INTERNAL_HEADERS)

        assert response.status_code == 200
        assert response.json()["data"]["object"] == "auth_attempt"


class TestAuthAttemptFilters:
    async def test_threads_every_filter_into_the_repository(self, monkeypatch: pytest.MonkeyPatch) -> None:
        captured: dict[str, Any] = {}

        async def fake_list(self: Any, **kwargs: Any) -> tuple[list[Any], bool]:
            captured.update(kwargs)
            return [], False

        monkeypatch.setattr(AuthAttemptRepository, "list", fake_list)
        app = _app()

        async with _client(app) as client:
            response = await client.get(
                "/auth-attempts",
                params={
                    "user_id": "user_2kL9mN4q",
                    "identifier": "alejandra@example.com",
                    "event": "login",
                    "outcome": "failed",
                    "ip_address": "203.0.113.5",
                    "ip_country_code": "JM",
                    "device_fingerprint": "fp_9182ab",
                },
                headers=INTERNAL_HEADERS,
            )

        assert response.status_code == 200
        assert captured["user_id"] == "user_2kL9mN4q"
        assert captured["identifier"] == "alejandra@example.com"
        assert captured["event"] == "login"
        assert captured["outcome"] == "failed"
        assert captured["ip_address"] == "203.0.113.5"
        assert captured["ip_country_code"] == "JM"
        assert captured["device_fingerprint"] == "fp_9182ab"


class TestSessionRevocation:
    async def test_revoke_returns_a_tombstone(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(
            SessionRepository,
            "revoke",
            lambda self, session_id, revoked_by=None: _async(_session(revoked_at=1_760_600_000)),
        )
        app = _app()

        async with _client(app) as client:
            response = await client.delete("/sessions/session_2kL9mN4q", headers=INTERNAL_HEADERS)

        assert response.status_code == 200
        assert response.json()["data"] == {"object": "session", "id": "session_2kL9mN4q", "deleted": True}


class TestSessionStatusFilter:
    @pytest.mark.parametrize("status_value", ["active", "revoked", "expired"])
    async def test_threads_the_status_filter_into_the_repository(
        self, monkeypatch: pytest.MonkeyPatch, status_value: str
    ) -> None:
        """Revoked and expired must be separable in the query itself.

        Splitting them after the fact would make `has_more` describe the
        unsplit set, silently corrupting pagination.
        """
        captured: dict[str, Any] = {}

        async def fake_list(self: Any, **kwargs: Any) -> tuple[list[Any], bool]:
            captured.update(kwargs)
            return [], False

        monkeypatch.setattr(SessionRepository, "list", fake_list)
        app = _app()

        async with _client(app) as client:
            response = await client.get(
                "/sessions", params={"status": status_value}, headers=INTERNAL_HEADERS
            )

        assert response.status_code == 200
        assert captured["status"] == status_value

    async def test_rejects_an_unknown_status(self) -> None:
        app = _app()

        async with _client(app) as client:
            response = await client.get("/sessions", params={"status": "banana"}, headers=INTERNAL_HEADERS)

        assert response.status_code == 422


async def _async(value: Any) -> Any:
    return value
