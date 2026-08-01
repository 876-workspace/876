"""Org location routes: duplicate-code guards on create and update.

Covers the ``domains/organizations/structure.py`` location endpoints that
Couriers mirrors its branches and warehouses into. The ``(organization_id,
code)`` uniqueness constraint spans soft-deleted rows, so a taken code must
answer 409 ``location/duplicate-code`` rather than reaching the insert and
failing as an unhandled integrity error — the mirror keys its idempotency off
that exact code.
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import Principal, require_api_key, require_session
from db.repositories.memberships import MembershipRepository
from db.repositories.org_locations import OrgLocationRepository
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
        class _Result:
            rowcount = 1

        return _Result()


def _membership(role: str = "owner", status: str = "active") -> Any:
    return SimpleNamespace(
        id="mbr_test",
        organization_id="org_test",
        user_id="usr_test",
        role=role,
        role_id=None,
        status=status,
    )


def _location(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "loc_test",
        "organization_id": "org_test",
        "name": "Kingston branch",
        "code": "br_kingston",
        "type": "branch",
        "status": "active",
        "is_primary": False,
        "phone": "+1 876 555 0100",
        "email": None,
        "line1": "12 Hope Road",
        "line2": None,
        "city": "Kingston",
        "region_id": "reg_jm_sta",
        "country_code": "JM",
        "postal_code": "JMAKN05",
        "timezone": None,
        "metadata_": None,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
        "created_at": 1700000000,
        "updated_at": 1700000001,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _locations_app(
    monkeypatch: Any,
    *,
    existing_by_id: Any = None,
    existing_by_code: Any = None,
) -> tuple[Any, _QueueDb, dict[str, Any]]:
    """App with the location repository's lookups stubbed to fixed answers."""

    calls: dict[str, Any] = {"by_code": []}

    async def fake_get_by_org_and_user(
        self: MembershipRepository, org_id: str, uid: str
    ) -> Any:
        return _membership()

    async def fake_get_by_id_for_org(
        self: OrgLocationRepository,
        location_id: str,
        org_id: str,
        include_deleted: bool = False,
    ) -> Any:
        return existing_by_id

    async def fake_get_by_code_for_org(
        self: OrgLocationRepository,
        code: str,
        org_id: str,
        include_deleted: bool = False,
    ) -> Any:
        calls["by_code"].append((code, org_id, include_deleted))
        return existing_by_code

    async def fake_create(self: OrgLocationRepository, **kwargs: Any) -> Any:
        return _location(**{k: v for k, v in kwargs.items() if k != "id"})

    async def fake_update(
        self: OrgLocationRepository, location_id: str, **kwargs: Any
    ) -> Any:
        return _location(**{k: v for k, v in kwargs.items()})

    monkeypatch.setattr(
        MembershipRepository, "get_by_org_and_user", fake_get_by_org_and_user
    )
    monkeypatch.setattr(
        OrgLocationRepository, "get_by_id_for_org", fake_get_by_id_for_org
    )
    monkeypatch.setattr(
        OrgLocationRepository, "get_by_code_for_org", fake_get_by_code_for_org
    )
    monkeypatch.setattr(OrgLocationRepository, "create", fake_create)
    monkeypatch.setattr(OrgLocationRepository, "update", fake_update)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = _QueueDb()

    async def fake_db() -> AsyncIterator[_QueueDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id="usr_test")
    return app, db_mock, calls


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_location_rejects_a_code_already_taken(monkeypatch: Any) -> None:
    app, _db, _calls = _locations_app(monkeypatch, existing_by_code=_location())

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/locations",
            json={"name": "Kingston branch", "code": "br_kingston"},
        )

    assert resp.status_code == 409
    assert resp.json() == {
        "data": None,
        "error": {
            "code": "location/duplicate-code",
            "message": "A location with this code already exists.",
        },
    }


async def test_create_location_checks_soft_deleted_rows_for_the_code(
    monkeypatch: Any,
) -> None:
    app, _db, calls = _locations_app(monkeypatch, existing_by_code=None)

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/locations",
            json={"name": "Kingston branch", "code": "br_kingston"},
        )

    assert resp.status_code == 201
    assert calls["by_code"] == [("br_kingston", "org_test", True)]


async def test_create_location_skips_the_code_check_when_no_code_is_given(
    monkeypatch: Any,
) -> None:
    app, _db, calls = _locations_app(monkeypatch, existing_by_code=_location())

    async with _client(app) as client:
        resp = await client.post(
            "/organizations/org_test/locations",
            json={"name": "Kingston branch"},
        )

    assert resp.status_code == 201
    assert calls["by_code"] == []


async def test_create_location_accepts_the_couriers_site_types(
    monkeypatch: Any,
) -> None:
    for site_type in ("branch", "warehouse"):
        app, _db, _calls = _locations_app(monkeypatch, existing_by_code=None)

        async with _client(app) as client:
            resp = await client.post(
                "/organizations/org_test/locations",
                json={
                    "name": "Miami Receiving Hub",
                    "code": "wh_miami",
                    "type": site_type,
                },
            )

        assert resp.status_code == 201
        assert resp.json()["data"]["type"] == site_type


# ── Update ────────────────────────────────────────────────────────────────────


async def test_update_location_rejects_a_code_owned_by_another_location(
    monkeypatch: Any,
) -> None:
    app, _db, _calls = _locations_app(
        monkeypatch,
        existing_by_id=_location(code="br_kingston"),
        existing_by_code=_location(id="loc_other", code="br_montego"),
    )

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/locations/loc_test",
            json={"code": "br_montego"},
        )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "location/duplicate-code"


async def test_update_location_allows_resending_its_own_code(
    monkeypatch: Any,
) -> None:
    app, _db, calls = _locations_app(
        monkeypatch,
        existing_by_id=_location(code="br_kingston"),
        existing_by_code=_location(id="loc_other", code="br_kingston"),
    )

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/locations/loc_test",
            json={"code": "br_kingston", "name": "Kingston HQ"},
        )

    assert resp.status_code == 200
    assert calls["by_code"] == []


async def test_update_location_returns_not_found_for_an_unknown_location(
    monkeypatch: Any,
) -> None:
    app, _db, _calls = _locations_app(monkeypatch, existing_by_id=None)

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/locations/loc_missing",
            json={"name": "Kingston HQ"},
        )

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "location/not-found"
