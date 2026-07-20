"""User identification routes: masking, validation, disclosure entitlement.

Covers `domains/users/router.py`'s `/users/{user_id}/identifications*` routes
per `.claude/rules/customer-architecture.md`: list/create/update/delete only
ever expose the masked value; the dedicated `/disclose` route is the only
place the raw value is returned, gated by (1) the type's app allowlist in
`core/identifications.py` and (2) an active org subscription to that app, and
always writes an audit event that never carries the value.
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import require_api_key
from db.repositories.audit_events import AuditEventRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.repositories.user_identifications import UserIdentificationRepository
from db.repositories.users import UserRepository
from db.session import get_db
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _MockDb:
    async def flush(self) -> None: ...

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None: ...

    async def execute(self, stmt: Any) -> Any: ...


def _app_with_db() -> Any:
    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[_MockDb]:
        yield _MockDb()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    return app


def _user(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {"id": "user_test"}
    return SimpleNamespace(**{**defaults, **overrides})


def _identification(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "uident_test",
        "user_id": "user_test",
        "type": "trn",
        "value": "123456789",
        "country_code": "JM",
        "verified": False,
        "verified_at": None,
        "verified_by": None,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
        "created_at": 1700000000,
        "updated_at": 1700000000,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _subscription(*, status: str = "active", app_slug: str = "876-couriers") -> Any:
    app_row = SimpleNamespace(id="app_couriers", slug=app_slug, name="876 Couriers")
    return SimpleNamespace(id="sub_test", status=status, app=app_row)


# ── list ────────────────────────────────────────────────────────────────────


async def test_list_user_identifications_masks_values(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return _user()

    async def fake_list_by_user(self: UserIdentificationRepository, user_id: str, include_deleted: bool = False) -> Any:
        return [
            _identification(id="uident_trn", type="trn", value="123456789", country_code="JM"),
            _identification(id="uident_passport", type="passport", value="AB1234567", country_code=None),
        ]

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserIdentificationRepository, "list_by_user", fake_list_by_user)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/users/user_test/identifications", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    rows = payload["data"]["data"]
    assert len(rows) == 2

    trn_row = next(r for r in rows if r["type"] == "trn")
    assert trn_row["value_masked"] == "••••••789"
    assert "value" not in trn_row
    assert "123456" not in trn_row["value_masked"]
    assert trn_row["label"] == "Taxpayer Registration Number"

    passport_row = next(r for r in rows if r["type"] == "passport")
    assert passport_row["value_masked"] == "••••••567"
    assert "value" not in passport_row


async def test_list_user_identifications_requires_existing_user(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return None

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/users/user_missing/identifications", headers=INTERNAL_HEADERS)

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "user/not-found"


# ── create ──────────────────────────────────────────────────────────────────


async def test_create_user_identification_happy_path(monkeypatch: Any) -> None:
    created: dict[str, Any] = {}

    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return _user()

    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return None

    async def fake_create(self: UserIdentificationRepository, **kwargs: Any) -> Any:
        created.update(kwargs)
        return _identification(**{**kwargs, "id": "uident_new"})

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(UserIdentificationRepository, "create", fake_create)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications",
            headers=INTERNAL_HEADERS,
            json={"type": "trn", "value": "123-456-789"},
        )

    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["type"] == "trn"
    assert body["value_masked"] == "••••••789"
    assert "value" not in body
    # Dashes stripped; TRN keeps digits only.
    assert created["value"] == "123456789"
    # Country code defaults from the type registry when omitted.
    assert created["country_code"] == "JM"
    assert created["verified"] is False
    assert created["verified_at"] is None
    assert created["verified_by"] is None


async def test_create_user_identification_rejects_unknown_type(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return _user()

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications",
            headers=INTERNAL_HEADERS,
            json={"type": "social_security", "value": "123456789"},
        )

    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "identification/unknown-type"


async def test_create_user_identification_rejects_invalid_trn_value(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return _user()

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications",
            headers=INTERNAL_HEADERS,
            # Too short after normalization (8 digits, not 9).
            json={"type": "trn", "value": "12345678"},
        )

    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "identification/invalid-value"


async def test_create_user_identification_conflicts_on_duplicate(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return _user()

    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification()

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications",
            headers=INTERNAL_HEADERS,
            json={"type": "trn", "value": "123456789"},
        )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "identification/already-exists"


async def test_create_user_identification_requires_existing_user(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str, include_deleted: bool = False) -> Any:
        return None

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_missing/identifications",
            headers=INTERNAL_HEADERS,
            json={"type": "trn", "value": "123456789"},
        )

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "user/not-found"


# ── update ──────────────────────────────────────────────────────────────────


async def test_update_user_identification_resets_verification(monkeypatch: Any) -> None:
    updated_kwargs: dict[str, Any] = {}

    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification(verified=True, verified_at=1700000005, verified_by="admin_1")

    async def fake_update_value(self: UserIdentificationRepository, identification_id: str, **kwargs: Any) -> Any:
        updated_kwargs.update(kwargs)
        return _identification(**{k: v for k, v in kwargs.items() if k != "value"}, value=kwargs["value"])

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(UserIdentificationRepository, "update_value", fake_update_value)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/users/user_test/identifications/trn",
            headers=INTERNAL_HEADERS,
            json={"value": "987 654 321"},
        )

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["verified"] is False
    assert body["verified_at"] is None
    assert updated_kwargs["value"] == "987654321"
    assert updated_kwargs["verified"] is False
    assert updated_kwargs["verified_at"] is None
    assert updated_kwargs["verified_by"] is None


async def test_update_user_identification_not_found(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return None

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/users/user_test/identifications/trn",
            headers=INTERNAL_HEADERS,
            json={"value": "123456789"},
        )

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "identification/not-found"


async def test_update_user_identification_rejects_invalid_value(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification()

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/users/user_test/identifications/trn",
            headers=INTERNAL_HEADERS,
            json={"value": "not-a-trn"},
        )

    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "identification/invalid-value"


# ── delete ──────────────────────────────────────────────────────────────────


async def test_delete_user_identification_returns_tombstone(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification(id="uident_delete_me")

    async def fake_delete(
        self: UserIdentificationRepository,
        identification_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        assert identification_id == "uident_delete_me"
        return True

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(UserIdentificationRepository, "delete", fake_delete)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/users/user_test/identifications/trn", headers=INTERNAL_HEADERS)

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body == {"object": "user_identification", "id": "uident_delete_me", "deleted": True}


async def test_delete_user_identification_not_found(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return None

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/users/user_test/identifications/trn", headers=INTERNAL_HEADERS)

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "identification/not-found"


# ── disclose ────────────────────────────────────────────────────────────────


async def test_disclose_user_identification_happy_path(monkeypatch: Any) -> None:
    audit_calls: list[dict[str, Any]] = []

    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification(value="123456789", verified=True)

    async def fake_get_by_app_slug(self: SubscriptionRepository, org_id: str, app_slug: str) -> Any:
        return _subscription(status="active", app_slug=app_slug)

    async def fake_audit_create(self: AuditEventRepository, **kwargs: Any) -> Any:
        audit_calls.append(kwargs)
        return SimpleNamespace(**kwargs)

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(SubscriptionRepository, "get_by_app_slug", fake_get_by_app_slug)
    monkeypatch.setattr(AuditEventRepository, "create", fake_audit_create)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/disclose",
            headers=INTERNAL_HEADERS,
            json={"organization_id": "org_test", "app_slug": "876-couriers", "reason": "JCA customs clearance"},
        )

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body == {
        "object": "user_identification_disclosure",
        "type": "trn",
        "value": "123456789",
        "country_code": "JM",
        "verified": True,
        "disclosed_at": body["disclosed_at"],
    }

    assert len(audit_calls) == 1
    call = audit_calls[0]
    assert call["event"] == "user_identification.disclosed"
    assert call["user_id"] == "user_test"
    assert call["properties"] == {
        "organization_id": "org_test",
        "app_slug": "876-couriers",
        "identification_type": "trn",
        "reason": "JCA customs clearance",
    }
    # The raw value must never be written to the audit trail.
    assert "123456789" not in str(call)


async def test_disclose_user_identification_not_found(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return None

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/disclose",
            headers=INTERNAL_HEADERS,
            json={"organization_id": "org_test", "app_slug": "876-couriers"},
        )

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "identification/not-found"


async def test_disclose_user_identification_rejects_non_allowlisted_app(monkeypatch: Any) -> None:
    subscription_calls: list[Any] = []

    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification()

    async def fake_get_by_app_slug(self: SubscriptionRepository, org_id: str, app_slug: str) -> Any:
        subscription_calls.append(app_slug)
        return _subscription(status="active", app_slug=app_slug)

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(SubscriptionRepository, "get_by_app_slug", fake_get_by_app_slug)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/disclose",
            headers=INTERNAL_HEADERS,
            json={"organization_id": "org_test", "app_slug": "876-billing"},
        )

    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "identification/app-not-entitled"
    # The subscription lookup must not run once the entitlement gate rejects the app.
    assert subscription_calls == []


async def test_disclose_user_identification_rejects_missing_subscription(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification()

    async def fake_get_by_app_slug(self: SubscriptionRepository, org_id: str, app_slug: str) -> Any:
        return None

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(SubscriptionRepository, "get_by_app_slug", fake_get_by_app_slug)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/disclose",
            headers=INTERNAL_HEADERS,
            json={"organization_id": "org_test", "app_slug": "876-couriers"},
        )

    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "identification/subscription-required"


async def test_disclose_user_identification_rejects_inactive_subscription(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification()

    async def fake_get_by_app_slug(self: SubscriptionRepository, org_id: str, app_slug: str) -> Any:
        return _subscription(status="canceled", app_slug=app_slug)

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(SubscriptionRepository, "get_by_app_slug", fake_get_by_app_slug)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/disclose",
            headers=INTERNAL_HEADERS,
            json={"organization_id": "org_test", "app_slug": "876-couriers"},
        )

    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "identification/subscription-required"


# ── verify ──────────────────────────────────────────────────────────────────


async def test_verify_user_identification_sets_verified(monkeypatch: Any) -> None:
    set_verified_kwargs: dict[str, Any] = {}

    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return _identification()

    async def fake_set_verified(
        self: UserIdentificationRepository,
        identification_id: str,
        *,
        verified_by: str,
        verified_at: int,
        updated_at: int,
    ) -> Any:
        set_verified_kwargs.update(
            {"identification_id": identification_id, "verified_by": verified_by, "verified_at": verified_at}
        )
        return _identification(verified=True, verified_at=verified_at, verified_by=verified_by)

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)
    monkeypatch.setattr(UserIdentificationRepository, "set_verified", fake_set_verified)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/verify",
            headers=INTERNAL_HEADERS,
            json={"verified_by": "admin_42"},
        )

    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["verified"] is True
    assert set_verified_kwargs["identification_id"] == "uident_test"
    assert set_verified_kwargs["verified_by"] == "admin_42"


async def test_verify_user_identification_not_found(monkeypatch: Any) -> None:
    async def fake_get_by_type(
        self: UserIdentificationRepository,
        user_id: str,
        identification_type: str,
        include_deleted: bool = False,
    ) -> Any:
        return None

    monkeypatch.setattr(UserIdentificationRepository, "get_by_type", fake_get_by_type)

    transport = ASGITransport(app=_app_with_db())
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/users/user_test/identifications/trn/verify",
            headers=INTERNAL_HEADERS,
            json={"verified_by": "admin_42"},
        )

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "identification/not-found"
