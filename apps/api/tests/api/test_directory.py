from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import require_api_key
from db.repositories.directory import DirectoryRepository
from db.session import get_db
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _MockDb:
    def __init__(self) -> None:
        self.scalars_return: Any = None
        self.scalars_queue: list[Any] = []

    async def flush(self) -> None:
        pass

    async def refresh(self, obj: Any) -> None:
        pass

    async def scalars(self, stmt: Any) -> Any:
        val = self.scalars_queue.pop(0) if self.scalars_queue else self.scalars_return

        class _MockResult:
            def first(self) -> Any:
                return val

            def one(self) -> Any:
                return val

            def all(self) -> list[Any]:
                return val if isinstance(val, list) else [val] if val is not None else []

            def unique(self) -> Any:
                return self

        return _MockResult()

    async def execute(self, stmt: Any) -> Any:
        class _MockExecuteResult:
            rowcount = 1

        return _MockExecuteResult()


def _directory_app(monkeypatch: Any) -> tuple[Any, _MockDb]:
    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = _MockDb()

    async def fake_db() -> AsyncIterator[_MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app, db_mock


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


def _bank(**overrides: Any) -> Any:
    defaults = {
        "id": "bank_test",
        "name": "National Commercial Bank",
        "short_name": None,
        "bank_code": "01",
        "swift_code": None,
        "logo_url": None,
        "head_office": "Kingston",
        "website": None,
        "created_at": 1700000000,
        "updated_at": 1700000000,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _address(**overrides: Any) -> Any:
    defaults = {
        "id": "diraddr_test",
        "line1": "1 Knutsford Blvd",
        "line2": None,
        "city": "Kingston",
        "state": "St. Andrew",
        "postal_code": None,
        "country": "JM",
        "latitude": 18.012,
        "longitude": -76.791,
        "created_at": 1700000000,
        "updated_at": 1700000000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _branch(**overrides: Any) -> Any:
    defaults = {
        "id": "bkbr_test",
        "bank_id": "bank_test",
        "name": "Half Way Tree",
        "transit_number": "12345",
        "routing_number": None,
        "address_id": "diraddr_test",
        "contact_number": None,
        "operating_hours": None,
        "address": _address(),
        "created_at": 1700000000,
        "updated_at": 1700000000,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
    }
    return SimpleNamespace(**{**defaults, **overrides})


# ── Tests ─────────────────────────────────────────────────────────────────────

async def test_bank_create_success(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async def fake_get_bank_by_code(self: Any, code: str, include_deleted: bool = False) -> Any:
        return None

    async def fake_create_bank(self: Any, **kwargs: Any) -> Any:
        return _bank(**kwargs)

    monkeypatch.setattr(DirectoryRepository, "get_bank_by_code", fake_get_bank_by_code)
    monkeypatch.setattr(DirectoryRepository, "create_bank", fake_create_bank)

    async with _client(app) as client:
        resp = await client.post(
            "/directory/banks",
            json={
                "name": "National Commercial Bank",
                "bank_code": "01",
                "head_office": "Kingston",
            },
            headers=INTERNAL_HEADERS,
        )

    assert resp.status_code == 201
    assert resp.json() == {
        "data": {
            "object": "bank",
            "id": "bank_test",
            "name": "National Commercial Bank",
            "bank_code": "01",
            "head_office": "Kingston",
            "short_name": None,
            "swift_code": None,
            "logo_url": None,
            "website": None,
            "created_at": 1700000000,
            "updated_at": 1700000000,
        },
        "error": None,
    }


async def test_bank_create_without_internal_key_rejected(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async with _client(app) as client:
        resp = await client.post(
            "/directory/banks",
            json={
                "name": "National Commercial Bank",
                "bank_code": "01",
                "head_office": "Kingston",
            },
            # missing internal key!
        )

    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "auth/no-session"


async def test_bank_list_returns_envelope(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async def fake_list_banks(self: Any, **kwargs: Any) -> Any:
        return [_bank()], False

    monkeypatch.setattr(DirectoryRepository, "list_banks", fake_list_banks)

    async with _client(app) as client:
        resp = await client.get("/directory/banks")

    assert resp.status_code == 200
    assert resp.json() == {
        "data": {
            "object": "list",
            "data": [
                {
                    "object": "bank",
                    "id": "bank_test",
                    "name": "National Commercial Bank",
                    "bank_code": "01",
                    "head_office": "Kingston",
                    "short_name": None,
                    "swift_code": None,
                    "logo_url": None,
                    "website": None,
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ],
            "has_more": False,
            "url": "/directory/banks",
            "total_count": None,
        },
        "error": None,
    }


async def test_bank_branch_create_success(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async def fake_get_bank_by_id(self: Any, bank_id: str, include_deleted: bool = False) -> Any:
        return _bank()

    async def fake_create_branch(self: Any, bank_id: str, address: dict[str, Any], **kwargs: Any) -> Any:
        return _branch(bank_id=bank_id, address=_address(**address), **kwargs)

    monkeypatch.setattr(DirectoryRepository, "get_bank_by_id", fake_get_bank_by_id)
    monkeypatch.setattr(DirectoryRepository, "create_branch", fake_create_branch)

    # Mock DB scalars returning None for the uniqueness check
    db.scalars_return = None

    async with _client(app) as client:
        resp = await client.post(
            "/directory/banks/bank_test/branches",
            json={
                "name": "Half Way Tree",
                "transit_number": "12345",
                "address": {
                    "line1": "1 Knutsford Blvd",
                    "city": "Kingston",
                    "state": "St. Andrew",
                    "latitude": 18.012,
                    "longitude": -76.791,
                },
            },
            headers=INTERNAL_HEADERS,
        )

    assert resp.status_code == 201
    assert resp.json() == {
        "data": {
            "object": "bank_branch",
            "id": "bkbr_test",
            "bank_id": "bank_test",
            "name": "Half Way Tree",
            "transit_number": "12345",
            "routing_number": None,
            "address_id": "diraddr_test",
            "contact_number": None,
            "operating_hours": None,
            "address": {
                "object": "directory_address",
                "id": "diraddr_test",
                "line1": "1 Knutsford Blvd",
                "line2": None,
                "city": "Kingston",
                "state": "St. Andrew",
                "postal_code": None,
                "country": "JM",
                "latitude": 18.012,
                "longitude": -76.791,
                "created_at": 1700000000,
                "updated_at": 1700000000,
            },
            "created_at": 1700000000,
            "updated_at": 1700000000,
        },
        "error": None,
    }


async def test_bank_branch_create_out_of_range_coordinates_rejected(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async with _client(app) as client:
        resp = await client.post(
            "/directory/banks/bank_test/branches",
            json={
                "name": "Half Way Tree",
                "transit_number": "12345",
                "address": {
                    "line1": "1 Knutsford Blvd",
                    "city": "Kingston",
                    "state": "St. Andrew",
                    "latitude": 100.0,  # out of range!
                    "longitude": -76.791,
                },
            },
            headers=INTERNAL_HEADERS,
        )

    assert resp.status_code == 422


async def test_bank_delete_returns_tombstone(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async def fake_delete_bank(self: Any, bank_id: str, **kwargs: Any) -> bool:
        return True

    monkeypatch.setattr(DirectoryRepository, "delete_bank", fake_delete_bank)

    async with _client(app) as client:
        resp = await client.delete(
            "/directory/banks/bank_test",
            headers=INTERNAL_HEADERS,
        )

    assert resp.status_code == 200
    assert resp.json() == {
        "data": {
            "object": "bank",
            "id": "bank_test",
            "deleted": True,
        },
        "error": None,
    }


async def test_bank_accounts_list_without_internal_key_rejected(monkeypatch: Any) -> None:
    app, db = _directory_app(monkeypatch)

    async with _client(app) as client:
        resp = await client.get(
            "/directory/bank-accounts",
            # missing internal key!
        )

    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "auth/no-session"
