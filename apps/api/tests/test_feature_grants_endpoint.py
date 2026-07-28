from types import SimpleNamespace
from typing import Any, cast

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import require_api_key
from db.models import Feature, OrgFeature, UserFeature
from db.repositories.features import FeatureRepository
from db.session import get_db
from main import create_app

INTERNAL_HEADERS = {"x-internal-key": "test-internal-key"}


class _ScalarResult:
    def __init__(self, rows: list[Any]) -> None:
        self.rows = rows

    def all(self) -> list[Any]:
        return self.rows

    def first(self) -> Any | None:
        return self.rows[0] if self.rows else None


class _MockDb:
    def __init__(
        self,
        features: dict[str, Feature],
        org_grants: dict[str, list[OrgFeature]],
        user_grants: dict[str, list[UserFeature]],
    ) -> None:
        self.features = features
        self.org_grants = org_grants
        self.user_grants = user_grants
        self.statement: Any | None = None

    async def get(self, model: Any, ident: Any) -> Any | None:
        if model is Feature:
            return self.features.get(ident)
        return None

    async def scalars(self, statement: Any) -> _ScalarResult:
        self.statement = statement
        sql = str(statement)
        if "FROM org_features" in sql or "org_features." in sql:
            # extract feature_id if possible
            for feat_id, grants in self.org_grants.items():
                if f"'{feat_id}'" in sql or feat_id in sql:
                    return _ScalarResult(grants)
            # Default fallback for query
            for grants in self.org_grants.values():
                return _ScalarResult(grants)
            return _ScalarResult([])
        if "FROM user_features" in sql or "user_features." in sql:
            for u_feat_id, u_grants in self.user_grants.items():
                if f"'{u_feat_id}'" in sql or u_feat_id in sql:
                    return _ScalarResult(u_grants)
            for u_grants in self.user_grants.values():
                return _ScalarResult(u_grants)
            return _ScalarResult([])

        return _ScalarResult([])


@pytest.fixture
def test_app(monkeypatch: pytest.MonkeyPatch) -> Any:
    monkeypatch.setenv("API_INTERNAL_KEY", "test-internal-key")
    from core.config import get_settings

    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[require_api_key] = lambda: True
    return app




@pytest.mark.asyncio
async def test_feature_grants_returns_both_org_and_user_overrides_with_identity(
    test_app: Any,
) -> None:
    feature = SimpleNamespace(
        id="ftr_billing_v2",
        slug="billing_v2",
        name="Billing V2",
    )
    org = SimpleNamespace(
        name="Acme Corp",
        slug="acme-corp",
        logo_url="https://example.com/logo.png",
    )
    user = SimpleNamespace(
        email="jane.doe@example.com",
        first_name="Jane",
        last_name="Doe",
        username="janedoe",
        avatar="https://example.com/avatar.png",
    )
    org_grant = SimpleNamespace(
        id="of_123",
        organization_id="org_acme",
        feature_id="ftr_billing_v2",
        status="enabled",
        note="Enterprise tier rollout",
        created_at=1700000000,
        updated_at=1700000100,
        organization=org,
        feature=feature,
    )
    user_grant = SimpleNamespace(
        id="uf_456",
        user_id="usr_jane",
        feature_id="ftr_billing_v2",
        status="disabled",
        note="Opted out during beta",
        created_at=1700000200,
        updated_at=1700000300,
        user=user,
        feature=feature,
    )

    db = _MockDb(
        features={"ftr_billing_v2": cast(Feature, feature)},
        org_grants={"ftr_billing_v2": [cast(OrgFeature, org_grant)]},
        user_grants={"ftr_billing_v2": [cast(UserFeature, user_grant)]},
    )

    async def fake_get_db() -> Any:
        yield db

    test_app.dependency_overrides[get_db] = fake_get_db
    transport = ASGITransport(app=test_app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/features/ftr_billing_v2/grants",
            headers=INTERNAL_HEADERS,
        )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "object": "feature_grants",
        "feature_id": "ftr_billing_v2",
        "organizations": {
            "object": "list",
            "data": [
                {
                    "object": "org_feature_grant",
                    "id": "of_123",
                    "organization_id": "org_acme",
                    "feature_id": "ftr_billing_v2",
                    "slug": "billing_v2",
                    "status": "enabled",
                    "note": "Enterprise tier rollout",
                    "organization_name": "Acme Corp",
                    "organization_slug": "acme-corp",
                    "organization_logo_url": "https://example.com/logo.png",
                    "created_at": 1700000000,
                    "updated_at": 1700000100,
                }
            ],
            "has_more": False,
            "url": "/features/ftr_billing_v2/grants",
            "total_count": None,
        },
        "users": {
            "object": "list",
            "data": [
                {
                    "object": "user_feature_grant",
                    "id": "uf_456",
                    "user_id": "usr_jane",
                    "feature_id": "ftr_billing_v2",
                    "slug": "billing_v2",
                    "status": "disabled",
                    "note": "Opted out during beta",
                    "user_email": "jane.doe@example.com",
                    "user_first_name": "Jane",
                    "user_last_name": "Doe",
                    "user_username": "janedoe",
                    "user_avatar": "https://example.com/avatar.png",
                    "created_at": 1700000200,
                    "updated_at": 1700000300,
                }
            ],
            "has_more": False,
            "url": "/features/ftr_billing_v2/grants",
            "total_count": None,
        },
    }


@pytest.mark.asyncio
async def test_feature_grants_returns_empty_lists_when_no_overrides_exist(
    test_app: Any,
) -> None:
    feature = SimpleNamespace(id="ftr_empty", slug="empty_flag", name="Empty Flag")
    db = _MockDb(
        features={"ftr_empty": cast(Feature, feature)},
        org_grants={"ftr_empty": []},
        user_grants={"ftr_empty": []},
    )

    async def fake_get_db() -> Any:
        yield db

    test_app.dependency_overrides[get_db] = fake_get_db
    transport = ASGITransport(app=test_app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/features/ftr_empty/grants",
            headers=INTERNAL_HEADERS,
        )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "object": "feature_grants",
        "feature_id": "ftr_empty",
        "organizations": {
            "object": "list",
            "data": [],
            "has_more": False,
            "url": "/features/ftr_empty/grants",
            "total_count": None,
        },
        "users": {
            "object": "list",
            "data": [],
            "has_more": False,
            "url": "/features/ftr_empty/grants",
            "total_count": None,
        },
    }


@pytest.mark.asyncio
async def test_feature_grants_returns_404_for_unknown_feature_id(
    test_app: Any,
) -> None:
    db = _MockDb(features={}, org_grants={}, user_grants={})

    async def fake_get_db() -> Any:
        yield db

    test_app.dependency_overrides[get_db] = fake_get_db
    transport = ASGITransport(app=test_app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/features/ftr_unknown/grants",
            headers=INTERNAL_HEADERS,
        )

    assert response.status_code == 404
    assert response.json()["error"] == {
        "code": "feature/not-found",
        "message": "No feature exists with the provided identifier.",
    }


@pytest.mark.asyncio
async def test_feature_grants_rejects_non_admin_requests(
    test_app: Any,
) -> None:
    transport = ASGITransport(app=test_app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/features/ftr_billing_v2/grants")

    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "auth/no-session",
        "message": "No active session.",
    }


@pytest.mark.asyncio
async def test_feature_grants_roundtrips_enabled_and_disabled_statuses(
    test_app: Any,
) -> None:
    feature = SimpleNamespace(id="ftr_status", slug="status_test", name="Status Test")
    org_enabled = SimpleNamespace(
        id="of_enabled",
        organization_id="org_1",
        feature_id="ftr_status",
        status="enabled",
        note=None,
        created_at=100,
        updated_at=100,
        organization=SimpleNamespace(name="Org 1", slug="org-1", logo_url=None),
        feature=feature,
    )
    org_disabled = SimpleNamespace(
        id="of_disabled",
        organization_id="org_2",
        feature_id="ftr_status",
        status="disabled",
        note=None,
        created_at=200,
        updated_at=200,
        organization=SimpleNamespace(name="Org 2", slug="org-2", logo_url=None),
        feature=feature,
    )

    db = _MockDb(
        features={"ftr_status": cast(Feature, feature)},
        org_grants={"ftr_status": [cast(OrgFeature, org_enabled), cast(OrgFeature, org_disabled)]},
        user_grants={"ftr_status": []},
    )

    async def fake_get_db() -> Any:
        yield db

    test_app.dependency_overrides[get_db] = fake_get_db
    transport = ASGITransport(app=test_app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/features/ftr_status/grants",
            headers=INTERNAL_HEADERS,
        )

    assert response.status_code == 200
    org_data = response.json()["data"]["organizations"]["data"]
    assert [item["status"] for item in org_data] == ["enabled", "disabled"]



@pytest.mark.asyncio
async def test_repository_eager_loads_identity_relationships_with_selectinload() -> None:
    """Proves that list_org_grants_for_feature and list_user_grants_for_feature configure selectinload options."""
    captured_statements: list[Any] = []

    class _CaptureDb:
        async def scalars(self, statement: Any) -> _ScalarResult:
            captured_statements.append(statement)
            return _ScalarResult([])

    db = _CaptureDb()
    repo = FeatureRepository(cast(AsyncSession, db))

    await repo.list_org_grants_for_feature("ftr_test")
    await repo.list_user_grants_for_feature("ftr_test")

    assert len(captured_statements) == 2

    org_stmt = captured_statements[0]
    org_options = org_stmt._with_options
    assert len(org_options) == 2
    org_paths = [str(getattr(opt, "path", opt)) for opt in org_options]
    assert any("organization" in p.lower() for p in org_paths)
    assert any("feature" in p.lower() for p in org_paths)

    user_stmt = captured_statements[1]
    user_options = user_stmt._with_options
    assert len(user_options) == 2
    user_paths = [str(getattr(opt, "path", opt)) for opt in user_options]
    assert any("user" in p.lower() for p in user_paths)
    assert any("feature" in p.lower() for p in user_paths)


