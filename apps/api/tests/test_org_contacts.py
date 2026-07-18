"""Org contact routes: permission guards, member links, primary switching.

Covers ``domains/organizations/structure.py`` contact endpoints: reads need an
active membership, writes need ``org:update``, linked users must be active org
members, and marking a contact primary clears the previous primary.
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import Principal, require_api_key, require_session
from db.repositories.memberships import MembershipRepository
from db.repositories.org_contacts import OrgContactRepository
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
        self.executed_updates = 0
        self.added: list[Any] = []

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        pass

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None:
        pass

    async def scalars(self, stmt: Any) -> _MockScalars:
        value = self.scalars_queue.pop(0) if self.scalars_queue else None
        return _MockScalars(value)

    async def execute(self, stmt: Any) -> Any:
        self.executed_updates += 1

        class _Result:
            rowcount = 1

        return _Result()


def _membership(role: str = "member", status: str = "active", **overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "mbr_test",
        "organization_id": "org_test",
        "user_id": "usr_test",
        "role": role,
        "role_id": None,
        "status": status,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _contact(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "ctc_test",
        "organization_id": "org_test",
        "user_id": None,
        "first_name": "Alejandra",
        "last_name": "Reyes",
        "title": "Finance Director",
        "type": "billing",
        "is_primary": False,
        "email": "alejandra@example.com",
        "phone": "+1 876 555 0100",
        "mobile": None,
        "notes": None,
        "metadata_": None,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
        "created_at": 1700000000,
        "updated_at": 1700000001,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _contacts_app(
    monkeypatch: Any,
    *,
    caller_membership: Any,
    target_memberships: dict[str, Any] | None = None,
) -> tuple[Any, _QueueDb]:
    """App whose org-membership lookups resolve the caller (and optional targets)."""

    async def fake_get_by_org_and_user(self: MembershipRepository, org_id: str, uid: str) -> Any:
        if uid == "usr_test":
            return caller_membership
        return (target_memberships or {}).get(uid)

    monkeypatch.setattr(MembershipRepository, "get_by_org_and_user", fake_get_by_org_and_user)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = _QueueDb()

    async def fake_db() -> AsyncIterator[_QueueDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id="usr_test")
    return app, db_mock


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


# ── Reads ─────────────────────────────────────────────────────────────────────


async def test_list_contacts_requires_session() -> None:
    app = create_app(Settings(internal_key="test-internal-key"))
    app.dependency_overrides[require_api_key] = lambda: True

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/contacts")

    assert resp.status_code == 401
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/no-session", "message": "No active session."},
    }


async def test_list_contacts_returns_org_contacts(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership())
    db.scalars_queue.append([_contact(is_primary=True), _contact(id="ctc_other", first_name="Marcus")])

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/contacts")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "list"
    assert [item["id"] for item in body["data"]] == ["ctc_test", "ctc_other"]
    assert body["data"][0] == {
        "object": "org_contact",
        "id": "ctc_test",
        "organization_id": "org_test",
        "user_id": None,
        "first_name": "Alejandra",
        "last_name": "Reyes",
        "title": "Finance Director",
        "type": "billing",
        "is_primary": True,
        "email": "alejandra@example.com",
        "phone": "+1 876 555 0100",
        "mobile": None,
        "notes": None,
        "metadata": None,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
        "created_at": 1700000000,
        "updated_at": 1700000001,
    }


# ── Write guards ──────────────────────────────────────────────────────────────


async def test_member_cannot_create_contact(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership(role="member"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/contacts", json={"first_name": "Marcus"}
        )

    assert resp.status_code == 403
    assert db.added == []


async def test_member_cannot_delete_contact(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership(role="member"))

    async with _client(app) as client:
        resp = await client.delete("/organizations/org_test/contacts/ctc_test")

    assert resp.status_code == 403
    assert db.executed_updates == 0


# ── Creation ──────────────────────────────────────────────────────────────────


async def test_admin_creates_primary_contact_and_clears_previous(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership(role="admin"))

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/contacts",
            json={"first_name": "Marcus", "type": "technical", "is_primary": True},
        )

    assert resp.status_code == 201
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "org_contact"
    assert body["first_name"] == "Marcus"
    assert body["type"] == "technical"
    assert body["is_primary"] is True
    # clear_primary_for_org issued exactly one bulk update before the insert
    assert db.executed_updates == 1
    assert len(db.added) == 1


async def test_create_contact_rejects_non_member_user_link(monkeypatch: Any) -> None:
    app, db = _contacts_app(
        monkeypatch, caller_membership=_membership(role="admin"), target_memberships={}
    )

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/contacts",
            json={"first_name": "External", "user_id": "usr_outsider"},
        )

    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "contact/user-not-member"
    assert db.added == []


async def test_create_contact_accepts_active_member_link(monkeypatch: Any) -> None:
    app, db = _contacts_app(
        monkeypatch,
        caller_membership=_membership(role="admin"),
        target_memberships={"usr_member": _membership(id="mbr_2", user_id="usr_member")},
    )

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/contacts",
            json={
                "first_name": "Linked",
                "user_id": "usr_member",
                "type": "general",
                "is_primary": False,
            },
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["user_id"] == "usr_member"


# ── Update / delete ───────────────────────────────────────────────────────────


async def test_update_missing_contact_returns_404(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership(role="owner"))
    db.scalars_queue.append(None)  # get_by_id_for_org

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/contacts/ctc_missing", json={"title": "CEO"}
        )

    assert resp.status_code == 404


async def test_update_contact_marks_primary_and_clears_previous(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership(role="owner"))
    db.scalars_queue.append(_contact())  # get_by_id_for_org
    db.scalars_queue.append(_contact(is_primary=True))  # update(...).returning

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/contacts/ctc_test", json={"is_primary": True}
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["is_primary"] is True
    # one clear_primary bulk update + one row update
    assert db.executed_updates >= 1


async def test_delete_contact_returns_tombstone(monkeypatch: Any) -> None:
    app, db = _contacts_app(monkeypatch, caller_membership=_membership(role="owner"))
    db.scalars_queue.append(_contact())  # get_by_id_for_org

    async with _client(app) as client:
        resp = await client.delete("/organizations/org_test/contacts/ctc_test")

    assert resp.status_code == 200
    assert resp.json() == {
        "data": {"object": "org_contact", "id": "ctc_test", "deleted": True},
        "error": None,
    }
    assert db.executed_updates == 1


# ── Repository ordering contract ─────────────────────────────────────────────


def test_repository_module_exposes_expected_surface() -> None:
    surface = {name for name in dir(OrgContactRepository) if not name.startswith("_")}
    assert {
        "create",
        "delete",
        "get_by_id",
        "get_by_id_for_org",
        "list_by_org",
        "clear_primary_for_org",
        "purge",
        "update",
    } <= surface
