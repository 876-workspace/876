"""Every local lifecycle write must carry its WorkOS counterpart with it.

The drift these cover is real: the admin delete/purge routes used to write only
locally, so WorkOS accumulated users and organizations that no 876 record
pointed at — accounts that could still authenticate but were invisible in
Console.
"""

from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.errors import AppHTTPException
from core.security import require_api_key
from db.repositories.memberships import MembershipRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.users import UserRepository
from db.session import get_db
from main import create_app
from services import identity_sync

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _UserRow:
    def __init__(self, *, workos_user_id: str | None = "workos_usr_test") -> None:
        self.id = "usr_test"
        self.workos_user_id = workos_user_id
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
        self.banned = False
        self.banned_reason = None
        self.deleted_at = None
        self.deleted_by = None
        self.deletion_reason = None
        self.created_at = 1700000020
        self.updated_at = 1700000021


class _OrgRow:
    def __init__(self, *, workos_organization_id: str | None = "workos_org_test") -> None:
        self.id = "org_test"
        self.workos_organization_id = workos_organization_id
        self.name = "Test Org"
        self.slug = "test-org"
        self.status = "active"
        self.deleted_at = None
        self.deleted_by = None
        self.deletion_reason = None
        self.created_at = 1700000020
        self.updated_at = 1700000021


class _MockDb:
    async def flush(self) -> None: ...

    async def execute(self, stmt: Any) -> Any: ...


class _RecordingProvider:
    """Captures the provider calls a route makes, and can be told to fail."""

    def __init__(self, *, fail_with: AppHTTPException | None = None) -> None:
        self.deleted_user_ids: list[str] = []
        self.deleted_organization_ids: list[str] = []
        self.deleted_membership_ids: list[str] = []
        self._fail_with = fail_with

    async def delete_user(self, *, user_id: str) -> None:
        if self._fail_with:
            raise self._fail_with
        self.deleted_user_ids.append(user_id)

    async def delete_organization(self, *, organization_id: str) -> None:
        if self._fail_with:
            raise self._fail_with
        self.deleted_organization_ids.append(organization_id)

    async def delete_organization_membership(self, *, membership_id: str) -> None:
        if self._fail_with:
            raise self._fail_with
        self.deleted_membership_ids.append(membership_id)


def _app_with_db() -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[_MockDb]:
        yield _MockDb()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app


def _install_provider(monkeypatch: Any, provider: _RecordingProvider) -> None:
    for module in ("domains.users.router", "domains.organizations.router", "domains.memberships.router"):
        monkeypatch.setattr(f"{module}.get_auth_provider", lambda _settings: provider)


# ── users ─────────────────────────────────────────────────────────────────────


async def test_delete_user_deletes_the_workos_user(monkeypatch: Any) -> None:
    provider = _RecordingProvider()
    _install_provider(monkeypatch, provider)

    async def fake_get_by_id(self: Any, user_id: str, include_deleted: bool = False) -> Any:
        return _UserRow()

    async def fake_delete(self: Any, user_id: str, deleted_by: Any = None, reason: Any = None) -> bool:
        return True

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "delete", fake_delete)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/users/usr_test", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    assert resp.json()["data"] == {"object": "user", "id": "usr_test", "deleted": True}
    assert provider.deleted_user_ids == ["workos_usr_test"]


async def test_purge_user_deletes_the_workos_user(monkeypatch: Any) -> None:
    provider = _RecordingProvider()
    _install_provider(monkeypatch, provider)

    async def fake_get_by_id(self: Any, user_id: str, include_deleted: bool = False) -> Any:
        return _UserRow()

    async def fake_purge(self: Any, user_id: str) -> bool:
        return True

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "purge", fake_purge)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/users/usr_test/purge", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    assert provider.deleted_user_ids == ["workos_usr_test"]


async def test_delete_user_without_a_workos_id_skips_the_provider(monkeypatch: Any) -> None:
    provider = _RecordingProvider()
    _install_provider(monkeypatch, provider)

    async def fake_get_by_id(self: Any, user_id: str, include_deleted: bool = False) -> Any:
        return _UserRow(workos_user_id=None)

    async def fake_delete(self: Any, user_id: str, deleted_by: Any = None, reason: Any = None) -> bool:
        return True

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "delete", fake_delete)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/users/usr_test", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    assert provider.deleted_user_ids == []


async def test_delete_user_surfaces_a_provider_failure(monkeypatch: Any) -> None:
    """A provider failure must fail the request so the local write rolls back."""
    provider = _RecordingProvider(
        fail_with=AppHTTPException(code="auth/oauth-failed", message="boom", http_status_code=502)
    )
    _install_provider(monkeypatch, provider)

    async def fake_get_by_id(self: Any, user_id: str, include_deleted: bool = False) -> Any:
        return _UserRow()

    async def fake_delete(self: Any, user_id: str, deleted_by: Any = None, reason: Any = None) -> bool:
        return True

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "delete", fake_delete)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/users/usr_test", headers=INTERNAL_HEADERS)

    assert resp.status_code == 502


# ── organizations ─────────────────────────────────────────────────────────────


async def test_purge_organization_deletes_the_workos_org(monkeypatch: Any) -> None:
    provider = _RecordingProvider()
    _install_provider(monkeypatch, provider)

    async def fake_get_by_id(self: Any, organization_id: str, include_deleted: bool = False) -> Any:
        return _OrgRow()

    async def fake_purge(self: Any, organization_id: str) -> bool:
        return True

    async def fake_reconcile(*args: Any, **kwargs: Any) -> None:
        return None

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(OrganizationRepository, "purge", fake_purge)
    monkeypatch.setattr("domains.organizations.router.reconcile_finance_connections", fake_reconcile)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/organizations/org_test/purge", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    assert provider.deleted_organization_ids == ["workos_org_test"]


# ── memberships ───────────────────────────────────────────────────────────────


async def test_delete_membership_deletes_the_workos_membership(monkeypatch: Any) -> None:
    provider = _RecordingProvider()
    _install_provider(monkeypatch, provider)

    class _MembershipRow:
        id = "mem_test"
        organization_id = "org_test"
        user_id = "usr_test"
        workos_membership_id = "workos_mem_test"
        role = "member"
        role_id = None
        status = "active"
        created_at = 1700000020
        updated_at = 1700000021

    async def fake_get_by_id(self: Any, membership_id: str) -> Any:
        return _MembershipRow()

    async def fake_delete(self: Any, membership_id: str, deleted_by: Any = None, reason: Any = None) -> bool:
        return True

    monkeypatch.setattr(MembershipRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(MembershipRepository, "delete", fake_delete)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/memberships/mem_test", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    assert provider.deleted_membership_ids == ["workos_mem_test"]


# ── identity_sync helpers ─────────────────────────────────────────────────────


async def test_delete_provider_user_treats_404_as_success() -> None:
    """A provider record that is already gone is the outcome the caller wanted."""

    class _GoneProvider(_RecordingProvider):
        async def delete_user(self, *, user_id: str) -> None:
            raise AppHTTPException(code="auth/oauth-failed", message="gone", http_status_code=404)

    called = await identity_sync.delete_provider_user(
        _GoneProvider(),  # type: ignore[arg-type]
        "workos_usr_test",
        local_user_id="usr_test",
    )
    assert called is False


async def test_delete_provider_user_reraises_other_failures() -> None:
    provider = _RecordingProvider(
        fail_with=AppHTTPException(code="auth/oauth-failed", message="boom", http_status_code=500)
    )
    with pytest.raises(AppHTTPException) as exc:
        await identity_sync.delete_provider_user(
            provider,  # type: ignore[arg-type]
            "workos_usr_test",
            local_user_id="usr_test",
        )
    assert exc.value.status_code == 500


async def test_ensure_provider_membership_adopts_an_existing_provider_record() -> None:
    """A retry must adopt the existing membership rather than raise on conflict."""

    class _ConflictProvider:
        async def create_organization_membership(
            self, *, user_id: str, organization_id: str, role_slug: str | None = None
        ) -> dict[str, Any]:
            raise AppHTTPException(code="auth/oauth-failed", message="exists", http_status_code=409)

        async def list_organization_memberships(
            self, *, organization_id: str | None = None, user_id: str | None = None
        ) -> list[dict[str, Any]]:
            return [{"id": "workos_mem_existing"}]

    membership_id = await identity_sync.ensure_provider_membership(
        _ConflictProvider(),  # type: ignore[arg-type]
        workos_organization_id="workos_org_test",
        workos_user_id="workos_usr_test",
        role="member",
    )
    assert membership_id == "workos_mem_existing"


async def test_ensure_provider_membership_skips_when_either_side_is_local_only() -> None:
    class _UnusedProvider:
        async def create_organization_membership(self, **kwargs: Any) -> dict[str, Any]:
            raise AssertionError("must not call the provider without both provider ids")

    membership_id = await identity_sync.ensure_provider_membership(
        _UnusedProvider(),  # type: ignore[arg-type]
        workos_organization_id=None,
        workos_user_id="workos_usr_test",
        role="member",
    )
    assert membership_id is None
