from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import require_api_key
from db.repositories.apps import AppRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.users import UserRepository
from db.session import get_db
from main import create_app


def _app_row(**overrides: Any) -> SimpleNamespace:
    values = {
        "id": "app_test",
        "name": "Test App",
        "slug": "test-app",
        "organization_id": None,
        "client_id": "client_test",
        "client_type": "public",
        "app_kind": "external",
        "status": "active",
        "allowed_redirect_uris": [],
        "allowed_logout_uris": [],
        "logo_file_id": None,
        "logo_url": None,
        "homepage_url": None,
        "type": "web",
        "scopes_allowed": ["openid", "profile", "email"],
        "created_at": 1700000000,
        "updated_at": 1700000000,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _user_row(**overrides: Any) -> SimpleNamespace:
    values = {
        "id": "user_test",
        "workos_user_id": "workos_user_test",
        "stripe_customer_id": None,
        "email": "user@example.com",
        "username": "test-user",
        "email_verified": True,
        "first_name": "Test",
        "last_name": "User",
        "middle_name": None,
        "avatar_file_id": None,
        "avatar": None,
        "platform_role": None,
        "status": "active",
        "banned": False,
        "banned_reason": None,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
        "created_at": 1700000000,
        "updated_at": 1700000000,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _test_app() -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[SimpleNamespace]:
        yield SimpleNamespace()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app


async def test_app_logo_file_id_serializes_updates_and_clears(monkeypatch: Any) -> None:
    row = _app_row()

    async def fake_get_by_id(self: AppRepository, app_id: str) -> SimpleNamespace:
        assert app_id == row.id
        return row

    async def fake_update(self: AppRepository, app_id: str, **updates: Any) -> SimpleNamespace:
        assert app_id == row.id
        for field, value in updates.items():
            setattr(row, field, value)
        return row

    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(AppRepository, "update", fake_update)
    app = _test_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        retrieved = await client.get("/apps/app_test")
        updated = await client.patch(
            "/apps/app_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"logo_file_id": "file_app_logo"},
        )
        cleared = await client.patch(
            "/apps/app_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"logo_file_id": None},
        )

    assert retrieved.json()["data"]["logo_file_id"] is None
    assert updated.json()["data"]["logo_file_id"] == "file_app_logo"
    assert cleared.json()["data"]["logo_file_id"] is None
    assert row.logo_file_id is None


async def test_app_logo_file_id_update_remains_admin_only(monkeypatch: Any) -> None:
    async def fail_update(self: AppRepository, app_id: str, **updates: Any) -> None:
        raise AssertionError("repository update must not run without AdminDep")

    monkeypatch.setattr(AppRepository, "update", fail_update)
    app = _test_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.patch("/apps/app_test", json={"logo_file_id": "file_forbidden"})

    assert response.status_code == 401


async def test_user_avatar_file_id_serializes_updates_and_clears(monkeypatch: Any) -> None:
    row = _user_row()

    async def fake_get_by_id(
        self: UserRepository,
        user_id: str,
        include_deleted: bool = False,
    ) -> SimpleNamespace:
        assert user_id == row.id
        return row

    async def fake_update(self: UserRepository, user_id: str, **updates: Any) -> SimpleNamespace:
        assert user_id == row.id
        for field, value in updates.items():
            setattr(row, field, value)
        return row

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "update", fake_update)

    async def fake_companies_for_users(
        self: MembershipRepository,
        user_ids: list[str],
    ) -> dict[str, tuple[str, str | None, str | None]]:
        assert user_ids == [row.id]
        return {}

    monkeypatch.setattr(MembershipRepository, "companies_for_users", fake_companies_for_users)
    app = _test_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        retrieved = await client.get(
            "/users/user_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        updated = await client.patch(
            "/users/user_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"avatar_file_id": "file_user_avatar"},
        )
        cleared = await client.patch(
            "/users/user_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"avatar_file_id": None},
        )

    assert retrieved.json()["data"]["avatar_file_id"] is None
    assert updated.json()["data"]["avatar_file_id"] == "file_user_avatar"
    assert cleared.json()["data"]["avatar_file_id"] is None
    assert row.avatar_file_id is None


async def test_user_avatar_file_id_update_remains_admin_only(monkeypatch: Any) -> None:
    async def fail_get_by_id(
        self: UserRepository,
        user_id: str,
        include_deleted: bool = False,
    ) -> None:
        raise AssertionError("repository lookup must not run without AdminDep")

    monkeypatch.setattr(UserRepository, "get_by_id", fail_get_by_id)
    app = _test_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.patch("/users/user_test", json={"avatar_file_id": "file_forbidden"})

    assert response.status_code == 401
