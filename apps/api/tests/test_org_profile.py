"""Session-scoped organization profile routes.

Covers ``GET`` / ``PATCH /organizations/{id}/profile`` — the endpoints product
apps (e.g. Couriers) use to let an org owner/admin read and edit their own
organization's identity profile without the internal admin key. Security focus:
read requires any active membership; write requires owner/admin; privileged
fields (status, slug, WorkOS id, metadata) are not writable through this surface.
"""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import Principal, require_api_key, require_session
from db.repositories.memberships import MembershipRepository
from db.repositories.organizations import OrganizationRepository
from db.session import get_db
from main import create_app


def _membership(role: str = "member", status: str = "active", **overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "mbr_test",
        "organization_id": "org_test",
        "user_id": "usr_test",
        "role": role,
        "role_id": None,
        "status": status,
        "created_at": 1700000010,
        "updated_at": 1700000011,
        "user": None,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _org(**overrides: Any) -> Any:
    defaults: dict[str, Any] = {
        "id": "org_test",
        "workos_organization_id": "workos_org_test",
        "name": "Efesto Technologies, Inc.",
        "short_name": "Efesto",
        "doing_business_as": None,
        "slug": "efesto",
        "status": "active",
        "logo_url": None,
        "industry": "Information Technology and Services",
        "business_type": "corporation",
        "registration_number": "6877932",
        "trn": None,
        "nis_number": None,
        "gct_number": None,
        "tax_id": "36-5026563",
        "incorporation_date": None,
        "primary_phone": "+18765550000",
        "primary_email": "raheem@efestojm.com",
        "fax": None,
        "website_url": None,
        "support_url": None,
        "primary_contact_user_id": None,
        "timezone": "America/New_York",
        "language": "en-US",
        "address_line1": "651 N Broad St",
        "address_line2": "Suite 201",
        "city": "Middletown",
        "region_id": "reg_de",
        "country_code": "US",
        "currency_code": "USD",
        "enrollment_completed_at": 1700000000,
        "metadata_": None,
        "deleted_at": None,
        "deleted_by": None,
        "deletion_reason": None,
        "created_at": 1700000000,
        "updated_at": 1700000001,
    }
    return SimpleNamespace(**{**defaults, **overrides})


def _profile_app(
    monkeypatch: Any,
    *,
    caller_membership: Any,
    org: Any = None,
    user_id: str = "usr_test",
) -> tuple[Any, dict[str, Any]]:
    """App with a session principal, stubbed membership lookup, and stubbed org repo.

    Returns the app plus a ``captured`` dict recording the kwargs passed to
    ``OrganizationRepository.update`` (empty until a write happens).
    """
    captured: dict[str, Any] = {}

    async def fake_get_by_org_and_user(self: MembershipRepository, org_id: str, uid: str) -> Any:
        return caller_membership

    async def fake_get_by_id(self: OrganizationRepository, org_id: str) -> Any:
        return org

    async def fake_update(self: OrganizationRepository, org_id: str, **kwargs: Any) -> Any:
        captured.clear()
        captured.update(kwargs)
        base = org or _org()
        return _org(**{k: v for k, v in kwargs.items() if hasattr(base, k)})

    monkeypatch.setattr(MembershipRepository, "get_by_org_and_user", fake_get_by_org_and_user)
    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(OrganizationRepository, "update", fake_update)

    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[Any]:
        yield SimpleNamespace()

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id=user_id)
    return app, captured


def _client(app: Any) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


# ── Read (GET /profile) ──────────────────────────────────────────────────────


async def test_active_member_reads_profile(monkeypatch: Any) -> None:
    app, _ = _profile_app(monkeypatch, caller_membership=_membership(role="member"), org=_org())

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/profile")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["id"] == "org_test"
    assert body["name"] == "Efesto Technologies, Inc."
    assert body["tax_id"] == "36-5026563"
    assert body["city"] == "Middletown"


async def test_read_profile_requires_session(monkeypatch: Any) -> None:
    # No session override → require_session rejects.
    app = create_app(Settings(internal_key="test-internal-key"))
    app.dependency_overrides[require_api_key] = lambda: True

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/profile")

    assert resp.status_code == 401
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/no-session", "message": "No active session."},
    }


async def test_read_profile_forbidden_for_non_member(monkeypatch: Any) -> None:
    app, _ = _profile_app(monkeypatch, caller_membership=None, org=_org())

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/profile")

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }


async def test_read_profile_forbidden_for_suspended_member(monkeypatch: Any) -> None:
    app, _ = _profile_app(
        monkeypatch,
        caller_membership=_membership(role="owner", status="suspended"),
        org=_org(),
    )

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/profile")

    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "auth/forbidden"


async def test_read_profile_not_found(monkeypatch: Any) -> None:
    app, _ = _profile_app(monkeypatch, caller_membership=_membership(role="member"), org=None)

    async with _client(app) as client:
        resp = await client.get("/organizations/org_test/profile")

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "organization/not-found"


# ── Write (PATCH /profile) ───────────────────────────────────────────────────


async def test_admin_updates_profile(monkeypatch: Any) -> None:
    app, captured = _profile_app(monkeypatch, caller_membership=_membership(role="admin"), org=_org())

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/profile",
            json={
                "name": "  Efesto Logistics Ltd  ",
                "business_type": "limited_company",
                "country_code": "jm",
                "currency_code": "jmd",
                "city": "Kingston",
            },
        )

    assert resp.status_code == 200
    assert resp.json()["error"] is None
    assert captured["name"] == "Efesto Logistics Ltd"  # stripped
    assert captured["business_type"] == "limited_company"
    assert captured["country_code"] == "JM"  # upper-cased
    assert captured["currency_code"] == "JMD"  # upper-cased
    assert captured["city"] == "Kingston"
    assert "updated_at" in captured


async def test_owner_updates_profile(monkeypatch: Any) -> None:
    app, captured = _profile_app(monkeypatch, caller_membership=_membership(role="owner"), org=_org())

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/profile",
            json={"tax_id": "99-9999999"},
        )

    assert resp.status_code == 200
    assert captured["tax_id"] == "99-9999999"


async def test_member_cannot_update_profile(monkeypatch: Any) -> None:
    app, captured = _profile_app(monkeypatch, caller_membership=_membership(role="member"), org=_org())

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/profile",
            json={"name": "Hijacked Name"},
        )

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }
    assert captured == {}  # repo.update never called


async def test_profile_update_ignores_privileged_fields(monkeypatch: Any) -> None:
    """A session owner/admin must not be able to change slug, status, WorkOS id,
    or metadata through the profile endpoint — those are admin-only."""
    app, captured = _profile_app(monkeypatch, caller_membership=_membership(role="admin"), org=_org())

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/profile",
            json={
                "name": "Efesto Renamed",
                "slug": "hijacked-slug",
                "status": "suspended",
                "workos_organization_id": "workos_attacker",
                "metadata": {"escalate": True},
            },
        )

    assert resp.status_code == 200
    assert captured["name"] == "Efesto Renamed"
    assert "slug" not in captured
    assert "status" not in captured
    assert "workos_organization_id" not in captured
    assert "metadata_" not in captured
    assert "metadata" not in captured


async def test_update_profile_not_found(monkeypatch: Any) -> None:
    app, _ = _profile_app(monkeypatch, caller_membership=_membership(role="admin"), org=None)

    async with _client(app) as client:
        resp = await client.patch(
            "/organizations/org_test/profile",
            json={"name": "Ghost Org"},
        )

    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "organization/not-found"
