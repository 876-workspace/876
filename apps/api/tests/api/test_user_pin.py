"""Account PIN endpoints.

The invariants here are lockout behaviour and the absolute rule that a hash
never leaves the database.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.pin import hash_pin
from core.security import require_api_key
from db.repositories.user_pins import UserPinRepository
from db.repositories.users import UserRepository
from db.session import get_db
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _MockDb:
    def add(self, obj: Any) -> None: ...

    async def flush(self) -> None: ...

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None: ...

    async def execute(self, stmt: Any) -> Any: ...

    async def delete(self, obj: Any) -> None: ...

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
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def _user(**overrides: Any) -> Any:
    return SimpleNamespace(**{"id": "user_2kL9mN4q", "profile": None, **overrides})


def _pin_row(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "pin_2kL9mN4q",
        "user_id": "user_2kL9mN4q",
        "scope": "account",
        "pin_hash": hash_pin("8213"),
        "algorithm": "scrypt",
        "failed_attempts": 0,
        "locked_until": None,
        "last_verified_at": None,
        "set_at": 1_760_000_000,
        "created_at": 1_760_000_000,
        "updated_at": 1_760_000_000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


@pytest.fixture(autouse=True)
def _user_exists(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return _user()

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)


async def _async(value: Any) -> Any:
    return value


class TestRetrievePinStatus:
    async def test_reports_no_pin_when_none_is_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserPinRepository, "retrieve", lambda self, user_id, scope="account": _async(None))

        async with _client(_app()) as client:
            response = await client.get("/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS)

        assert response.status_code == 200
        assert response.json()["data"] == {
            "object": "pin",
            "user_id": "user_2kL9mN4q",
            "scope": "account",
            "is_set": False,
            "set_at": None,
            "last_verified_at": None,
            "failed_attempts": 0,
            "locked_until": None,
        }

    async def test_never_returns_the_hash(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The single most important assertion on this endpoint."""
        row = _pin_row()
        monkeypatch.setattr(UserPinRepository, "retrieve", lambda self, user_id, scope="account": _async(row))

        async with _client(_app()) as client:
            response = await client.get("/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS)

        assert "pin_hash" not in response.text
        assert "scrypt" not in response.text
        assert response.json()["data"]["is_set"] is True


class TestSetPin:
    async def test_sets_a_valid_pin(self, monkeypatch: pytest.MonkeyPatch) -> None:
        captured: dict[str, Any] = {}

        async def fake_set(self: Any, user_id: str, pin: str, scope: str = "account") -> Any:
            captured["user_id"] = user_id
            captured["pin"] = pin
            return _pin_row()

        monkeypatch.setattr(UserPinRepository, "set_pin", fake_set)

        async with _client(_app()) as client:
            response = await client.post(
                "/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS, json={"pin": "8213"}
            )

        assert response.status_code == 200
        assert response.json()["data"]["is_set"] is True
        assert captured["pin"] == "8213"

    @pytest.mark.parametrize("pin", ["1234", "0000", "12", "abcd", "999999999"])
    async def test_rejects_a_weak_pin(self, monkeypatch: pytest.MonkeyPatch, pin: str) -> None:
        async def fail_set(self: Any, *args: Any, **kwargs: Any) -> Any:
            raise AssertionError("a rejected PIN must never be stored")

        monkeypatch.setattr(UserPinRepository, "set_pin", fail_set)

        async with _client(_app()) as client:
            response = await client.post("/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS, json={"pin": pin})

        assert response.status_code == 422

    async def test_never_echoes_the_pin(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(
            UserPinRepository, "set_pin", lambda self, user_id, pin, scope="account": _async(_pin_row())
        )

        async with _client(_app()) as client:
            response = await client.post(
                "/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS, json={"pin": "8213"}
            )

        assert "8213" not in response.text


class TestVerifyPin:
    async def test_verifies_the_correct_pin(self, monkeypatch: pytest.MonkeyPatch) -> None:
        row = _pin_row()
        monkeypatch.setattr(UserPinRepository, "retrieve", lambda self, user_id, scope="account": _async(row))
        monkeypatch.setattr(UserPinRepository, "record_success", lambda self, r: _async(r))

        async with _client(_app()) as client:
            response = await client.post(
                "/users/user_2kL9mN4q/pin/verify", headers=INTERNAL_HEADERS, json={"pin": "8213"}
            )

        assert response.status_code == 200
        assert response.json()["data"] == {
            "object": "pin_verification",
            "verified": True,
            "locked_until": None,
        }

    async def test_rejects_an_incorrect_pin_and_counts_the_failure(self, monkeypatch: pytest.MonkeyPatch) -> None:
        row = _pin_row()
        failures: list[Any] = []

        async def fake_failure(self: Any, r: Any) -> Any:
            failures.append(r)
            return r

        monkeypatch.setattr(UserPinRepository, "retrieve", lambda self, user_id, scope="account": _async(row))
        monkeypatch.setattr(UserPinRepository, "record_failure", fake_failure)

        async with _client(_app()) as client:
            response = await client.post(
                "/users/user_2kL9mN4q/pin/verify", headers=INTERNAL_HEADERS, json={"pin": "9999"}
            )

        assert response.status_code == 200
        assert response.json()["data"]["verified"] is False
        assert len(failures) == 1

    async def test_refuses_to_check_while_locked(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A locked PIN must not be checked at all, even with the right value."""
        import time

        locked_until = int(time.time()) + 600
        row = _pin_row(locked_until=locked_until)

        async def fail_failure(self: Any, r: Any) -> Any:
            raise AssertionError("a locked PIN must not be checked")

        monkeypatch.setattr(UserPinRepository, "retrieve", lambda self, user_id, scope="account": _async(row))
        monkeypatch.setattr(UserPinRepository, "record_failure", fail_failure)
        monkeypatch.setattr(UserPinRepository, "record_success", fail_failure)

        async with _client(_app()) as client:
            response = await client.post(
                "/users/user_2kL9mN4q/pin/verify", headers=INTERNAL_HEADERS, json={"pin": "8213"}
            )

        body = response.json()["data"]
        assert body["verified"] is False
        assert body["locked_until"] == locked_until

    async def test_returns_not_found_when_no_pin_is_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserPinRepository, "retrieve", lambda self, user_id, scope="account": _async(None))

        async with _client(_app()) as client:
            response = await client.post(
                "/users/user_2kL9mN4q/pin/verify", headers=INTERNAL_HEADERS, json={"pin": "8213"}
            )

        assert response.status_code == 404


class TestClearPin:
    async def test_returns_a_tombstone(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserPinRepository, "clear", lambda self, user_id, scope="account": _async(True))

        async with _client(_app()) as client:
            response = await client.delete("/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS)

        assert response.status_code == 200
        assert response.json()["data"] == {"object": "pin", "user_id": "user_2kL9mN4q", "deleted": True}

    async def test_returns_not_found_when_no_pin_is_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(UserPinRepository, "clear", lambda self, user_id, scope="account": _async(False))

        async with _client(_app()) as client:
            response = await client.delete("/users/user_2kL9mN4q/pin", headers=INTERNAL_HEADERS)

        assert response.status_code == 404


class TestPinAuthEnforcement:
    async def test_every_pin_route_requires_the_internal_key(self) -> None:
        app = _app()

        async with _client(app) as client:
            assert (await client.get("/users/user_2kL9mN4q/pin")).status_code in {401, 403}
            assert (
                await client.post("/users/user_2kL9mN4q/pin", json={"pin": "8213"})
            ).status_code in {401, 403}
            assert (
                await client.post("/users/user_2kL9mN4q/pin/verify", json={"pin": "8213"})
            ).status_code in {401, 403}
            assert (await client.delete("/users/user_2kL9mN4q/pin")).status_code in {401, 403}
