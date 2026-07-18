from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.errors import AppHTTPException
from core.security import require_api_key
from db.repositories.reserved_usernames import ReservedUsernameRepository
from db.repositories.users import UserRepository
from db.session import get_db
from domains.users.username import (
    evaluate_username,
    normalize_username,
    validate_username_format,
)
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _DummyDb:
    """evaluate_username only constructs repos with this; their methods are patched."""


class _ExistingUser:
    def __init__(self, user_id: str) -> None:
        self.id = user_id


# ── format / normalization ────────────────────────────────────────────────────


def test_normalize_username_coerces_invalid_input() -> None:
    assert normalize_username("Jane Doe!!") == "jane-doe"
    assert normalize_username("..__--") == "user"
    assert normalize_username("ADMIN") == "admin"


@pytest.mark.parametrize("value", ["abc", "jane.doe", "a_b-c", "user123"])
def test_validate_username_format_accepts_valid(value: str) -> None:
    assert validate_username_format(value) == value.lower()


@pytest.mark.parametrize(
    "value",
    ["ab", "x" * 33, "_leading", "trailing-", "has space", "emoji😀", "白菜白菜"],
)
def test_validate_username_format_rejects_invalid(value: str) -> None:
    with pytest.raises(AppHTTPException) as exc:
        validate_username_format(value)
    assert exc.value.app_code == "user/invalid-username"


# ── evaluate_username (three gates) ────────────────────────────────────────────


def _patch_gates(monkeypatch, *, reserved: bool, taken_by: str | None) -> None:
    async def fake_is_reserved(self, username: str) -> bool:
        return reserved

    async def fake_get_by_username(self, username: str, include_deleted: bool = False) -> Any:
        # The taken-check MUST include soft-deleted rows.
        assert include_deleted is True
        return _ExistingUser(taken_by) if taken_by else None

    monkeypatch.setattr(ReservedUsernameRepository, "is_reserved", fake_is_reserved)
    monkeypatch.setattr(UserRepository, "get_by_username", fake_get_by_username)


async def test_evaluate_username_invalid_format_short_circuits(monkeypatch) -> None:
    _patch_gates(monkeypatch, reserved=False, taken_by=None)
    available, code, _reason = await evaluate_username(_DummyDb(), "ab")
    assert (available, code) == (False, "invalid")


async def test_evaluate_username_reserved(monkeypatch) -> None:
    _patch_gates(monkeypatch, reserved=True, taken_by=None)
    available, code, _reason = await evaluate_username(_DummyDb(), "admin")
    assert (available, code) == (False, "reserved")


async def test_evaluate_username_taken(monkeypatch) -> None:
    _patch_gates(monkeypatch, reserved=False, taken_by="usr_other")
    available, code, _reason = await evaluate_username(_DummyDb(), "janedoe")
    assert (available, code) == (False, "taken")


async def test_evaluate_username_taken_by_self_is_available(monkeypatch) -> None:
    _patch_gates(monkeypatch, reserved=False, taken_by="usr_me")
    available, code, _reason = await evaluate_username(
        _DummyDb(), "janedoe", exclude_user_id="usr_me"
    )
    assert (available, code) == (True, "available")


async def test_evaluate_username_available(monkeypatch) -> None:
    _patch_gates(monkeypatch, reserved=False, taken_by=None)
    available, code, _reason = await evaluate_username(_DummyDb(), "freehandle")
    assert (available, code) == (True, "available")


# ── availability endpoint ──────────────────────────────────────────────────────


def _app() -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[_DummyDb]:
        yield _DummyDb()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app


async def test_username_availability_endpoint_reports_reserved(monkeypatch) -> None:
    _patch_gates(monkeypatch, reserved=True, taken_by=None)
    transport = ASGITransport(app=_app())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/users/username-availability",
            params={"username": "Admin"},
            headers=INTERNAL_HEADERS,
        )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "username_availability"
    assert body["username"] == "admin"
    assert body["available"] is False
    assert body["code"] == "reserved"
