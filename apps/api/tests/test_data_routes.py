import re
from collections.abc import AsyncIterator
from typing import Any

from fastapi import Request
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import Principal, require_api_key, require_session
from db.models import App, Feature, Membership
from db.repositories.apps import AppRepository
from db.repositories.employee_profiles import EmployeeProfileRepository
from db.repositories.features import FeatureRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.org_departments import OrgDepartmentRepository
from db.repositories.org_locations import OrgLocationRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.prices import PriceRepository
from db.repositories.products import ProductRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.repositories.user_accounts import UserAccountRepository
from db.repositories.users import UserRepository
from db.session import get_db
from main import create_app
from providers.workos.client import WorkOSClient
from services.features import FeatureService


class _OrganizationRow:
    id = "org_test"
    workos_organization_id = "workos_org_test"
    name = "Acme Corp"
    short_name = None
    doing_business_as = None
    industry = None
    business_type = None
    registration_number = None
    trn = None
    nis_number = None
    gct_number = None
    tax_id = None
    incorporation_date = None
    fax = None
    primary_contact_user_id = None
    timezone = None
    language = None
    slug = "acme-corp"
    status = "active"
    logo_url = None
    primary_phone = None
    primary_email = None
    website_url = None
    support_url = None
    address_line1 = None
    address_line2 = None
    city = None
    region_id = None
    country_code = None
    currency_code = None
    enrollment_completed_at = None
    metadata_ = None
    deleted_at = None
    deleted_by = None
    deletion_reason = None
    created_at = 1700000000
    updated_at = 1700000001


class _MembershipRow:
    id = "mbr_test"
    organization_id = "org_test"
    user_id = "usr_test"
    workos_membership_id = "workos_mbr_test"
    role = "member"
    role_id = None
    status = "active"
    created_at = 1700000010
    updated_at = 1700000011


class _UserRow:
    id = "usr_test"
    workos_user_id = "workos_usr_test"
    stripe_customer_id = None
    email = "test@example.com"
    username = None
    email_verified = True
    first_name = "Jane"
    last_name = "Doe"
    middle_name = None
    avatar = None
    role = "user"
    platform_role = None
    status = "active"
    banned = False
    banned_reason = None
    deleted_at = None
    deleted_by = None
    deletion_reason = None
    created_at = 1700000020
    updated_at = 1700000021


class _FeatureRow:
    id = "feat_test"
    slug = "test-feature"
    name = "Test Feature"
    description = "A feature for testing"
    tags = []
    enabled = True
    default_value = False
    value_type = None
    value = None
    server_side_only = True
    archived_at = None
    parent_feature_id = None
    provider = "posthog"
    provider_feature_id = "12345"
    provider_environment_id = None
    provider_metadata = None
    consumer_default_enabled = False
    scope = "global"
    app_id = None
    synced_at = 1700000032
    created_at = 1700000033
    updated_at = 1700000034


class _ModuleRow:
    id = "mod_delivery"
    app_id = "app_test"
    key = "delivery"
    name = "Delivery"
    description = "Delivery operations"
    feature_id = None
    feature = None
    status = "active"
    position = 10
    created_at = 1700000035
    updated_at = 1700000036


class _UserFeatureRow:
    id = "uf_test"
    user_id = "usr_test"
    feature_id = "feat_test"
    status = "enabled"
    note = "Testing grant"
    synced_at = 1700000040
    created_at = 1700000041
    updated_at = 1700000042
    feature = _FeatureRow()


class _AccountRow:
    id = "acct_google"
    user_id = "usr_test"
    account_id = "google_subject"
    provider_id = "google"
    provider_type = "oauth"
    access_token = "secret-access-token"
    refresh_token = "secret-refresh-token"
    scope = "openid profile email"
    id_token = "secret-id-token"
    password = "secret-password-hash"
    created_at = 1700000043
    updated_at = 1700000044


class _CredentialAccountRow:
    id = "acct_password"
    user_id = "usr_test"
    account_id = "test@example.com"
    provider_id = "email-password"
    provider_type = "credential"
    access_token = None
    refresh_token = None
    scope = None
    id_token = None
    password = "secret-password-hash"
    created_at = 1700000045
    updated_at = 1700000046


class _AppRow:
    id = "app_test"
    name = "OAuth Test App"
    slug = "oauth-test-app"
    organization_id = "org_test"
    client_id = "client_test"
    client_secret_hash = "secret_hash"
    client_type = "confidential"
    app_kind = "external"
    status = "active"
    allowed_redirect_uris = ["https://example.com/callback"]
    allowed_logout_uris = []
    logo_url = None
    homepage_url = None
    type = "web"
    scopes_allowed = ["openid", "profile", "email"]
    created_at = 1700000050
    updated_at = 1700000051


class _ProductRow:
    id = "product_test"
    slug = "876-couriers-free"
    name = "Free"
    description = None
    app_id = "app_test"
    status = "active"
    active = True
    prices: list[Any] = []
    module_entitlements: list[Any] = []
    created_at = 1700000060
    updated_at = 1700000061


class _PriceRow:
    id = "price_test"
    product_id = "product_test"
    unit_amount = 0
    currency = "usd"
    billing_interval = None
    interval_count = None
    status = "active"
    active = True
    type = "recurring"
    billing_scheme = "per_unit"
    product = _ProductRow()
    created_at = 1700000058
    updated_at = 1700000059


class _SubscriptionItemRow:
    id = "sbi_test"
    price_id = "price_test"
    quantity = 1
    price = _PriceRow()


_ProductRow.prices = [_PriceRow()]


class _SubscriptionRow:
    id = "oaa_test"
    organization_id = "org_test"
    app_id = "app_test"
    status = "active"
    finance_lifecycle_version = 0
    items: list[Any] = [_SubscriptionItemRow()]
    current_period_start = None
    current_period_end = None
    cancel_at_period_end = False
    canceled_at = None
    trial_start = None
    trial_end = None
    created_at = 1700000070
    updated_at = 1700000071


class MockDb:
    def __init__(self) -> None:
        self.added: list[Any] = []
        self.executed: list[Any] = []
        self.flushed = False
        self.refreshed: list[Any] = []
        self.scalar_return: Any = 0
        self.scalars_return: Any = None
        self.get_returns: dict[tuple[Any, Any], Any] = {}
        self.commits = 0

    async def get(self, model: Any, ident: Any) -> Any:
        return self.get_returns.get((model, ident))

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        self.flushed = True

    async def refresh(self, obj: Any, attribute_names: Any = None) -> None:
        self.refreshed.append(obj)

    async def commit(self) -> None:
        self.commits += 1

    async def execute(self, stmt: Any) -> Any:
        self.executed.append(stmt)

        class MockResult:
            rowcount = 1

        return MockResult()

    async def scalar(self, stmt: Any) -> Any:
        # Scalar aggregate (e.g. membership count_for_org) — 0 is fine for these
        # serialization-focused tests.
        return 0

    async def scalars(self, stmt: Any) -> Any:
        val = self.scalars_return

        class MockScalars:
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

            def one(self) -> Any:
                if self.value is None:
                    return None
                if isinstance(self.value, list):
                    return self.value[0]
                return self.value

            def unique(self) -> "MockScalars":
                return self

        return MockScalars(val)


async def test_organization_routes_require_session() -> None:
    app = create_app(Settings(internal_key="test-internal-key"))
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/organizations")

    assert response.status_code == 401
    assert response.json() == {
        "data": None,
        "error": {
            "code": "auth/no-session",
            "message": "No active session.",
        }
    }


async def test_internal_key_can_list_organizations(monkeypatch) -> None:
    async def fake_list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        status: str | None = None,
    ) -> tuple[list[_OrganizationRow], bool]:
        assert limit == 10
        assert status is None
        assert starting_after is None
        assert ending_before is None
        assert include_deleted is False
        return [_OrganizationRow()], False

    monkeypatch.setattr(OrganizationRepository, "list", fake_list)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/organizations?limit=10",
            headers={"x-internal-key": "test-internal-key"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "data": {
            "object": "list",
            "data": [
                {
                "object": "organization",
                "id": "org_test",
                "workos_organization_id": "workos_org_test",
                "doing_business_as": None,
                "industry": None,
                "business_type": None,
                "registration_number": None,
                "trn": None,
                "nis_number": None,
                "gct_number": None,
                "tax_id": None,
                "incorporation_date": None,
                "fax": None,
                "primary_contact_user_id": None,
                "timezone": None,
                "language": None,
                "name": "Acme Corp",
                "short_name": None,
                "slug": "acme-corp",
                "status": "active",
                "logo_url": None,
                "primary_phone": None,
                "primary_email": None,
                "website_url": None,
                "support_url": None,
                "address_line1": None,
                "address_line2": None,
                "city": None,
                "region_id": None,
                "country_code": None,
                "currency_code": None,
                "enrollment_completed_at": None,
                "metadata": None,
                "deleted_at": None,
                "deleted_by": None,
                "deletion_reason": None,
                "created_at": 1700000000,
                "updated_at": 1700000001,
                }
            ],
            "has_more": False,
            "url": "/organizations",
            "total_count": None,
        },
        "error": None,
    }


async def test_internal_key_can_list_memberships_with_filters(monkeypatch) -> None:
    async def fake_list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        org_id: str | None = None,
        user_id: str | None = None,
    ) -> tuple[list[_MembershipRow], bool]:
        assert limit == 5
        assert starting_after is None
        assert ending_before is None
        assert org_id == "org_test"
        assert user_id == "usr_test"
        return [_MembershipRow()], False

    monkeypatch.setattr(MembershipRepository, "list", fake_list)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/memberships?limit=5&organization_id=org_test&user_id=usr_test",
            headers={"x-internal-key": "test-internal-key"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "data": {
            "object": "list",
            "data": [
                {
                "object": "membership",
                "id": "mbr_test",
                "organization_id": "org_test",
                "user_id": "usr_test",
                "workos_membership_id": "workos_mbr_test",
                "role": "member",
                "role_id": None,
                "status": "active",
                "created_at": 1700000010,
                "updated_at": 1700000011,
                }
            ],
            "has_more": False,
            "url": "/memberships",
            "total_count": None,
        },
        "error": None,
    }


async def test_create_membership_returns_bad_request_for_missing_org() -> None:
    from db.models import Organization

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()
    # org not found → db.get returns None
    db_mock.get_returns[(Organization, "org_nonexistent")] = None

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/memberships",
            headers={"x-internal-key": "test-internal-key"},
            json={
                "user_id": "usr_test",
                "organization_id": "org_nonexistent",
            },
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "membership/validation-failed"


async def test_organizations_crud_operations(monkeypatch) -> None:
    db_mock = MockDb()

    async def fake_get_by_id(self, org_id: str, include_deleted: bool = False) -> Any:
        if org_id == "org_test":
            return _OrganizationRow()
        return None

    async def fake_get_by_slug(self, slug: str, include_deleted: bool = False) -> Any:
        if slug == "duplicate-slug":
            return _OrganizationRow()
        return None

    async def fake_create(self, **kwargs) -> Any:
        class CreatedOrg:
            id = kwargs["id"]
            workos_organization_id = kwargs.get("workos_organization_id")
            name = kwargs.get("name")
            short_name = kwargs.get("short_name")
            slug = kwargs["slug"]
            status = kwargs["status"]
            logo_url = kwargs.get("logo_url")
            primary_phone = kwargs.get("primary_phone")
            primary_email = kwargs.get("primary_email")
            website_url = kwargs.get("website_url")
            support_url = kwargs.get("support_url")
            address_line1 = kwargs.get("address_line1")
            address_line2 = kwargs.get("address_line2")
            city = kwargs.get("city")
            region_id = kwargs.get("region_id")
            country_code = kwargs.get("country_code")
            currency_code = kwargs.get("currency_code")
            enrollment_completed_at = kwargs.get("enrollment_completed_at")
            metadata_ = kwargs.get("metadata_")
            deleted_at = None
            deleted_by = None
            deletion_reason = None
            created_at = kwargs["created_at"]
            updated_at = kwargs["updated_at"]

        return CreatedOrg()

    async def fake_update(self, org_id: str, **kwargs) -> Any:
        class UpdatedOrg:
            id = org_id
            workos_organization_id = "workos_org_test"
            name = kwargs.get("name", "Acme Corp")
            short_name = kwargs.get("short_name")
            slug = "acme-corp"
            status = kwargs.get("status", "active")
            logo_url = kwargs.get("logo_url")
            primary_phone = kwargs.get("primary_phone")
            primary_email = kwargs.get("primary_email")
            website_url = kwargs.get("website_url")
            support_url = kwargs.get("support_url")
            address_line1 = kwargs.get("address_line1")
            address_line2 = kwargs.get("address_line2")
            city = kwargs.get("city")
            region_id = kwargs.get("region_id")
            country_code = kwargs.get("country_code")
            currency_code = kwargs.get("currency_code")
            enrollment_completed_at = kwargs.get("enrollment_completed_at")
            metadata_ = kwargs.get("metadata_")
            deleted_at = None
            deleted_by = None
            deletion_reason = None
            created_at = 1700000000
            updated_at = kwargs.get("updated_at", 1700000001)

        return UpdatedOrg()

    async def fake_delete(
        self,
        org_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        return True

    async def fake_list_memberships(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        org_id: str | None = None,
        user_id: str | None = None,
    ) -> tuple[list[_MembershipRow], bool]:
        return [_MembershipRow()], False

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(OrganizationRepository, "get_by_slug", fake_get_by_slug)
    monkeypatch.setattr(OrganizationRepository, "create", fake_create)
    monkeypatch.setattr(OrganizationRepository, "update", fake_update)
    monkeypatch.setattr(OrganizationRepository, "delete", fake_delete)
    monkeypatch.setattr(MembershipRepository, "list", fake_list_memberships)

    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Retrieve org_test
        resp = await client.get(
            "/organizations/org_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == "org_test"

        # Retrieve not found
        resp = await client.get(
            "/organizations/org_missing",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 404

        # Create org
        resp = await client.post(
            "/organizations",
            headers={"x-internal-key": "test-internal-key"},
            json={"name": "New Org", "slug": "new-org"},
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["slug"] == "new-org"

        # Create org duplicate slug
        resp = await client.post(
            "/organizations",
            headers={"x-internal-key": "test-internal-key"},
            json={"name": "New Org", "slug": "duplicate-slug"},
        )
        assert resp.status_code == 409

        # Update org
        resp = await client.patch(
            "/organizations/org_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"name": "Updated Org"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Updated Org"

        # Delete org
        resp = await client.delete(
            "/organizations/org_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["deleted"] is True

        # List org memberships
        resp = await client.get(
            "/organizations/org_test/memberships",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["data"][0]["user_id"] == "usr_test"


async def test_memberships_crud_operations(monkeypatch) -> None:
    db_mock = MockDb()

    async def fake_get_by_id(self, membership_id: str) -> Any:
        if membership_id == "mbr_test":
            return _MembershipRow()
        return None

    async def fake_update(self, membership_id: str, **kwargs) -> Any:
        class UpdatedMbr:
            id = membership_id
            organization_id = "org_test"
            user_id = "usr_test"
            workos_membership_id = kwargs.get("workos_membership_id", "workos_mbr_test")
            role = kwargs.get("role", "member")
            role_id = None
            status = kwargs.get("status", "active")
            created_at = 1700000010
            updated_at = 1700000012

        return UpdatedMbr()

    async def fake_delete(self, membership_id: str) -> bool:
        return True

    monkeypatch.setattr(MembershipRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(MembershipRepository, "update", fake_update)
    monkeypatch.setattr(MembershipRepository, "delete", fake_delete)

    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Retrieve membership
        resp = await client.get(
            "/memberships/mbr_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == "mbr_test"

        # Update membership
        resp = await client.patch(
            "/memberships/mbr_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"role": "admin"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["role"] == "admin"

        # Delete membership
        resp = await client.delete(
            "/memberships/mbr_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["deleted"] is True


async def test_features_routes(monkeypatch) -> None:
    db_mock = MockDb()

    async def fake_list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        app_id: str | None = None,
        root_only: bool = False,
        include_tag: str | None = None,
        exclude_tag: str | None = None,
    ) -> tuple[list[_FeatureRow], bool]:
        return [_FeatureRow()], False

    async def fake_get_by_id(self, feature_id: str) -> Any:
        if feature_id == "feat_test":
            return _FeatureRow()
        return None

    monkeypatch.setattr(FeatureRepository, "list", fake_list)
    monkeypatch.setattr(FeatureRepository, "get_by_id", fake_get_by_id)

    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # List features
        resp = await client.get(
            "/features",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["data"][0]["slug"] == "test-feature"

        # Retrieve feature
        resp = await client.get(
            "/features/feat_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == "feat_test"

        # Patch consumer default
        resp = await client.patch(
            "/features/feat_test",
            headers={"x-internal-key": "test-internal-key"},
            json={"consumer_default_enabled": True},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["consumer_default_enabled"] is True
        assert db_mock.commits == 1


async def test_apps_routes(monkeypatch) -> None:
    db_mock = MockDb()

    async def fake_list_by_org(
        self,
        organization_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        status: str | None = None,
    ) -> tuple[list[_AppRow], bool]:
        assert organization_id == "org_test"
        return [_AppRow()], False

    async def fake_create(self, **kwargs) -> Any:
        class CreatedApp:
            id = kwargs["id"]
            name = kwargs["name"]
            slug = kwargs["slug"]
            organization_id = kwargs.get("organization_id")
            client_id = kwargs["client_id"]
            client_type = kwargs["client_type"]
            app_kind = kwargs.get("app_kind", "external")
            status = kwargs.get("status", "active")
            allowed_redirect_uris = kwargs["allowed_redirect_uris"]
            allowed_logout_uris = kwargs["allowed_logout_uris"]
            logo_url = kwargs.get("logo_url")
            homepage_url = kwargs.get("homepage_url")
            type = "web"
            scopes_allowed = kwargs["scopes_allowed"]
            created_at = kwargs["created_at"]
            updated_at = kwargs["updated_at"]

        return CreatedApp()

    monkeypatch.setattr(AppRepository, "list_by_org", fake_list_by_org)
    monkeypatch.setattr(AppRepository, "create", fake_create)

    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # List apps (missing organizationId, no admin key → 400)
        resp = await client.get("/apps")
        assert resp.status_code == 400

        # List apps by organization (valid)
        resp = await client.get("/apps?organizationId=org_test")
        assert resp.status_code == 200
        assert resp.json()["data"]["data"][0]["client_id"] == "client_test"
        assert resp.json()["data"]["data"][0]["status"] == "active"
        assert resp.json()["data"]["data"][0]["feature_prefix"] == "oauth_test_app"

        # Create app
        resp = await client.post(
            "/apps",
            json={
                "organizationId": "org_test",
                "name": "My App",
                "clientType": "confidential",
                "redirectUris": ["https://example.com/callback"],
            },
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["status"] == "active"
        assert re.fullmatch(r"my_app_[0-9a-f]{8}", resp.json()["data"]["feature_prefix"])
        assert resp.json()["data"]["clientSecret"] is not None


async def test_current_app_uses_request_api_key_app_id(monkeypatch) -> None:
    async def fake_get_by_id(self, app_id: str) -> Any:
        assert app_id == "app_test"
        return _AppRow()

    async def fake_require_api_key(request: Request) -> bool:
        request.state.app_id = "app_test"
        request.state.api_key_id = "key_test"
        return True

    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_by_id)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = fake_require_api_key
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/apps/current", headers={"X-876-API-Key": "876_app_secret_test"})

    assert resp.status_code == 200
    assert resp.json()["data"]["client_id"] == "client_test"


async def test_internal_key_can_list_user_accounts_without_secrets(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: UserRepository, user_id: str) -> Any:
        if user_id == "usr_test":
            return _UserRow()
        return None

    async def fake_list_for_user(self: UserAccountRepository, user_id: str) -> list[Any]:
        assert user_id == "usr_test"
        return [_AccountRow(), _CredentialAccountRow()]

    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserAccountRepository, "list_for_user", fake_list_for_user)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/users/usr_test/accounts",
            headers={"x-internal-key": "test-internal-key"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["error"] is None
    data = payload["data"]
    assert data["object"] == "list"
    assert data["has_more"] is False
    assert data["url"] == "/users/usr_test/accounts"
    assert data["total_count"] == 2
    assert data["data"] == [
        {
            "object": "account",
            "id": "acct_google",
            "provider_id": "google",
            "provider_type": "oauth",
            "created_at": 1700000043,
            "updated_at": 1700000044,
        },
        {
            "object": "account",
            "id": "acct_password",
            "provider_id": "email-password",
            "provider_type": "credential",
            "created_at": 1700000045,
            "updated_at": 1700000046,
        },
    ]

    for item in data["data"]:
        assert "access_token" not in item
        assert "refresh_token" not in item
        assert "id_token" not in item
        assert "password" not in item
        assert "scope" not in item


async def test_users_routes(monkeypatch) -> None:
    db_mock = MockDb()

    async def fake_get_by_workos_id(self, workos_user_id: str) -> Any:
        if workos_user_id == "workos_usr_test":
            return _UserRow()
        return None

    async def fake_get_by_id(self, user_id: str, include_deleted: bool = False) -> Any:
        if user_id == "usr_test":
            return _UserRow()
        return None

    async def fake_list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        status: str | None = None,
    ) -> tuple[list[_UserRow], bool]:
        return [_UserRow()], False

    async def fake_create(self, **kwargs) -> Any:
        class CreatedUser:
            id = kwargs["id"]
            workos_user_id = kwargs["workos_user_id"]
            stripe_customer_id = None
            email = kwargs["email"]
            username = kwargs.get("username")
            email_verified = kwargs["email_verified"]
            first_name = kwargs["first_name"]
            last_name = kwargs["last_name"]
            middle_name = None
            avatar = kwargs.get("avatar")
            status = kwargs["status"]
            banned = False
            deleted_at = None
            deleted_by = None
            deletion_reason = None
            created_at = kwargs["created_at"]
            updated_at = kwargs["updated_at"]

        return CreatedUser()

    async def fake_companies_for_users(self, user_ids: list[str]) -> dict[str, tuple[str, str | None]]:
        return {"usr_test": ("Acme Inc", None)}

    async def fake_grant_user_feature(
        self,
        user_id: str,
        feature_id: str,
        *,
        enabled: bool = True,
        note: str | None = None,
    ) -> Any:
        row = _UserFeatureRow()
        row.user_id = user_id
        row.feature_id = feature_id
        row.status = "enabled" if enabled else "disabled"
        row.note = note
        return row

    monkeypatch.setattr(UserRepository, "get_by_workos_id", fake_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(UserRepository, "list", fake_list)
    monkeypatch.setattr(UserRepository, "create", fake_create)
    monkeypatch.setattr(MembershipRepository, "companies_for_users", fake_companies_for_users)
    monkeypatch.setattr(FeatureService, "grant_user_feature", fake_grant_user_feature)

    # Mock WorkOS target methods
    async def mock_add_feature_flag_target(*args, **kwargs):
        return {"success": True}

    async def mock_remove_feature_flag_target(*args, **kwargs):
        return None

    monkeypatch.setattr(WorkOSClient, "add_feature_flag_target", mock_add_feature_flag_target)
    monkeypatch.setattr(WorkOSClient, "remove_feature_flag_target", mock_remove_feature_flag_target)

    app = create_app(Settings(internal_key="test-internal-key"))

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Retrieve by WorkOS ID
        resp = await client.get(
            "/users/by-workos-id/workos_usr_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == "usr_test"

        # List OAuth grants
        resp = await client.get(
            "/users/usr_test/oauth-grants",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200

        # Revoke OAuth grant
        resp = await client.post(
            "/users/usr_test/oauth-grants/grant_test/revoke",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["revoked"] is True

        # Ensure user (already exists)
        resp = await client.post(
            "/users/ensure",
            json={"workosUserId": "workos_usr_test", "email": "test@example.com"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == "usr_test"
        # App-key tier must never receive WorkOS/admin details.
        assert "workos_user_id" not in data
        assert "workosUserId" not in data
        assert "role" not in data
        assert "permissions" not in data

        # Ensure user (create new)
        resp = await client.post(
            "/users/ensure",
            json={"workosUserId": "workos_new", "email": "new@example.com"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["email"] == "new@example.com"
        assert "workos_user_id" not in data

        # List users (requires admin)
        resp = await client.get(
            "/users",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["data"][0]["id"] == "usr_test"
        assert resp.json()["data"]["data"][0]["company"] == "Acme Inc"

        # Retrieve user (requires admin)
        resp = await client.get(
            "/users/usr_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["id"] == "usr_test"

        # List user feature grants (requires admin)
        # Mock database scalars to return a list of UserFeature objects
        class MockFeatureObj:
            slug = "test-feature"

        class MockUserFeatureObj:
            id = "uf_test"
            user_id = "usr_test"
            feature_id = "feat_test"
            status = "enabled"
            note = "Testing grant"
            synced_at = 1700000040
            created_at = 1700000041
            updated_at = 1700000042
            feature = MockFeatureObj()

        db_mock.scalars_return = [MockUserFeatureObj()]

        resp = await client.get(
            "/users/usr_test/features",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["data"][0]["id"] == "uf_test"

        # Grant user feature
        db_mock.get_returns[(Feature, "feat_test")] = _FeatureRow()
        resp = await client.post(
            "/users/usr_test/features",
            headers={"x-internal-key": "test-internal-key"},
            json={"featureId": "feat_test", "note": "Test note"},
        )
        assert resp.status_code == 201

        # Disable user feature
        resp = await client.delete(
            "/users/usr_test/features/feat_test",
            headers={"x-internal-key": "test-internal-key"},
        )
        assert resp.status_code == 200


async def test_get_app_public_endpoint(monkeypatch) -> None:
    async def fake_get_by_client_id(self, client_id: str) -> Any:
        if client_id == "client_test":
            return _AppRow()
        return None

    monkeypatch.setattr(AppRepository, "get_by_client_id", fake_get_by_client_id)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Valid client_id returns 200 with public app info
        resp = await client.get("/apps/public/client_test")
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["error"] is None
        data = payload["data"]
        assert data["object"] == "app"
        assert data["name"] == "OAuth Test App"
        assert data["logo_url"] is None
        assert data["app_kind"] == "external"

        # Invalid client_id returns 404
        resp = await client.get("/apps/public/nonexistent_client")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "app/not-found"


async def test_list_products(monkeypatch: Any) -> None:
    async def fake_list_all(self: ProductRepository, app_id: Any = None, status: Any = None) -> Any:
        assert app_id == "app_test"
        return [_ProductRow()]

    monkeypatch.setattr(ProductRepository, "list_all", fake_list_all)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/products?appId=app_test")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    data = payload["data"]["data"]
    assert data[0]["slug"] == "876-couriers-free"
    assert data[0]["prices"][0]["unit_amount"] == 0
    assert data[0]["prices"][0]["billing_interval"] is None


async def test_provision_subscription_defaults_to_app_price(monkeypatch: Any) -> None:
    async def fake_get_org_by_id(self: OrganizationRepository, org_id: str) -> Any:
        assert org_id == "org_test"
        return _OrganizationRow()

    async def fake_get_default_for_app(self: PriceRepository, app_id: str) -> Any:
        assert app_id == "app_test"
        return _PriceRow()

    captured: dict[str, Any] = {}

    async def fake_provision(
        self: SubscriptionRepository, org_id: str, app_id: str, price_id: str | None = None
    ) -> Any:
        captured["price_id"] = price_id
        return _SubscriptionRow()

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_org_by_id)
    monkeypatch.setattr(PriceRepository, "get_default_for_app", fake_get_default_for_app)
    monkeypatch.setattr(SubscriptionRepository, "provision", fake_provision)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()
    db_mock.get_returns[(App, "app_test")] = _AppRow()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/organizations/org_test/apps",
            json={"app_id": "app_test"},
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 201
    assert captured["price_id"] == "price_test"
    assert resp.json()["data"]["items"][0]["price_id"] == "price_test"


async def test_provision_subscription_preserves_explicit_price(monkeypatch: Any) -> None:
    """An explicit price_id in the request must skip default-price resolution."""

    async def fake_get_org_by_id(self: OrganizationRepository, org_id: str) -> Any:
        return _OrganizationRow()

    async def fail_get_default_for_app(self: PriceRepository, app_id: str) -> Any:
        raise AssertionError("default price lookup should be skipped when price_id is provided")

    captured: dict[str, Any] = {}

    async def fake_provision(
        self: SubscriptionRepository, org_id: str, app_id: str, price_id: str | None = None
    ) -> Any:
        captured["price_id"] = price_id
        item = _SubscriptionItemRow()
        item.price_id = price_id  # type: ignore[assignment]
        row = _SubscriptionRow()
        row.items = [item]
        return row

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_org_by_id)
    monkeypatch.setattr(PriceRepository, "get_default_for_app", fail_get_default_for_app)
    monkeypatch.setattr(SubscriptionRepository, "provision", fake_provision)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()
    db_mock.get_returns[(App, "app_test")] = _AppRow()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/organizations/org_test/apps",
            json={"app_id": "app_test", "price_id": "price_custom"},
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 201
    assert captured["price_id"] == "price_custom"


async def test_update_subscription_can_change_price(monkeypatch: Any) -> None:
    captured: dict[str, Any] = {}

    async def fake_get(self: SubscriptionRepository, org_id: str, app_id: str) -> Any:
        return _SubscriptionRow()

    async def fake_set_price(self: SubscriptionRepository, subscription_id: str, price_id: str) -> None:
        captured["subscription_id"] = subscription_id
        captured["price_id"] = price_id

    monkeypatch.setattr(SubscriptionRepository, "get", fake_get)
    monkeypatch.setattr(SubscriptionRepository, "set_price", fake_set_price)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/organizations/org_test/apps/app_test",
            json={"price_id": "price_premium"},
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 200
    assert captured["price_id"] == "price_premium"
    assert captured["subscription_id"] == "oaa_test"


async def test_update_subscription_requires_a_field(monkeypatch: Any) -> None:
    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/organizations/org_test/apps/app_test",
            json={},
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 422


async def test_list_app_subscriptions(monkeypatch: Any) -> None:
    async def fake_get_app_by_id(self: AppRepository, app_id: str) -> Any:
        assert app_id == "app_test"
        return _AppRow()

    async def fake_list_by_app(self: SubscriptionRepository, app_id: str) -> Any:
        assert app_id == "app_test"
        return [_SubscriptionRow()]

    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_app_by_id)
    monkeypatch.setattr(SubscriptionRepository, "list_by_app", fake_list_by_app)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/apps/app_test/subscriptions",
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 200
    assert resp.json()["data"][0]["organization_id"] == "org_test"
    assert resp.json()["data"][0]["items"][0]["price_id"] == "price_test"


async def test_create_product(monkeypatch: Any) -> None:
    async def fake_get_by_slug(self: ProductRepository, slug: str) -> Any:
        return None

    async def fake_get_app_by_id(self: AppRepository, app_id: str) -> Any:
        app = _AppRow()
        app.app_kind = "product"
        return app

    async def fake_create(self: ProductRepository, **kwargs: Any) -> Any:
        row = _ProductRow()
        row.slug = kwargs["slug"]
        row.app_id = kwargs["app_id"]
        return row

    async def fake_create_price(self: PriceRepository, **kwargs: Any) -> Any:
        return _PriceRow()

    monkeypatch.setattr(ProductRepository, "get_by_slug", fake_get_by_slug)
    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_app_by_id)
    monkeypatch.setattr(ProductRepository, "create", fake_create)
    monkeypatch.setattr(PriceRepository, "create", fake_create_price)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/products",
            json={
                "slug": "876-couriers-pro",
                "name": "Pro",
                "app_id": "app_test",
                "price": {"unit_amount": 999},
            },
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 201
    assert resp.json()["data"]["slug"] == "876-couriers-pro"


async def test_replace_product_modules_requires_same_app_and_returns_selection(
    monkeypatch: Any,
) -> None:
    product = _ProductRow()
    module = _ModuleRow()
    module.app_id = product.app_id

    async def fake_get_by_id(self: ProductRepository, product_id: str) -> Any:
        return product

    async def fake_replace_modules(
        self: ProductRepository,
        product_id: str,
        module_ids: list[str],
    ) -> Any:
        product.module_entitlements = [type("Entitlement", (), {"module_id": module_id})() for module_id in module_ids]
        return product

    monkeypatch.setattr(ProductRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(ProductRepository, "replace_modules", fake_replace_modules)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()
    db_mock.scalars_return = [module]

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.put(
            "/products/product_test/modules",
            json={"module_ids": [module.id]},
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 200
    assert resp.json()["data"]["module_ids"] == [module.id]


async def test_create_product_rejects_duplicate_slug(monkeypatch: Any) -> None:
    async def fake_get_by_slug(self: ProductRepository, slug: str) -> Any:
        return _ProductRow()

    monkeypatch.setattr(ProductRepository, "get_by_slug", fake_get_by_slug)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/products",
            json={"slug": "876-couriers-free", "name": "Free", "price": {}},
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 409


async def test_update_product(monkeypatch: Any) -> None:
    captured: dict[str, Any] = {}

    async def fake_update(self: ProductRepository, product_id: str, **kwargs: Any) -> Any:
        captured.update(kwargs)
        row = _ProductRow()
        row.name = kwargs.get("name", row.name)
        return row

    monkeypatch.setattr(ProductRepository, "update", fake_update)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/products/product_test",
            json={
                "name": "Pro Plus",
                "slug": "876-couriers-pro-plus",
                "active": False,
            },
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 200
    assert captured["name"] == "Pro Plus"
    assert captured["slug"] == "876-couriers-pro-plus"
    assert captured["active"] is False
    assert captured["status"] == "archived"
    assert resp.json()["data"]["name"] == "Pro Plus"


async def test_archive_product_sets_status_instead_of_deleting(monkeypatch: Any) -> None:
    captured: dict[str, Any] = {}

    async def fake_get_by_id(self: ProductRepository, product_id: str) -> Any:
        return _ProductRow()

    async def fake_update(self: ProductRepository, product_id: str, **kwargs: Any) -> Any:
        captured.update(kwargs)
        return _ProductRow()

    monkeypatch.setattr(ProductRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(ProductRepository, "update", fake_update)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete(
            "/products/product_test",
            headers={"x-internal-key": "test-internal-key"},
        )

    assert resp.status_code == 200
    assert captured["status"] == "archived"
    assert resp.json() == {
        "data": {"object": "product", "id": "product_test", "deleted": True},
        "error": None,
    }


# ── Self-scoped subscription endpoints (session tier) ────────────────────────


def _session_app(monkeypatch: Any, *, membership: Any, user_id: str = "usr_test") -> Any:
    """Builds a test app with a session principal and a stubbed membership lookup."""

    async def fake_get_by_org_and_user(self: MembershipRepository, org_id: str, uid: str) -> Any:
        assert org_id == "org_test"
        assert uid == user_id
        return membership

    monkeypatch.setattr(MembershipRepository, "get_by_org_and_user", fake_get_by_org_and_user)

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id=user_id)
    return app, db_mock


async def test_member_can_list_own_org_subscriptions(monkeypatch: Any) -> None:
    async def fake_list_by_org(self: SubscriptionRepository, org_id: str) -> Any:
        assert org_id == "org_test"
        return [_SubscriptionRow()]

    monkeypatch.setattr(SubscriptionRepository, "list_by_org", fake_list_by_org)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/subscriptions")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "list"
    assert body["url"] == "/organizations/org_test/subscriptions"
    assert body["has_more"] is False
    assert body["data"][0]["object"] == "subscription"
    assert body["data"][0]["id"] == "oaa_test"
    assert body["data"][0]["status"] == "active"


async def test_non_member_cannot_list_org_subscriptions(monkeypatch: Any) -> None:
    async def fail_list_by_org(self: SubscriptionRepository, org_id: str) -> Any:
        raise AssertionError("subscriptions must not be read for a non-member")

    monkeypatch.setattr(SubscriptionRepository, "list_by_org", fail_list_by_org)
    app, _ = _session_app(monkeypatch, membership=None)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/subscriptions")

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }


async def test_suspended_member_cannot_list_org_subscriptions(monkeypatch: Any) -> None:
    suspended = _MembershipRow()
    suspended.status = "suspended"  # type: ignore[misc]

    async def fail_list_by_org(self: SubscriptionRepository, org_id: str) -> Any:
        raise AssertionError("subscriptions must not be read for a suspended member")

    monkeypatch.setattr(SubscriptionRepository, "list_by_org", fail_list_by_org)
    app, _ = _session_app(monkeypatch, membership=suspended)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/subscriptions")

    assert resp.status_code == 403


async def test_member_can_retrieve_own_subscription_by_slug(monkeypatch: Any) -> None:
    async def fake_get_by_app_slug(self: SubscriptionRepository, org_id: str, app_slug: str) -> Any:
        assert org_id == "org_test"
        assert app_slug == "876-couriers"
        return _SubscriptionRow()

    monkeypatch.setattr(SubscriptionRepository, "get_by_app_slug", fake_get_by_app_slug)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/subscriptions/by-slug/876-couriers")

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["object"] == "subscription"
    assert body["data"]["status"] == "active"


async def test_retrieve_own_subscription_by_slug_returns_404_when_missing(monkeypatch: Any) -> None:
    async def fake_get_by_app_slug(self: SubscriptionRepository, org_id: str, app_slug: str) -> Any:
        return None

    monkeypatch.setattr(SubscriptionRepository, "get_by_app_slug", fake_get_by_app_slug)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/subscriptions/by-slug/876-couriers")

    assert resp.status_code == 404


async def test_plain_member_cannot_provision_subscription(monkeypatch: Any) -> None:
    async def fail_provision(
        self: SubscriptionRepository, org_id: str, app_id: str, price_id: str | None = None
    ) -> Any:
        raise AssertionError("a plain member must not provision a subscription")

    monkeypatch.setattr(SubscriptionRepository, "provision", fail_provision)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/organizations/org_test/subscriptions", json={"app_id": "app_test"})

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }


async def test_org_admin_can_provision_subscription(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    async def fake_get_org_by_id(self: OrganizationRepository, org_id: str) -> Any:
        return _OrganizationRow()

    async def fake_get_default_for_app(self: PriceRepository, app_id: str) -> Any:
        return _PriceRow()

    captured: dict[str, Any] = {}

    async def fake_provision(
        self: SubscriptionRepository, org_id: str, app_id: str, price_id: str | None = None
    ) -> Any:
        captured["org_id"] = org_id
        captured["app_id"] = app_id
        captured["price_id"] = price_id
        return _SubscriptionRow()

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_org_by_id)
    monkeypatch.setattr(PriceRepository, "get_default_for_app", fake_get_default_for_app)
    monkeypatch.setattr(SubscriptionRepository, "provision", fake_provision)

    app, db_mock = _session_app(monkeypatch, membership=admin_membership)
    db_mock.get_returns[(App, "app_test")] = _AppRow()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/organizations/org_test/subscriptions", json={"app_id": "app_test"})

    assert resp.status_code == 201
    assert captured == {"org_id": "org_test", "app_id": "app_test", "price_id": "price_test"}
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["object"] == "subscription"


async def test_list_my_memberships_returns_only_session_users_rows() -> None:
    class _OrgRelRow:
        id = "org_test"
        name = "Acme Corp"
        slug = "acme-corp"
        status = "active"

    class _MembershipWithOrgRow:
        id = "mbr_test"
        organization_id = "org_test"
        role = "owner"
        role_id = None
        status = "active"
        organization = _OrgRelRow()

    app = create_app(Settings(internal_key="test-internal-key"))
    db_mock = MockDb()
    db_mock.scalars_return = [_MembershipWithOrgRow()]

    async def fake_db() -> AsyncIterator[MockDb]:
        yield db_mock

    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[require_api_key] = lambda: True
    app.dependency_overrides[require_session] = lambda: Principal(user_id="usr_test")
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/users/me/memberships?status=active")

    assert resp.status_code == 200
    assert resp.json() == {
        "data": {
            "object": "list",
            "data": [
                {
                "id": "mbr_test",
                "role": "owner",
                "status": "active",
                "permissions": [
                    "apps:assign",
                    "apps:provision",
                    "apps:read",
                    "billing:manage",
                    "billing:read",
                    "members:invite",
                    "members:manage",
                    "members:read",
                    "org:delete",
                    "org:read",
                    "org:update",
                    "roles:manage",
                    "roles:read",
                    "structure:manage",
                    "structure:read",
                ],
                "organization": {
                    "id": "org_test",
                    "name": "Acme Corp",
                    "slug": "acme-corp",
                    "status": "active",
                },
                }
            ],
            "has_more": False,
            "url": "/users/me/memberships",
            "total_count": None,
        },
        "error": None,
    }


async def test_list_my_memberships_requires_session() -> None:
    app = create_app(Settings(internal_key="test-internal-key"))
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/users/me/memberships")

    assert resp.status_code == 401
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/no-session", "message": "No active session."},
    }


# ── Org structure: locations, departments, employee profiles ─────────────────


class _OrgLocationRow:
    id = "loc_test"
    organization_id = "org_test"
    name = "Kingston HQ"
    code = "KGN-01"
    type = "headquarters"
    status = "active"
    is_primary = True
    phone = None
    email = None
    line1 = "1 Knutsford Blvd"
    line2 = None
    city = "Kingston"
    region_id = None
    country_code = "JM"
    postal_code = None
    timezone = "America/Jamaica"
    metadata_ = None
    deleted_at = None
    deleted_by = None
    deletion_reason = None
    created_at = 1700000020
    updated_at = 1700000021


class _OrgDepartmentRow:
    id = "dep_test"
    organization_id = "org_test"
    name = "Engineering"
    code = "ENG"
    description = None
    parent_department_id = None
    head_membership_id = None
    status = "active"
    metadata_ = None
    deleted_at = None
    deleted_by = None
    deletion_reason = None
    created_at = 1700000030
    updated_at = 1700000031


class _EmployeeMembershipRow:
    id = "mbr_emp"
    organization_id = "org_test"
    user_id = "usr_emp"
    role = "member"
    status = "active"
    deleted_at = None


class _EmployeeProfileRow:
    id = "emp_test"
    membership_id = "mbr_emp"
    organization_id = "org_test"
    membership = _EmployeeMembershipRow()
    employee_number = "E-001"
    job_title = "Senior Engineer"
    department_id = "dep_test"
    location_id = "loc_test"
    manager_membership_id = None
    employment_type = "full_time"
    employment_status = "active"
    division = None
    cost_center = None
    work_email = None
    work_phone = None
    start_date = 1690000000
    end_date = None
    metadata_ = None
    deleted_at = None
    deleted_by = None
    deletion_reason = None
    created_at = 1700000040
    updated_at = 1700000041


async def test_member_can_list_org_locations(monkeypatch: Any) -> None:
    async def fake_list_by_org(self: OrgLocationRepository, org_id: str, include_deleted: bool = False) -> Any:
        assert org_id == "org_test"
        return [_OrgLocationRow()]

    monkeypatch.setattr(OrgLocationRepository, "list_by_org", fake_list_by_org)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/locations")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "list"
    assert body["url"] == "/organizations/org_test/locations"
    assert body["has_more"] is False
    assert body["data"][0]["object"] == "org_location"
    assert body["data"][0]["id"] == "loc_test"
    assert body["data"][0]["type"] == "headquarters"
    assert body["data"][0]["is_primary"] is True


async def test_non_member_cannot_list_org_locations(monkeypatch: Any) -> None:
    async def fail_list_by_org(self: OrgLocationRepository, org_id: str, include_deleted: bool = False) -> Any:
        raise AssertionError("locations must not be read for a non-member")

    monkeypatch.setattr(OrgLocationRepository, "list_by_org", fail_list_by_org)
    app, _ = _session_app(monkeypatch, membership=None)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/locations")

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }


async def test_plain_member_cannot_create_org_location(monkeypatch: Any) -> None:
    async def fail_create(self: OrgLocationRepository, **kwargs: Any) -> Any:
        raise AssertionError("a plain member must not create a location")

    monkeypatch.setattr(OrgLocationRepository, "create", fail_create)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/organizations/org_test/locations", json={"name": "Montego Bay Branch"})

    assert resp.status_code == 403
    assert resp.json() == {
        "data": None,
        "error": {"code": "auth/forbidden", "message": "Forbidden."},
    }


async def test_org_admin_can_create_org_location(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    cleared: dict[str, Any] = {}
    captured: dict[str, Any] = {}

    async def fake_clear_primary(self: OrgLocationRepository, org_id: str) -> None:
        cleared["org_id"] = org_id

    async def fake_create(self: OrgLocationRepository, **kwargs: Any) -> Any:
        captured.update(kwargs)
        return _OrgLocationRow()

    monkeypatch.setattr(OrgLocationRepository, "clear_primary_for_org", fake_clear_primary)
    monkeypatch.setattr(OrgLocationRepository, "create", fake_create)
    app, _ = _session_app(monkeypatch, membership=admin_membership)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/organizations/org_test/locations",
            json={
                "name": "Kingston HQ",
                "code": "KGN-01",
                "type": "headquarters",
                "is_primary": True,
                "city": "Kingston",
                "country_code": "JM",
            },
        )

    assert resp.status_code == 201
    assert cleared == {"org_id": "org_test"}
    assert captured["organization_id"] == "org_test"
    assert captured["name"] == "Kingston HQ"
    assert captured["code"] == "KGN-01"
    assert captured["type"] == "headquarters"
    assert captured["is_primary"] is True
    assert captured["id"].startswith("loc_")
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["object"] == "org_location"


async def test_update_org_location_maps_metadata_and_404s_when_missing(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    captured: dict[str, Any] = {}

    async def fake_get_by_id_for_org(
        self: OrgLocationRepository, location_id: str, org_id: str, include_deleted: bool = False
    ) -> Any:
        return _OrgLocationRow() if location_id == "loc_test" else None

    async def fake_update(self: OrgLocationRepository, location_id: str, **kwargs: Any) -> Any:
        captured.update(kwargs)
        return _OrgLocationRow()

    monkeypatch.setattr(OrgLocationRepository, "get_by_id_for_org", fake_get_by_id_for_org)
    monkeypatch.setattr(OrgLocationRepository, "update", fake_update)
    app, _ = _session_app(monkeypatch, membership=admin_membership)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/organizations/org_test/locations/loc_test",
            json={"name": "HQ", "metadata": {"floor": "3"}},
        )
        missing = await client.patch("/organizations/org_test/locations/loc_missing", json={"name": "HQ"})

    assert resp.status_code == 200
    assert captured["name"] == "HQ"
    assert captured["metadata_"] == {"floor": "3"}
    assert "metadata" not in captured
    assert missing.status_code == 404


async def test_delete_org_location_returns_tombstone(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    deleted: dict[str, Any] = {}

    async def fake_get_by_id_for_org(
        self: OrgLocationRepository, location_id: str, org_id: str, include_deleted: bool = False
    ) -> Any:
        return _OrgLocationRow()

    async def fake_delete(
        self: OrgLocationRepository,
        location_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        deleted["location_id"] = location_id
        deleted["deleted_by"] = deleted_by
        return True

    monkeypatch.setattr(OrgLocationRepository, "get_by_id_for_org", fake_get_by_id_for_org)
    monkeypatch.setattr(OrgLocationRepository, "delete", fake_delete)
    app, _ = _session_app(monkeypatch, membership=admin_membership)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.delete("/organizations/org_test/locations/loc_test")

    assert resp.status_code == 200
    assert resp.json() == {
        "data": {"object": "org_location", "id": "loc_test", "deleted": True},
        "error": None,
    }
    assert deleted == {"location_id": "loc_test", "deleted_by": "usr_test"}


async def test_member_can_list_org_departments(monkeypatch: Any) -> None:
    async def fake_list_by_org(self: OrgDepartmentRepository, org_id: str, include_deleted: bool = False) -> Any:
        assert org_id == "org_test"
        return [_OrgDepartmentRow()]

    monkeypatch.setattr(OrgDepartmentRepository, "list_by_org", fake_list_by_org)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/departments")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "list"
    assert body["data"][0]["object"] == "org_department"
    assert body["data"][0]["id"] == "dep_test"
    assert body["data"][0]["name"] == "Engineering"


async def test_create_org_department_rejects_foreign_parent(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    async def fake_get_by_id_for_org(
        self: OrgDepartmentRepository, department_id: str, org_id: str, include_deleted: bool = False
    ) -> Any:
        return None

    async def fail_create(self: OrgDepartmentRepository, **kwargs: Any) -> Any:
        raise AssertionError("department must not be created with a foreign parent")

    monkeypatch.setattr(OrgDepartmentRepository, "get_by_id_for_org", fake_get_by_id_for_org)
    monkeypatch.setattr(OrgDepartmentRepository, "create", fail_create)
    app, _ = _session_app(monkeypatch, membership=admin_membership)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/organizations/org_test/departments",
            json={"name": "Platform", "parent_department_id": "dep_other_org"},
        )

    assert resp.status_code == 422


async def test_org_admin_can_create_org_department(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    captured: dict[str, Any] = {}

    async def fake_create(self: OrgDepartmentRepository, **kwargs: Any) -> Any:
        captured.update(kwargs)
        return _OrgDepartmentRow()

    monkeypatch.setattr(OrgDepartmentRepository, "create", fake_create)
    app, _ = _session_app(monkeypatch, membership=admin_membership)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/organizations/org_test/departments",
            json={"name": "Engineering", "code": "ENG"},
        )

    assert resp.status_code == 201
    assert captured["organization_id"] == "org_test"
    assert captured["name"] == "Engineering"
    assert captured["code"] == "ENG"
    assert captured["id"].startswith("dep_")
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["object"] == "org_department"


async def test_member_can_list_org_employees(monkeypatch: Any) -> None:
    async def fake_list_by_org(self: EmployeeProfileRepository, org_id: str, include_deleted: bool = False) -> Any:
        assert org_id == "org_test"
        return [_EmployeeProfileRow()]

    monkeypatch.setattr(EmployeeProfileRepository, "list_by_org", fake_list_by_org)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/employees")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "list"
    assert body["data"][0]["object"] == "employee_profile"
    assert body["data"][0]["id"] == "emp_test"
    assert body["data"][0]["membership_id"] == "mbr_emp"
    assert body["data"][0]["user_id"] == "usr_emp"
    assert body["data"][0]["job_title"] == "Senior Engineer"
    assert body["data"][0]["employment_status"] == "active"


async def test_org_admin_can_create_employee_profile(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    captured: dict[str, Any] = {}

    async def fake_get_by_membership(
        self: EmployeeProfileRepository, membership_id: str, include_deleted: bool = False
    ) -> Any:
        return None

    async def fake_create(self: EmployeeProfileRepository, **kwargs: Any) -> Any:
        captured.update(kwargs)
        return _EmployeeProfileRow()

    monkeypatch.setattr(EmployeeProfileRepository, "get_by_membership", fake_get_by_membership)
    monkeypatch.setattr(EmployeeProfileRepository, "create", fake_create)

    app, db_mock = _session_app(monkeypatch, membership=admin_membership)
    db_mock.get_returns[(Membership, "mbr_emp")] = _EmployeeMembershipRow()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/organizations/org_test/employees",
            json={
                "membership_id": "mbr_emp",
                "employee_number": "E-001",
                "job_title": "Senior Engineer",
                "employment_type": "full_time",
            },
        )

    assert resp.status_code == 201
    assert captured["organization_id"] == "org_test"
    assert captured["membership_id"] == "mbr_emp"
    assert captured["employee_number"] == "E-001"
    assert captured["job_title"] == "Senior Engineer"
    assert captured["id"].startswith("emp_")
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["object"] == "employee_profile"
    assert body["data"]["user_id"] == "usr_emp"


async def test_create_employee_profile_conflicts_when_profile_exists(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    async def fake_get_by_membership(
        self: EmployeeProfileRepository, membership_id: str, include_deleted: bool = False
    ) -> Any:
        return _EmployeeProfileRow()

    async def fail_create(self: EmployeeProfileRepository, **kwargs: Any) -> Any:
        raise AssertionError("a duplicate employee profile must not be created")

    monkeypatch.setattr(EmployeeProfileRepository, "get_by_membership", fake_get_by_membership)
    monkeypatch.setattr(EmployeeProfileRepository, "create", fail_create)

    app, db_mock = _session_app(monkeypatch, membership=admin_membership)
    db_mock.get_returns[(Membership, "mbr_emp")] = _EmployeeMembershipRow()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/organizations/org_test/employees", json={"membership_id": "mbr_emp"})

    assert resp.status_code == 409


async def test_create_employee_profile_rejects_foreign_membership(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    foreign = _EmployeeMembershipRow()
    foreign.organization_id = "org_other"  # type: ignore[misc]

    async def fail_create(self: EmployeeProfileRepository, **kwargs: Any) -> Any:
        raise AssertionError("a foreign membership must not get an employee profile")

    monkeypatch.setattr(EmployeeProfileRepository, "create", fail_create)

    app, db_mock = _session_app(monkeypatch, membership=admin_membership)
    db_mock.get_returns[(Membership, "mbr_emp")] = foreign
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/organizations/org_test/employees", json={"membership_id": "mbr_emp"})

    assert resp.status_code == 422


async def test_member_can_retrieve_own_org_details(monkeypatch: Any) -> None:
    async def fake_get_by_id(self: OrganizationRepository, org_id: str, include_deleted: bool = False) -> Any:
        assert org_id == "org_test"
        return _OrganizationRow()

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_by_id)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/organizations/org_test/details")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "organization"
    assert body["id"] == "org_test"
    assert body["slug"] == "acme-corp"


async def test_plain_member_cannot_update_org_details(monkeypatch: Any) -> None:
    async def fail_update(self: OrganizationRepository, org_id: str, **kwargs: Any) -> Any:
        raise AssertionError("a plain member must not update org details")

    monkeypatch.setattr(OrganizationRepository, "update", fail_update)
    app, _ = _session_app(monkeypatch, membership=_MembershipRow())
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch("/organizations/org_test/details", json={"name": "New Name"})

    assert resp.status_code == 403


async def test_org_admin_can_update_org_details(monkeypatch: Any) -> None:
    admin_membership = _MembershipRow()
    admin_membership.role = "admin"  # type: ignore[misc]

    captured: dict[str, Any] = {}

    async def fake_get_by_id(self: OrganizationRepository, org_id: str, include_deleted: bool = False) -> Any:
        return _OrganizationRow()

    async def fake_update(self: OrganizationRepository, org_id: str, **kwargs: Any) -> Any:
        captured["org_id"] = org_id
        captured.update(kwargs)
        return _OrganizationRow()

    monkeypatch.setattr(OrganizationRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(OrganizationRepository, "update", fake_update)
    app, _ = _session_app(monkeypatch, membership=admin_membership)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.patch(
            "/organizations/org_test/details",
            json={
                "doing_business_as": "Acme JA",
                "trn": "123-456-789",
                "industry": "logistics",
                "country_code": "jm",
            },
        )

    assert resp.status_code == 200
    assert captured["org_id"] == "org_test"
    assert captured["doing_business_as"] == "Acme JA"
    assert captured["trn"] == "123-456-789"
    assert captured["industry"] == "logistics"
    assert captured["country_code"] == "JM"
    assert "slug" not in captured
    body = resp.json()
    assert body["error"] is None
    assert body["data"]["object"] == "organization"
