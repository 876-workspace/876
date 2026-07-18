from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.errors import AppHTTPException
from core.security import require_api_key
from db.repositories.memberships import MembershipRepository
from db.repositories.sessions import SessionRepository
from db.repositories.users import UserRepository
from db.session import get_db
from domains.auth.session_state import ensure_not_banned
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _UserRow:
    """A minimal stand-in carrying every attribute `_serialize_user` reads."""

    def __init__(self, *, banned: bool = False, banned_reason: str | None = None) -> None:
        self.id = "usr_test"
        self.workos_user_id = "workos_usr_test"
        self.stripe_customer_id = None
        self.email = "test@example.com"
        self.username = "tester"
        self.email_verified = True
        self.first_name = "Jane"
        self.last_name = "Doe"
        self.middle_name = None
        self.avatar = None
        self.role = "user"
        self.platform_role = None
        self.status = "active"
        self.banned = banned
        self.banned_reason = banned_reason
        self.deleted_at = None
        self.deleted_by = None
        self.deletion_reason = None
        self.created_at = 1700000020
        self.updated_at = 1700000021


class _MockDb:
    async def flush(self) -> None: ...

    async def execute(self, stmt: Any) -> Any: ...


def _app_with_db() -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[_MockDb]:
        yield _MockDb()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app


# ── ensure_not_banned (enforcement unit) ──────────────────────────────────────


def test_ensure_not_banned_allows_active_user() -> None:
    ensure_not_banned(_UserRow(banned=False))  # does not raise


def test_ensure_not_banned_rejects_banned_user() -> None:
    with pytest.raises(AppHTTPException) as exc:
        ensure_not_banned(_UserRow(banned=True, banned_reason="spam"))
    assert exc.value.app_code == "auth/account-banned"
    assert exc.value.status_code == 403
    # The internal reason must never leak into the client-safe message.
    assert "spam" not in exc.value.app_message


# ── ban / unban routes ────────────────────────────────────────────────────────


async def test_ban_user_revokes_sessions_and_returns_banned(monkeypatch) -> None:
    revoked: dict[str, str] = {}

    async def fake_get_by_id(self, user_id: str, include_deleted: bool = False) -> Any:
        return _UserRow(banned=False)

    async def fake_set_banned(self, user_id: str, *, banned: bool, reason: str | None = None) -> Any:
        return _UserRow(banned=banned, banned_reason=reason)

    async def fake_delete_all(self, user_id: str) -> int:
        revoked["user_id"] = user_id
        return 3

    async def fake_companies(self, ids: list[str]) -> dict[str, Any]:
        return {}

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "set_banned", fake_set_banned)
    monkeypatch.setattr(SessionRepository, "delete_all_for_user", fake_delete_all)
    monkeypatch.setattr(MembershipRepository, "companies_for_users", fake_companies)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/usr_test/ban",
            headers=INTERNAL_HEADERS,
            json={"reason": "Repeated ToS violations."},
        )

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["banned"] is True
    assert body["banned_reason"] == "Repeated ToS violations."
    assert revoked["user_id"] == "usr_test"


async def test_unban_user_clears_ban(monkeypatch) -> None:
    async def fake_get_by_id(self, user_id: str, include_deleted: bool = False) -> Any:
        return _UserRow(banned=True, banned_reason="old reason")

    async def fake_set_banned(self, user_id: str, *, banned: bool, reason: str | None = None) -> Any:
        return _UserRow(banned=banned, banned_reason=reason if banned else None)

    async def fake_companies(self, ids: list[str]) -> dict[str, Any]:
        return {}

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "set_banned", fake_set_banned)
    monkeypatch.setattr(MembershipRepository, "companies_for_users", fake_companies)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/users/usr_test/unban", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["banned"] is False
    assert body["banned_reason"] is None


async def test_ban_user_requires_internal_key() -> None:
    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/users/usr_test/ban", json={})
    assert resp.status_code in (401, 403)
