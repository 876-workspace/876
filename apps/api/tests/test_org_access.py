"""Org access routes: permission guards, roles CRUD, member role changes, assignments.

Covers the security-sensitive behaviors of ``domains/organizations/access.py``:
permission enforcement per role, system-role immutability, owner-role
protections, and app-assignment provisioning checks.
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.org_permissions import (
    ALL_ORG_PERMISSIONS,
    DEFAULT_ORG_ROLES_BY_NAME,
    default_permissions_for_role_name,
)
from core.security import Principal, require_api_key, require_session
from db.repositories.app_assignments import AppAssignmentRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.org_roles import OrganizationRoleRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.session import get_db
from main import create_app


class _MockScalars:
    def __init__(self, value: Any) -> None:
        self.value = value

    def first(self) -> Any:
        if isinstance(self.value, list):
            return self.value[0] if self.value else None
        return self.value

    def all(self) -> Any:
        if self.value is None:
            return []
        return self.value if isinstance(self.value, list) else [self.value]

    def unique(self) -> "_MockScalars":
        return self


class _QueueDb:
    """Async-session stub whose scalars() answers come from a FIFO queue."""

    def __init__(self) -> None:
        self.scalars_queue: list[Any] = []
        self.get_returns: dict[tuple[Any, Any], Any] = {}
        self.flushed = False

    async def get(self, model: Any, ident: Any) -> Any:
        return self.get_returns.get((model, ident))

    def add(self, obj: Any) -> None:
        pass

    async def flush(self) -> None:
        self.flushed = True

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None:
        pass

    async def scalars(self, stmt: Any) -> _MockScalars:
        value = self.scalars_queue.pop(0) if self.scalars_queue else None
        return _MockScalars(value)

    async def execute(self, stmt: Any) -> Any:
        class _Result:
            rowcount = 1

            def scalar_one(self) -> int:
                return 0

        return _Result()


def _membership(role: str = "member", status: str = "active", **overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "mbr_test",
        "organization_id": "org_test",
        "user_id": "usr_test",
        "workos_membership_id": "workos_mbr_test",
        "role": role,
        "role_id": None,
        "status": status,
        "created_at": 1700000010,
        "updated_at": 1700000011,
        "user": None,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _org_role(
    name: str = "custom_auditor",
    *,
    is_system: bool = False,
    permissions: list[str] | None = None,
    **overrides: Any,
) -> Any:
    defaults: dict[str, Any] = {
        "id": f"rol_{name}",
        "organization_id": "org_test",
        "name": name,
        "display_name": name.replace("_", " ").title(),
        "description": None,
        "permissions": permissions if permissions is not None else ["org:read"],
        "is_system": is_system,
        "created_at": 1700000000,
        "updated_at": 1700000001,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _access_app(monkeypatch: Any, *, caller_membership: Any, user_id: str = "usr_test") -> tuple[Any, _QueueDb]:
    """App with a session principal whose org membership lookup is stubbed."""

    async def fake_get_by_org_and_user(self: MembershipRepository, org_id: str, uid: str) -> Any:
        return caller_membership

    monkeypatch.setattr(MembershipRepository, "get_by_org_and_user", fake_get_by_org_and_user)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = _QueueDb()

    async def fake_db() -> AsyncIterator[_QueueDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id=user_id)
    return app, db_mock


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


# ── Default role catalog invariants ──────────────────────────────────────────


def test_owner_role_has_every_org_permission() -> None:
    assert set(DEFAULT_ORG_ROLES_BY_NAME["owner"].permissions) == set(ALL_ORG_PERMISSIONS)


def test_admin_role_excludes_billing_and_org_delete() -> None:
    admin = set(DEFAULT_ORG_ROLES_BY_NAME["admin"].permissions)
    assert admin == set(ALL_ORG_PERMISSIONS) - {"billing:read", "billing:manage", "org:delete"}


def test_unknown_role_name_falls_back_to_member_permissions() -> None:
    assert default_permissions_for_role_name("warehouse_supervisor") == list(
        DEFAULT_ORG_ROLES_BY_NAME["member"].permissions
    )


def test_member_role_is_read_only() -> None:
    member = set(DEFAULT_ORG_ROLES_BY_NAME["member"].permissions)
    assert member == {"org:read", "members:read", "structure:read"}
    assert not any(p.endswith(":manage") or p.endswith(":assign") for p in member)


# ── Permission catalog route ─────────────────────────────────────────────────


async def test_permission_catalog_requires_session() -> None:
    app = create_app(Settings(internal_key="test-internal-key"))
    app.dependency_overrides[require_api_key] = lambda: True

    async with _client(app) as client:
        resp = await client.get("/organizations/permissions/catalog")

    assert resp.status_code == 401
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/no-session", "message": "No active session."},
    }


async def test_permission_catalog_returns_all_groups(monkeypatch: Any) -> None:
    app, _ = _access_app(monkeypatch, caller_membership=_membership())

    async with _client(app) as client:
        resp = await client.get("/organizations/permissions/catalog")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    group_names = [group["name"] for group in body["groups"]]
    assert group_names == ["Organization", "Billing", "Members", "Roles", "Apps", "Structure"]
    returned = {p for group in body["groups"] for p in group["permissions"]}
    assert returned == set(ALL_ORG_PERMISSIONS)


# ── Roles CRUD guards ────────────────────────────────────────────────────────


async def test_member_cannot_create_role(monkeypatch: Any) -> None:
    called = False

    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        nonlocal called
        called = True
        return None

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="member"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/roles",
            json={"name": "auditor", "display_name": "Auditor", "permissions": ["org:read"]},
        )

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }
    assert called is False


async def test_admin_creates_role_with_normalized_permissions(monkeypatch: Any) -> None:
    created_kwargs: dict[str, Any] = {}

    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        return None

    async def fake_create(self: OrganizationRoleRepository, **kwargs: Any) -> Any:
        created_kwargs.update(kwargs)
        return _org_role("auditor", permissions=kwargs["permissions"], id=kwargs["id"])

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    monkeypatch.setattr(OrganizationRoleRepository, "create", fake_create)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/roles",
            json={
                "name": "auditor",
                "display_name": "Auditor",
                # Duplicated + unsorted on purpose — route must normalize.
                "permissions": ["org:read", "billing:read", "org:read"],
            },
        )

    assert resp.status_code == 201
    assert created_kwargs["permissions"] == ["billing:read", "org:read"]
    assert created_kwargs["is_system"] is False
    assert created_kwargs["organization_id"] == "org_test"
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["permissions"] == ["billing:read", "org:read"]
    assert body["is_system"] is False
    assert body["members_count"] == 0


async def test_create_role_rejects_unknown_permission(monkeypatch: Any) -> None:
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/roles",
            json={"name": "auditor", "display_name": "Auditor", "permissions": ["payments:write"]},
        )

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "role/unknown-permission"


async def test_create_role_rejects_duplicate_name(monkeypatch: Any) -> None:
    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        return _org_role("auditor")

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/roles",
            json={"name": "auditor", "display_name": "Auditor", "permissions": ["org:read"]},
        )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "role/duplicate-name"


async def test_system_role_cannot_be_updated(monkeypatch: Any) -> None:
    async def fake_get_by_id_for_org(self: OrganizationRoleRepository, role_id: str, org_id: str) -> Any:
        return _org_role("owner", is_system=True)

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_id_for_org", fake_get_by_id_for_org)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/roles/rol_owner",
            json={"display_name": "Supreme Leader"},
        )

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "role/system-immutable"


async def test_system_role_cannot_be_deleted(monkeypatch: Any) -> None:
    async def fake_get_by_id_for_org(self: OrganizationRoleRepository, role_id: str, org_id: str) -> Any:
        return _org_role("member", is_system=True)

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_id_for_org", fake_get_by_id_for_org)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.delete("/organizations/org_test/roles/rol_member")

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "role/system-immutable"


async def test_role_in_use_cannot_be_deleted(monkeypatch: Any) -> None:
    async def fake_get_by_id_for_org(self: OrganizationRoleRepository, role_id: str, org_id: str) -> Any:
        return _org_role("auditor")

    async def fake_count_memberships(self: OrganizationRoleRepository, role_id: str) -> int:
        return 3

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_id_for_org", fake_get_by_id_for_org)
    monkeypatch.setattr(OrganizationRoleRepository, "count_memberships", fake_count_memberships)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.delete("/organizations/org_test/roles/rol_auditor")

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "role/in-use"


# ── Member role changes ──────────────────────────────────────────────────────


async def test_admin_cannot_grant_owner_role(monkeypatch: Any) -> None:
    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        return _org_role("owner", is_system=True)

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    app, db_mock = _access_app(monkeypatch, caller_membership=_membership(role="admin"))
    # Target membership lookup (joinedload select) resolves to a plain member.
    db_mock.scalars_queue = [_membership(role="member", id="mbr_target", user_id="usr_target")]

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/members/mbr_target",
            json={"role": "owner"},
        )

    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "role/owner-required"
    assert db_mock.flushed is False


async def test_last_owner_cannot_be_demoted(monkeypatch: Any) -> None:
    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        return _org_role("member", is_system=True)

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    app, db_mock = _access_app(monkeypatch, caller_membership=_membership(role="owner"))
    db_mock.scalars_queue = [
        _membership(role="owner", id="mbr_target", user_id="usr_target"),  # target lookup
        None,  # other-owners lookup — none remain
    ]

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/members/mbr_target",
            json={"role": "member"},
        )

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "role/last-owner"
    assert db_mock.flushed is False


async def test_owner_demotes_co_owner_when_another_owner_remains(monkeypatch: Any) -> None:
    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        return _org_role("member", is_system=True)

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    app, db_mock = _access_app(monkeypatch, caller_membership=_membership(role="owner"))
    target = _membership(role="owner", id="mbr_target", user_id="usr_target")
    db_mock.scalars_queue = [
        target,  # target lookup
        _membership(role="owner", id="mbr_other", user_id="usr_other"),  # another owner remains
    ]

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/members/mbr_target",
            json={"role": "member"},
        )

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["role"] == "member"
    assert body["role_id"] == "rol_member"
    assert target.role == "member"
    assert target.role_id == "rol_member"
    assert db_mock.flushed is True


async def test_member_role_update_rejects_unknown_role_name(monkeypatch: Any) -> None:
    async def fake_get_by_name(self: OrganizationRoleRepository, org_id: str, name: str) -> Any:
        return None

    monkeypatch.setattr(OrganizationRoleRepository, "get_by_name", fake_get_by_name)
    app, db_mock = _access_app(monkeypatch, caller_membership=_membership(role="admin"))
    db_mock.scalars_queue = [_membership(role="member", id="mbr_target", user_id="usr_target")]

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/members/mbr_target",
            json={"role": "ghost_role"},
        )

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "role/not-found"


# ── App assignments ──────────────────────────────────────────────────────────


async def test_member_cannot_create_app_assignment(monkeypatch: Any) -> None:
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="member"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/app-assignments",
            json={"user_id": "usr_target", "app_slug": "876-couriers"},
        )

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }


async def test_assignment_requires_org_provisioned_for_app(monkeypatch: Any) -> None:
    async def fake_subscription_get(self: SubscriptionRepository, org_id: str, app_id: str) -> Any:
        return None

    monkeypatch.setattr(SubscriptionRepository, "get", fake_subscription_get)
    app, db_mock = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    class _AppRow:
        id = "app_couriers"
        slug = "876-couriers"
        name = "876 Couriers"

    db_mock.scalars_queue = [_AppRow()]  # app-by-slug lookup

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/app-assignments",
            json={"user_id": "usr_test", "app_slug": "876-couriers"},
        )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "app-assignment/not-provisioned"


async def test_assignment_requires_app_id_or_slug(monkeypatch: Any) -> None:
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/app-assignments",
            json={"user_id": "usr_target"},
        )

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "app-assignment/validation-failed"


async def test_revoke_rejects_assignment_from_another_org(monkeypatch: Any) -> None:
    class _AssignmentRow:
        id = "asg_test"
        organization_id = "org_other"
        user_id = "usr_target"
        app_id = "app_couriers"
        app = None
        status = "active"
        assigned_by = None
        created_at = 1700000000
        updated_at = 1700000001

    async def fake_get_by_id(self: AppAssignmentRepository, assignment_id: str) -> Any:
        return _AssignmentRow()

    monkeypatch.setattr(AppAssignmentRepository, "get_by_id", fake_get_by_id)
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.delete("/organizations/org_test/app-assignments/asg_test")

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "app-assignment/not-found"


async def test_suspended_member_is_forbidden(monkeypatch: Any) -> None:
    app, _ = _access_app(monkeypatch, caller_membership=_membership(role="owner", status="suspended"))

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/app-assignments")

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }
