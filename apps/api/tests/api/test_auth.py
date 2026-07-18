from types import SimpleNamespace
from urllib.parse import parse_qs, urlencode, urlparse

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings, get_settings
from core.org_permissions import OWNER_ROLE_NAME
from core.security import require_api_key
from db.models import Organization, User
from db.repositories.auth_email_otps import AuthEmailOtpRepository
from db.repositories.auth_providers import AuthProviderRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.user_features import UserFeatureRepository
from db.repositories.users import UserRepository
from db.session import get_db
from main import create_app
from providers.workos.adapter import WorkOSAuthProvider
from providers.workos.errors import normalize_workos_error


class _ProviderRow:
    def __init__(self, provider_id: str, label: str, icon_slug: str, workos_provider_id: str | None) -> None:
        self.id = provider_id
        self.label = label
        self.icon_slug = icon_slug
        self.workos_provider_id = workos_provider_id


class FakeWorkOSClient:
    organization_external_ids: list[str | None] = []
    deleted_user_ids: list[str] = []
    deleted_organization_ids: list[str] = []

    async def authenticate_with_password(self, email, password, client_id, ip_address=None, user_agent=None):
        if password in {"wrong", "wrongpassword"}:
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(
                401,
                json={"code": "invalid_credentials", "message": "Invalid credentials."},
            )
            raise httpx.HTTPStatusError("Invalid credentials", request=req, response=resp)
        elif email == "verify@example.com":
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(
                400,
                json={
                    "code": "email_verification_required",
                    "pending_authentication_token": "pending_token",
                },
            )
            raise httpx.HTTPStatusError("Verification required", request=req, response=resp)
        return {
            "access_token": "access_token_123",
            "refresh_token": "refresh_token_123",
            "user": {
                "id": "user_wos_123",
                "email": email,
                "firstName": "John",
                "lastName": "Doe",
                "emailVerified": True,
            },
        }

    async def create_user(
        self,
        email,
        password,
        first_name=None,
        last_name=None,
        email_verified=False,
        metadata=None,
    ):
        if email == "taken@example.com":
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(409, json={"code": "email_address_conflict", "message": "Email taken."})
            raise httpx.HTTPStatusError("Email taken", request=req, response=resp)
        return {
            "id": "user_wos_123",
            "email": email,
            "firstName": first_name,
            "lastName": last_name,
            "emailVerified": email_verified,
        }

    async def list_users(self, *, email):
        if email != "taken@example.com":
            return []
        return [
            {
                "id": "user_wos_123",
                "email": email,
                "firstName": "John",
                "lastName": "Doe",
                "emailVerified": False,
            }
        ]

    async def delete_user(self, user_id):
        self.deleted_user_ids.append(user_id)

    async def create_organization(self, name, domain_data=None, external_id=None, metadata=None):
        self.organization_external_ids.append(external_id)
        return {
            "id": "org_wos_123",
            "name": name,
            "metadata": metadata,
        }

    async def delete_organization(self, organization_id):
        self.deleted_organization_ids.append(organization_id)

    async def create_organization_membership(self, user_id, organization_id, role_slug=None):
        return {
            "id": "mem_wos_123",
            "user_id": user_id,
            "organization_id": organization_id,
            "role": role_slug,
        }

    def get_authorization_url(
        self,
        client_id,
        redirect_uri,
        provider=None,
        screen_hint=None,
        login_hint=None,
        state=None,
    ):
        params = urlencode({"provider": provider or "", "redirect_uri": redirect_uri})
        return f"https://api.workos.com/sso/authorize?{params}"

    async def create_magic_auth(self, email, client_id):
        return {
            "id": "magic_auth_123",
            "code": "123456",
        }

    async def authenticate_with_magic_auth(self, code, email, client_id, link_authorization_code=None):
        if code == "wrong":
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(401, json={"code": "invalid_credentials", "message": "Invalid code."})
            raise httpx.HTTPStatusError("Invalid code", request=req, response=resp)
        return {
            "access_token": "access_token_123",
            "refresh_token": "refresh_token_123",
            "user": {
                "id": "user_wos_123",
                "email": email,
            },
        }

    async def create_password_reset(self, email, client_id):
        if email == "unknown@example.com":
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(400, json={"code": "user_not_found", "message": "User not found."})
            raise httpx.HTTPStatusError("User not found", request=req, response=resp)
        return {}

    async def reset_password(self, token, new_password):
        if token == "wrong":
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(401, json={"code": "invalid_token", "message": "Invalid token."})
            raise httpx.HTTPStatusError("Invalid token", request=req, response=resp)
        return {"user": {"id": "user_wos_123", "email": "user@example.com"}}

    async def authenticate_with_email_verification(self, code, pending_authentication_token, client_id):
        return {
            "access_token": "access_token_123",
            "refresh_token": "refresh_token_123",
            "user": {
                "id": "user_wos_123",
                "email": "user@example.com",
                "emailVerified": True,
            },
        }

    async def authenticate_with_code(
        self,
        code,
        client_id,
        code_verifier=None,
        invitation_token=None,
        ip_address=None,
        user_agent=None,
    ):
        return {
            "access_token": "access_token_123",
            "refresh_token": "refresh_token_123",
            "user": {
                "id": "user_wos_123",
                "email": "user@example.com",
                "firstName": "John",
                "lastName": "Doe",
                "emailVerified": True,
                "profile_picture_url": "https://example.com/avatar.jpg",
            },
        }

    async def authenticate_with_refresh_token(self, refresh_token, client_id, organization_id=None):
        return {
            "access_token": "access_token_123",
            "refresh_token": "refresh_token_123",
            "user": {"id": "user_wos_123", "email": "user@example.com"},
        }

    async def add_feature_flag_target(self, slug, target_id):
        return {}


async def _fake_db():
    class FakeSession:
        async def flush(self):
            pass

        async def refresh(self, obj):
            pass

        def add(self, obj):
            pass

        async def scalars(self, stmt):
            class ScalarResult:
                def first(self):
                    return None

                def all(self):
                    return []

            return ScalarResult()

        async def execute(self, stmt):
            class ExecResult:
                rowcount = 1

            return ExecResult()

        def unique(self):
            return self

        def all(self):
            return []

    yield FakeSession()


@pytest.fixture
def client(monkeypatch):
    FakeWorkOSClient.organization_external_ids = []
    FakeWorkOSClient.deleted_user_ids = []
    FakeWorkOSClient.deleted_organization_ids = []

    settings = Settings(
        workos_redirect_uri="http://localhost:3000/callback",
        internal_key="test-internal-key",
    )
    app = create_app(settings)
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[require_api_key] = lambda: True
    monkeypatch.setattr(
        "services.auth.get_auth_provider",
        lambda settings: WorkOSAuthProvider(FakeWorkOSClient()),
    )
    monkeypatch.setattr(
        "services.organization_bootstrap.get_auth_provider",
        lambda settings: WorkOSAuthProvider(FakeWorkOSClient()),
    )
    transport = ASGITransport(app=app)
    return transport


@pytest.mark.asyncio
async def test_resolve_email_success(client, monkeypatch) -> None:
    async def mock_get_by_email(self, email):
        return User(
            id="usr_123",
            workos_user_id="user_wos_123",
            email=email,
            first_name="John",
            last_name="Doe",
            email_verified=True,
            created_at=1700000000,
            updated_at=1700000000,
        )

    monkeypatch.setattr(UserRepository, "get_by_email", mock_get_by_email)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/resolve", json={"identifier": "john@example.com"})

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["email"] == "john@example.com"
    assert body["data"]["business"] is False


@pytest.mark.asyncio
async def test_resolve_email_disposable(client, monkeypatch) -> None:
    monkeypatch.setattr("services.auth.is_disposable_email_domain", lambda email: True)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/resolve", json={"identifier": "test@mailinator.com"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "auth/domain-blacklisted"


@pytest.mark.asyncio
async def test_login_success(client, monkeypatch) -> None:
    async def mock_get_by_workos_id(self, wos_id):
        return User(
            id="usr_123",
            workos_user_id=wos_id,
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            email_verified=True,
            created_at=1700000000,
            updated_at=1700000000,
        )

    monkeypatch.setattr(UserRepository, "get_by_workos_id", mock_get_by_workos_id)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/login",
            json={"identifier": "john@example.com", "password": "password123"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["object"] == "session"
    assert body["data"]["user"]["email"] == "john@example.com"
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_login_verification_required(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/login",
            json={"identifier": "verify@example.com", "password": "password123"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["object"] == "auth_event"
    assert body["data"]["type"] == "email_verification_required"
    assert body["data"]["pendingAuthenticationToken"] == "pending_token"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/login", json={"identifier": "john@example.com", "password": "wrong"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth/invalid-credentials"
    assert response.json()["error"]["message"] == "The email or password you entered is incorrect."


@pytest.mark.asyncio
async def test_login_invalid_username_credentials(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/login", json={"identifier": "johnny", "password": "wrong"})

    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "auth/invalid-credentials",
        "message": "The username or password you entered is incorrect.",
    }


@pytest.mark.asyncio
async def test_register_success(client, monkeypatch) -> None:
    # mock UserRepository.create
    async def mock_create(self, **kwargs):
        return User(
            id="usr_123",
            workos_user_id="user_wos_123",
            email=kwargs["email"],
            first_name=kwargs["first_name"],
            last_name=kwargs["last_name"],
            email_verified=False,
            created_at=1700000000,
            updated_at=1700000000,
        )

    async def mock_update(self, user_id, **kwargs):
        return await mock_create(self, email="john@example.com", first_name="John", last_name="Doe")

    async def mock_upsert(self, user_id, feature_id, **kwargs):
        return None

    monkeypatch.setattr(UserRepository, "create", mock_create)
    monkeypatch.setattr(UserRepository, "update", mock_update)
    monkeypatch.setattr(UserFeatureRepository, "upsert", mock_upsert)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register",
            json={
                "email": "john@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["object"] == "session"
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_register_adopts_existing_workos_user_after_duplicate_email(client, monkeypatch) -> None:
    existing_user = User(
        id="usr_existing",
        workos_user_id="user_wos_123",
        email="taken@example.com",
        first_name="John",
        last_name="Doe",
        email_verified=True,
        status="active",
        created_at=1700000000,
        updated_at=1700000000,
    )

    async def mock_get_by_workos_id(self, workos_user_id):
        assert workos_user_id == "user_wos_123"
        return existing_user

    async def mock_update(self, user_id, **kwargs):
        assert user_id == existing_user.id
        return existing_user

    async def fail_create(self, **kwargs):
        raise AssertionError("adopted users must not create a duplicate local user")

    monkeypatch.setattr(UserRepository, "get_by_workos_id", mock_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "update", mock_update)
    monkeypatch.setattr(UserRepository, "create", fail_create)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register",
            json={
                "email": "taken@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
            },
        )

    assert response.status_code == 200
    assert response.json()["data"]["object"] == "session"


@pytest.mark.asyncio
async def test_register_duplicate_email_with_invalid_password_returns_safe_conflict(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register",
            json={
                "email": "taken@example.com",
                "password": "wrongpassword",
                "firstName": "John",
                "lastName": "Doe",
            },
        )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "auth/email-already-exists",
        "message": "An account with this email already exists. Sign in to continue.",
    }


@pytest.mark.asyncio
async def test_register_adopts_existing_user_when_login_requires_email_verification(client, monkeypatch) -> None:
    existing_user = User(
        id="usr_existing",
        workos_user_id="user_wos_123",
        email="taken@example.com",
        first_name="John",
        last_name="Doe",
        email_verified=False,
        status="inactive",
        created_at=1700000000,
        updated_at=1700000000,
    )

    async def require_verification(self, email, password, client_id, ip_address=None, user_agent=None):
        request = httpx.Request("POST", "https://api.workos.com")
        response = httpx.Response(
            400,
            json={
                "code": "email_verification_required",
                "email": email,
                "pending_authentication_token": "pending_retry_token",
            },
            request=request,
        )
        raise httpx.HTTPStatusError("Verification required", request=request, response=response)

    async def mock_get_by_workos_id(self, workos_user_id):
        assert workos_user_id == existing_user.workos_user_id
        return existing_user

    monkeypatch.setattr(FakeWorkOSClient, "authenticate_with_password", require_verification)
    monkeypatch.setattr(UserRepository, "get_by_workos_id", mock_get_by_workos_id)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register",
            json={
                "email": "taken@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
            },
        )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "object": "auth_event",
        "type": "email_verification_required",
        "email": "taken@example.com",
        "pendingAuthenticationToken": "pending_retry_token",
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "event_code",
    [
        "sso_required",
        "email_password_auth_disabled",
        "organization_authentication_methods_required",
        "authentication_method_not_allowed",
        "radar_challenge",
    ],
)
async def test_register_rejects_adoption_when_login_event_does_not_prove_credentials(
    client, monkeypatch, event_code
) -> None:
    async def unproven_event(self, email, password, client_id, ip_address=None, user_agent=None):
        request = httpx.Request("POST", "https://api.workos.com")
        response = httpx.Response(
            400,
            json={"code": event_code, "email": email},
            request=request,
        )
        raise httpx.HTTPStatusError("Auth flow event", request=request, response=response)

    async def fail_adoption_lookup(self, *, email):
        raise AssertionError("unproven credentials must never reach the adoption lookup")

    monkeypatch.setattr(FakeWorkOSClient, "authenticate_with_password", unproven_event)
    monkeypatch.setattr(FakeWorkOSClient, "list_users", fail_adoption_lookup)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register",
            json={
                "email": "taken@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
            },
        )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "auth/email-already-exists",
        "message": "An account with this email already exists. Sign in to continue.",
    }


@pytest.mark.asyncio
async def test_register_business_rejects_unproven_adoption_before_creating_organizations(
    client, monkeypatch
) -> None:
    async def sso_required_event(self, email, password, client_id, ip_address=None, user_agent=None):
        request = httpx.Request("POST", "https://api.workos.com")
        response = httpx.Response(
            400,
            json={"code": "sso_required", "email": email},
            request=request,
        )
        raise httpx.HTTPStatusError("SSO required", request=request, response=response)

    monkeypatch.setattr(FakeWorkOSClient, "authenticate_with_password", sso_required_event)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register-business",
            json={
                "email": "taken@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
                "organizationName": "Acme Deliveries",
            },
        )

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "auth/email-already-exists",
        "message": "An account with this email already exists. Sign in to continue.",
    }
    assert FakeWorkOSClient.organization_external_ids == []
    assert FakeWorkOSClient.deleted_organization_ids == []


def _patch_business_registration(monkeypatch, *, taken_slugs: set[str] | None = None):
    captured: dict[str, Organization] = {}

    async def mock_create_user(self, **kwargs):
        return User(
            id="usr_123",
            workos_user_id="user_wos_123",
            email=kwargs["email"],
            first_name=kwargs["first_name"],
            last_name=kwargs["last_name"],
            email_verified=False,
            created_at=1700000000,
            updated_at=1700000000,
        )

    async def mock_create_org(self, **kwargs):
        organization = Organization(
            id=kwargs["id"],
            workos_organization_id="org_wos_123",
            name=kwargs["name"],
            slug=kwargs["slug"],
            status="active",
            created_at=1700000000,
            updated_at=1700000000,
        )
        captured["organization"] = organization
        return organization

    async def mock_get_by_slug(self, slug):
        return object() if slug in (taken_slugs or set()) else None

    async def mock_update(self, user_id, **kwargs):
        return await mock_create_user(self, email="john@example.com", first_name="John", last_name="Doe")

    async def mock_create_membership(self, **kwargs):
        return None

    monkeypatch.setattr(UserRepository, "create", mock_create_user)
    monkeypatch.setattr(UserRepository, "update", mock_update)
    monkeypatch.setattr(OrganizationRepository, "get_by_slug", mock_get_by_slug)
    monkeypatch.setattr(OrganizationRepository, "create", mock_create_org)
    monkeypatch.setattr(MembershipRepository, "create", mock_create_membership)
    return captured


@pytest.mark.asyncio
async def test_register_business_without_slug_generates_from_name(client, monkeypatch) -> None:
    captured = _patch_business_registration(monkeypatch)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register-business",
            json={
                "email": "john@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
                "organizationName": "Acme Deliveries Ltd.",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["object"] == "session"
    assert captured["organization"].slug == "acme-deliveries-ltd"
    assert FakeWorkOSClient.organization_external_ids == [captured["organization"].id]
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_register_business_compensates_organization_and_preserves_user_on_local_failure(
    client, monkeypatch
) -> None:
    _patch_business_registration(monkeypatch)

    async def fail_create_org(self, **kwargs):
        raise RuntimeError("local organization write failed")

    monkeypatch.setattr(OrganizationRepository, "create", fail_create_org)

    with pytest.raises(RuntimeError, match="local organization write failed"):
        async with AsyncClient(transport=client, base_url="http://testserver") as ac:
            await ac.post(
                "/auth/register-business",
                json={
                    "email": "john@example.com",
                    "password": "password123",
                    "firstName": "John",
                    "lastName": "Doe",
                    "organizationName": "Acme Deliveries Ltd.",
                },
            )

    assert FakeWorkOSClient.deleted_organization_ids == ["org_wos_123"]
    assert FakeWorkOSClient.deleted_user_ids == []


@pytest.mark.asyncio
async def test_register_business_resumes_adopted_user_with_existing_membership(client, monkeypatch) -> None:
    updates: list[dict] = []
    existing_user = User(
        id="usr_existing",
        workos_user_id="user_wos_123",
        email="taken@example.com",
        first_name="John",
        last_name="Doe",
        email_verified=True,
        status="active",
        created_at=1700000000,
        updated_at=1700000000,
    )

    async def mock_get_by_workos_id(self, workos_user_id):
        assert workos_user_id == existing_user.workos_user_id
        return existing_user

    async def mock_list_memberships(self, **kwargs):
        assert kwargs == {"limit": 1, "user_id": existing_user.id}
        return [SimpleNamespace(id="membership_existing")], False

    async def mock_update(self, user_id, **kwargs):
        assert user_id == existing_user.id
        updates.append(kwargs)
        return existing_user

    async def fail_create_user(self, **kwargs):
        raise AssertionError("an adopted user must not be duplicated locally")

    async def fail_create_organization(self, **kwargs):
        raise AssertionError("an existing membership must resume without a new organization")

    monkeypatch.setattr(UserRepository, "get_by_workos_id", mock_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "create", fail_create_user)
    monkeypatch.setattr(UserRepository, "update", mock_update)
    monkeypatch.setattr(MembershipRepository, "list", mock_list_memberships)
    monkeypatch.setattr(OrganizationRepository, "create", fail_create_organization)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register-business",
            json={
                "email": "taken@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
                "organizationName": "Ignored Retry Organization",
            },
        )

    assert response.status_code == 200
    assert response.json()["data"]["object"] == "session"
    assert any(update.get("status") == "active" for update in updates)
    assert FakeWorkOSClient.organization_external_ids == []
    assert FakeWorkOSClient.deleted_user_ids == []
    assert FakeWorkOSClient.deleted_organization_ids == []


@pytest.mark.asyncio
async def test_register_business_does_not_delete_adopted_user_when_new_org_setup_fails(client, monkeypatch) -> None:
    _patch_business_registration(monkeypatch)
    existing_user = User(
        id="usr_existing",
        workos_user_id="user_wos_123",
        email="taken@example.com",
        first_name="John",
        last_name="Doe",
        email_verified=True,
        status="active",
        created_at=1700000000,
        updated_at=1700000000,
    )

    async def mock_get_by_workos_id(self, workos_user_id):
        return existing_user

    async def mock_list_memberships(self, **kwargs):
        return [], False

    async def fail_create_user(self, **kwargs):
        raise AssertionError("an adopted user must not be duplicated locally")

    async def fail_create_org(self, **kwargs):
        raise RuntimeError("local organization write failed for adopted user")

    monkeypatch.setattr(UserRepository, "get_by_workos_id", mock_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "create", fail_create_user)
    monkeypatch.setattr(MembershipRepository, "list", mock_list_memberships)
    monkeypatch.setattr(OrganizationRepository, "create", fail_create_org)

    with pytest.raises(RuntimeError, match="local organization write failed for adopted user"):
        async with AsyncClient(transport=client, base_url="http://testserver") as ac:
            await ac.post(
                "/auth/register-business",
                json={
                    "email": "taken@example.com",
                    "password": "password123",
                    "firstName": "John",
                    "lastName": "Doe",
                    "organizationName": "Acme Deliveries",
                },
            )

    assert FakeWorkOSClient.deleted_organization_ids == ["org_wos_123"]
    assert FakeWorkOSClient.deleted_user_ids == []


@pytest.mark.asyncio
async def test_register_business_preserves_new_user_when_workos_org_creation_fails(client, monkeypatch) -> None:
    _patch_business_registration(monkeypatch)

    async def fail_create_organization(self, name, domain_data=None, external_id=None, metadata=None):
        raise RuntimeError("WorkOS organization creation failed")

    monkeypatch.setattr(FakeWorkOSClient, "create_organization", fail_create_organization)

    with pytest.raises(RuntimeError, match="WorkOS organization creation failed"):
        async with AsyncClient(transport=client, base_url="http://testserver") as ac:
            await ac.post(
                "/auth/register-business",
                json={
                    "email": "new-owner@example.com",
                    "password": "password123",
                    "firstName": "New",
                    "lastName": "Owner",
                    "organizationName": "Acme Deliveries",
                },
            )

    assert FakeWorkOSClient.deleted_organization_ids == []
    assert FakeWorkOSClient.deleted_user_ids == []


@pytest.mark.asyncio
async def test_register_business_organization_compensation_failure_does_not_mask_original_error(
    client, monkeypatch
) -> None:
    _patch_business_registration(monkeypatch)

    async def fail_create_org(self, **kwargs):
        raise RuntimeError("original local failure")

    async def fail_delete_organization(self, organization_id):
        self.deleted_organization_ids.append(organization_id)
        raise RuntimeError("organization compensation failed")

    monkeypatch.setattr(OrganizationRepository, "create", fail_create_org)
    monkeypatch.setattr(FakeWorkOSClient, "delete_organization", fail_delete_organization)

    with pytest.raises(RuntimeError, match="original local failure"):
        async with AsyncClient(transport=client, base_url="http://testserver") as ac:
            await ac.post(
                "/auth/register-business",
                json={
                    "email": "new-owner@example.com",
                    "password": "password123",
                    "firstName": "New",
                    "lastName": "Owner",
                    "organizationName": "Acme Deliveries",
                },
            )

    assert FakeWorkOSClient.deleted_organization_ids == ["org_wos_123"]
    assert FakeWorkOSClient.deleted_user_ids == []


@pytest.mark.asyncio
async def test_register_business_without_slug_suffixes_collision(client, monkeypatch) -> None:
    captured = _patch_business_registration(monkeypatch, taken_slugs={"acme-deliveries-ltd"})

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register-business",
            json={
                "email": "john@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
                "organizationName": "Acme Deliveries Ltd.",
            },
        )

    assert response.status_code == 200
    assert captured["organization"].slug == "acme-deliveries-ltd-2"


@pytest.mark.asyncio
async def test_register_business_with_taken_explicit_slug_still_conflicts(client, monkeypatch) -> None:
    _patch_business_registration(monkeypatch, taken_slugs={"acme-deliveries"})

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/register-business",
            json={
                "email": "john@example.com",
                "password": "password123",
                "firstName": "John",
                "lastName": "Doe",
                "organizationName": "Acme Deliveries Ltd.",
                "organizationSlug": "acme-deliveries",
            },
        )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "auth/organization-slug-taken"


def _patch_organization_bootstrap(
    monkeypatch,
    *,
    owner_exists: bool = True,
    taken_slugs: set[str] | None = None,
):
    captured = {}
    owner = User(
        id="usr_existing",
        workos_user_id="user_wos_existing",
        email="owner@example.com",
        first_name="Existing",
        last_name="Owner",
        email_verified=True,
        status="active",
        created_at=1700000000,
        updated_at=1700000000,
    )

    async def mock_get_user(self, user_id, include_deleted=False):
        return owner if owner_exists and user_id == owner.id else None

    async def mock_get_by_slug(self, slug, include_deleted=False):
        return object() if slug in (taken_slugs or set()) else None

    async def mock_create_org(self, **kwargs):
        organization = SimpleNamespace(
            id=kwargs["id"],
            workos_organization_id=kwargs["workos_organization_id"],
            name=kwargs["name"],
            slug=kwargs["slug"],
            status=kwargs["status"],
            logo_url=None,
            primary_phone=None,
            primary_email=None,
            website_url=None,
            support_url=None,
            address_line1=None,
            address_line2=None,
            city=None,
            region_id=None,
            country_code=None,
            currency_code=None,
            enrollment_completed_at=None,
            metadata_=kwargs["metadata_"],
            deleted_at=None,
            deleted_by=None,
            deletion_reason=None,
            created_at=kwargs["created_at"],
            updated_at=kwargs["updated_at"],
        )
        captured["organization"] = organization
        return organization

    async def mock_create_membership(self, **kwargs):
        captured["membership"] = kwargs
        return None

    async def mock_provision_organization(db, org_id, now):
        captured["provisioned_org_id"] = org_id
        return {OWNER_ROLE_NAME: SimpleNamespace(id="role_owner")}

    monkeypatch.setattr(UserRepository, "get_by_id", mock_get_user)
    monkeypatch.setattr(OrganizationRepository, "get_by_slug", mock_get_by_slug)
    monkeypatch.setattr(OrganizationRepository, "create", mock_create_org)
    monkeypatch.setattr(MembershipRepository, "create", mock_create_membership)
    monkeypatch.setattr(
        "services.organization_bootstrap.provision_organization",
        mock_provision_organization,
    )
    return captured


@pytest.mark.asyncio
async def test_bootstrap_organization_creates_active_owner_membership(client, monkeypatch) -> None:
    captured = _patch_organization_bootstrap(monkeypatch)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/organizations/bootstrap",
            headers={"x-internal-key": "test-internal-key"},
            json={
                "owner_user_id": "usr_existing",
                "name": "Acme Deliveries",
                "slug": "acme-deliveries",
            },
        )

    assert response.status_code == 201
    assert response.json()["data"]["slug"] == "acme-deliveries"
    assert captured["provisioned_org_id"] == captured["organization"].id
    assert captured["membership"]["user_id"] == "usr_existing"
    assert captured["membership"]["role"] == OWNER_ROLE_NAME
    assert captured["membership"]["role_id"] == "role_owner"
    assert captured["membership"]["status"] == "active"
    assert FakeWorkOSClient.organization_external_ids == [captured["organization"].id]


@pytest.mark.asyncio
async def test_bootstrap_organization_returns_404_for_unknown_owner(client, monkeypatch) -> None:
    _patch_organization_bootstrap(monkeypatch, owner_exists=False)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/organizations/bootstrap",
            headers={"x-internal-key": "test-internal-key"},
            json={"owner_user_id": "usr_unknown", "name": "Acme Deliveries"},
        )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "user/not-found"


@pytest.mark.asyncio
async def test_bootstrap_organization_rejects_explicit_taken_slug(client, monkeypatch) -> None:
    _patch_organization_bootstrap(monkeypatch, taken_slugs={"acme-deliveries"})

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/organizations/bootstrap",
            headers={"x-internal-key": "test-internal-key"},
            json={
                "owner_user_id": "usr_existing",
                "name": "Acme Deliveries",
                "slug": "acme-deliveries",
            },
        )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "organization/duplicate-slug"


@pytest.mark.asyncio
async def test_bootstrap_organization_generates_omitted_slug(client, monkeypatch) -> None:
    captured = _patch_organization_bootstrap(monkeypatch)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/organizations/bootstrap",
            headers={"x-internal-key": "test-internal-key"},
            json={"owner_user_id": "usr_existing", "name": "Acme Deliveries Ltd."},
        )

    assert response.status_code == 201
    assert response.json()["data"]["slug"] == "acme-deliveries-ltd"
    assert captured["organization"].slug == "acme-deliveries-ltd"


@pytest.mark.asyncio
async def test_bootstrap_organization_compensates_workos_org_when_local_creation_fails(client, monkeypatch) -> None:
    _patch_organization_bootstrap(monkeypatch)

    async def fail_create_org(self, **kwargs):
        raise RuntimeError("local bootstrap write failed")

    monkeypatch.setattr(OrganizationRepository, "create", fail_create_org)

    with pytest.raises(RuntimeError, match="local bootstrap write failed"):
        async with AsyncClient(transport=client, base_url="http://testserver") as ac:
            await ac.post(
                "/organizations/bootstrap",
                headers={"x-internal-key": "test-internal-key"},
                json={"owner_user_id": "usr_existing", "name": "Acme Deliveries"},
            )

    assert FakeWorkOSClient.deleted_organization_ids == ["org_wos_123"]
    assert FakeWorkOSClient.deleted_user_ids == []


@pytest.mark.asyncio
async def test_bootstrap_organization_compensates_when_workos_membership_creation_fails(client, monkeypatch) -> None:
    _patch_organization_bootstrap(monkeypatch)

    async def fail_create_membership(self, user_id, organization_id, role_slug=None):
        raise RuntimeError("WorkOS membership creation failed")

    monkeypatch.setattr(FakeWorkOSClient, "create_organization_membership", fail_create_membership)

    with pytest.raises(RuntimeError, match="WorkOS membership creation failed"):
        async with AsyncClient(transport=client, base_url="http://testserver") as ac:
            await ac.post(
                "/organizations/bootstrap",
                headers={"x-internal-key": "test-internal-key"},
                json={"owner_user_id": "usr_existing", "name": "Acme Deliveries"},
            )

    assert FakeWorkOSClient.deleted_organization_ids == ["org_wos_123"]


@pytest.mark.parametrize(
    ("upstream_code", "expected_code", "expected_status", "expected_message"),
    [
        (
            "user_creation_error",
            "auth/registration-failed",
            400,
            "We couldn't create your account. Please try again.",
        ),
        (
            "external_id_already_used",
            "organization/provider-conflict",
            409,
            "We couldn't complete organization setup. Please try again.",
        ),
    ],
)
def test_normalize_workos_error_maps_provider_conflicts_to_safe_errors(
    upstream_code,
    expected_code,
    expected_status,
    expected_message,
) -> None:
    request = httpx.Request("POST", "https://api.workos.com")
    response = httpx.Response(
        400,
        json={"code": upstream_code, "message": "raw provider details"},
        request=request,
    )

    error = normalize_workos_error(httpx.HTTPStatusError("provider failed", request=request, response=response))

    assert error.app_code == expected_code
    assert error.status_code == expected_status
    assert error.app_message == expected_message
    assert "raw provider details" not in error.app_message


def test_normalize_workos_error_never_uses_raw_provider_message_for_fallback() -> None:
    request = httpx.Request("POST", "https://api.workos.com")
    response = httpx.Response(
        418,
        json={"code": "unexpected_provider_code", "message": "sensitive provider details"},
        request=request,
    )

    error = normalize_workos_error(httpx.HTTPStatusError("provider failed", request=request, response=response))

    assert error.app_code == "auth/oauth-failed"
    assert error.status_code == 418
    assert error.app_message == "Authentication provider error."


@pytest.mark.asyncio
async def test_social_login(client, monkeypatch) -> None:
    async def fake_get_enabled_by_id(self, provider_id: str):
        assert provider_id == "google"
        return _ProviderRow("google", "Google", "google", "GoogleOAuth")

    monkeypatch.setattr(AuthProviderRepository, "get_enabled_by_id", fake_get_enabled_by_id)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/social-login", json={"provider": "google"})

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    params = parse_qs(urlparse(body["data"]["url"]).query)
    assert params["provider"] == ["GoogleOAuth"]
    assert params["redirect_uri"] == ["http://localhost:3000/callback"]


@pytest.mark.asyncio
async def test_social_login_uses_forwarded_origin_for_local_redirect_uri(client, monkeypatch) -> None:
    async def fake_get_enabled_by_id(self, provider_id: str):
        assert provider_id == "google"
        return _ProviderRow("google", "Google", "google", "GoogleOAuth")

    monkeypatch.setattr(AuthProviderRepository, "get_enabled_by_id", fake_get_enabled_by_id)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/social-login",
            headers={"x-876-origin": "https://example-3000.app.github.dev"},
            json={"provider": "google"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    params = parse_qs(urlparse(body["data"]["url"]).query)
    assert params["redirect_uri"] == ["https://example-3000.app.github.dev/callback"]


@pytest.mark.asyncio
async def test_list_providers(client, monkeypatch) -> None:
    async def fake_list_enabled(self):
        return [
            _ProviderRow("google", "Google", "google", "GoogleOAuth"),
            _ProviderRow("apple", "Apple", "apple", "AppleOAuth"),
            _ProviderRow("microsoft", "Microsoft", "microsoft", "MicrosoftOAuth"),
        ]

    monkeypatch.setattr(AuthProviderRepository, "list_enabled", fake_list_enabled)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.get("/auth/providers")

    assert response.status_code == 200
    payload = response.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["object"] == "list"
    assert body["url"] == "/auth/providers"
    ids = [p["id"] for p in body["data"]]
    assert ids == ["google", "apple", "microsoft"]
    google = body["data"][0]
    assert google["object"] == "auth_provider"
    assert google["label"] == "Google"
    assert google["icon_slug"] == "google"


@pytest.mark.asyncio
async def test_send_magic_otp_success(client, monkeypatch) -> None:
    async def mock_get_by_email(self, email):
        return None

    async def mock_upsert(self, email, **kwargs):
        return None

    monkeypatch.setattr(AuthEmailOtpRepository, "get_by_email", mock_get_by_email)
    monkeypatch.setattr(AuthEmailOtpRepository, "upsert", mock_upsert)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/magic-otp/send", json={"email": "john@example.com"})

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "data": {
            "email": "john@example.com",
            "canResendAt": body["data"]["canResendAt"],
        },
        "error": None,
    }


@pytest.mark.asyncio
async def test_verify_magic_otp_success(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/magic-otp/verify",
            json={"email": "john@example.com", "code": "123456"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["user"]["email"] == "john@example.com"
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_recover_success(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/recover", json={"email": "john@example.com"})

    assert response.status_code == 200
    assert response.json() == {
        "data": {"email": "john@example.com"},
        "error": None,
    }


@pytest.mark.asyncio
async def test_recover_silent_swallow(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/recover", json={"email": "unknown@example.com"})

    assert response.status_code == 200
    assert response.json() == {
        "data": {"email": "unknown@example.com"},
        "error": None,
    }


@pytest.mark.asyncio
async def test_reset_password_success(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/reset-password",
            json={"token": "valid-token", "password": "newpassword123"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "data": {"email": "user@example.com"},
        "error": None,
    }


@pytest.mark.asyncio
async def test_verify_email_success(client, monkeypatch) -> None:
    async def mock_get_by_email(self, email):
        return User(
            id="usr_123",
            workos_user_id="user_wos_123",
            email=email,
            first_name="John",
            last_name="Doe",
            email_verified=False,
            created_at=1700000000,
            updated_at=1700000000,
        )

    async def mock_update(self, user_id, **kwargs):
        return None

    monkeypatch.setattr(UserRepository, "get_by_email", mock_get_by_email)
    monkeypatch.setattr(UserRepository, "update", mock_update)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post(
            "/auth/verify-email",
            json={"code": "123456", "pendingAuthenticationToken": "pending-token"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["user"]["email"] == "user@example.com"
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_callback_success(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/callback", json={"code": "auth-code"})

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["user"]["email"] == "user@example.com"
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_callback_refreshes_existing_user_avatar(client, monkeypatch) -> None:
    existing_user = User(
        id="usr_123",
        workos_user_id="user_wos_123",
        email="old@example.com",
        first_name="Old",
        last_name="Name",
        email_verified=False,
        avatar=None,
        created_at=1700000000,
        updated_at=1700000000,
    )
    updates = {}

    async def mock_get_by_workos_id(self, workos_user_id):
        assert workos_user_id == "user_wos_123"
        return existing_user

    async def mock_update(self, user_id, **kwargs):
        updates.update(kwargs)
        return User(
            id=user_id,
            workos_user_id="user_wos_123",
            email=kwargs["email"],
            first_name=kwargs["first_name"],
            last_name=kwargs["last_name"],
            email_verified=kwargs["email_verified"],
            avatar=kwargs["avatar"],
            created_at=1700000000,
            updated_at=kwargs["updated_at"],
        )

    monkeypatch.setattr(UserRepository, "get_by_workos_id", mock_get_by_workos_id)
    monkeypatch.setattr(UserRepository, "update", mock_update)

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/callback", json={"code": "auth-code"})

    payload = response.json()
    assert payload["error"] is None
    body = payload["data"]
    assert response.status_code == 200
    assert updates["avatar"] == "https://example.com/avatar.jpg"
    assert body["user"]["avatar"] == "https://example.com/avatar.jpg"
    assert "876-session=" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_refresh_success(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.post("/auth/refresh", json={"refreshToken": "refresh-token"})

    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["user"]["id"] == "user_wos_123"


@pytest.mark.asyncio
async def test_get_routing_memberships_requires_internal_key(client) -> None:
    # The browser-facing auth bridges attach the app API key to arbitrary
    # /auth/* paths, so this endpoint must reject app-key-only callers —
    # otherwise anyone could enumerate any user's org memberships.
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        response = await ac.get("/auth/routing/memberships", params={"userId": "usr_123"})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_routing_memberships_missing_user_id(monkeypatch) -> None:
    settings = Settings(
        workos_redirect_uri="http://localhost:3000/callback",
        internal_key="test-internal-key",
    )
    app = create_app(settings)
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        response = await ac.get(
            "/auth/routing/memberships",
            headers={"x-internal-key": "test-internal-key"},
        )

    assert response.status_code == 400
