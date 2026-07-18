from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.security import require_api_key
from core.session import unseal_session
from db.models import (
    ApiKey,
    App,
    AuthorizationCode,
    OauthRefreshToken,
    Session,
    User,
)
from db.session import get_db
from domains.oauth.tokens import sha256_base64url, sha256_hash, sign_provider_jwt
from main import create_app

# First-party identity is only trusted when the internal key accompanies the
# asserted user (the app's OAuth proxy injects it server-side).
INTERNAL_KEY = "test-internal-key"
INTERNAL_HEADERS = {"x-internal-key": INTERNAL_KEY}

# ── Mock Database Session ──────────────────────────────────────────────────────────


class MockSession:
    def __init__(self) -> None:
        self.added: list[Any] = []
        self.query_results: dict[str, list[Any]] = {}
        self.get_results: dict[tuple[Any, Any], Any] = {}

    async def get(self, model_class: Any, ident: Any) -> Any:
        return self.get_results.get((model_class, ident))

    def add(self, instance: Any) -> None:
        self.added.append(instance)

    async def flush(self) -> None:
        pass

    async def commit(self) -> None:
        pass

    async def execute(self, stmt: Any, *args: Any, **kwargs: Any) -> Any:
        class MockResult:
            rowcount = 1

        return MockResult()

    async def scalars(self, stmt: Any, *args: Any, **kwargs: Any) -> Any:
        stmt_str = str(stmt)
        results: list[Any] = []
        for key, val in self.query_results.items():
            if key in stmt_str:
                results = val
                break

        class MockScalarsResult:
            def first(self) -> Any:
                return results[0] if results else None

            def all(self) -> list[Any]:
                return results

        return MockScalarsResult()


# ── Test Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def mock_db() -> MockSession:
    return MockSession()


@pytest.fixture
def app(mock_db: MockSession) -> Any:
    # Use fallback RSA keys, which will be generated dynamically
    settings = Settings(
        oauth_issuer="https://auth.example.com",
        internal_key=INTERNAL_KEY,
    )
    application = create_app(settings)

    async def get_db_override() -> AsyncIterator[MockSession]:
        yield mock_db

    application.dependency_overrides[get_db] = get_db_override
    application.dependency_overrides[require_api_key] = lambda: True
    return application


def response_data(response: Any) -> Any:
    payload = response.json()
    assert payload["error"] is None
    return payload["data"]


def response_error(response: Any) -> Any:
    payload = response.json()
    assert payload["data"] is None
    return payload["error"]


# ── Test Cases ─────────────────────────────────────────────────────────────────────


async def test_openid_configuration(app: Any) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/oauth/.well-known/openid-configuration")

    assert response.status_code == 200
    data = response.json()
    assert "data" not in data
    assert "error" not in data
    assert data["issuer"] == "https://auth.example.com"
    assert data["authorization_endpoint"] == "https://auth.example.com/oauth/authorize"
    assert data["token_endpoint"] == "https://auth.example.com/oauth/token"
    assert data["jwks_uri"] == "https://auth.example.com/.well-known/jwks.json"
    assert {
        "billing.customers.read",
        "billing.items.write",
        "billing.invoices.write",
        "billing.payments.write",
    }.issubset(data["scopes_supported"])


async def test_jwks(app: Any) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/oauth/.well-known/jwks.json")

    assert response.status_code == 200
    data = response.json()
    assert "data" not in data
    assert "error" not in data
    assert "keys" in data
    assert len(data["keys"]) == 1
    key = data["keys"][0]
    assert key["kty"] == "RSA"
    assert "n" in key
    assert "e" in key
    assert key["alg"] == "RS256"
    assert key["use"] == "sig"


async def test_authorize_validation(app: Any) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Invalid response type
        resp1 = await client.get("/oauth/authorize?response_type=token")
        assert resp1.status_code == 400

        # Invalid client (not found)
        resp2 = await client.get(
            "/oauth/authorize?response_type=code&client_id=bad&redirect_uri=http%3A%2F%2Fclient.example.com%2Fcallback"
        )
        assert resp2.status_code == 401


async def test_authorize_login_required(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # No user session
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback"
        )
        assert resp.status_code == 401
        assert response_error(resp)["code"] == "provider/login-required"


async def test_authorize_consent_required(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        app_kind="external",
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_123",
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        assert response_data(resp)["status"] == "consent_required"
        assert "consentPath" in response_data(resp)


async def test_authorize_direct_redirect_first_party(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        app_kind="internal",
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_123",
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        assert response_data(resp)["status"] == "authorized"
        assert "code=" in response_data(resp)["redirectTo"]


async def test_authorize_select_account_required(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        app_kind="internal",
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_123&prompt=select_account",
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 401
        assert response_error(resp)["code"] == "provider/account-selection-required"


async def test_consent_get_data(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        name="Test Client",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        logo_url="http://logo.com",
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/consent?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_123",
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        data = response_data(resp)
        assert data["app"]["name"] == "Test Client"
        assert data["user"]["email"] == "person@example.com"


async def test_consent_approve(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/consent/approve?user_id=usr_123",
            json={
                "response_type": "code",
                "client_id": "client_123",
                "redirect_uri": "https://client.example.com/callback",
                "scope": "openid email",
            },
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        assert response_data(resp)["status"] == "authorized"
        assert "code=" in response_data(resp)["redirectTo"]


async def test_consent_deny(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/consent/deny",
            json={
                "response_type": "code",
                "client_id": "client_123",
                "redirect_uri": "https://client.example.com/callback",
                "scope": "openid email",
            },
        )
        assert resp.status_code == 200
        assert response_data(resp)["status"] == "authorized"
        assert "error=access_denied" in response_data(resp)["redirectTo"]


async def test_token_exchange(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        client_type="public",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_auth_code = AuthorizationCode(
        id="auc_123",
        code_hash=sha256_hash("code_123"),
        user_id="usr_123",
        app_id="rap_123",
        redirect_uri="https://client.example.com/callback",
        code_challenge=sha256_base64url("verifier_123"),
        code_challenge_method="S256",
        scope="openid email",
        auth_time=int(time.time()),
        expires_at=int(time.time()) + 600,
        used_at=None,
        app=mock_app,
        user=mock_user,
    )
    mock_db.query_results["authorization_codes"] = [mock_auth_code]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": "code_123",
                "redirect_uri": "https://client.example.com/callback",
                "client_id": "client_123",
                "code_verifier": "verifier_123",
            },
        )
        assert resp.status_code == 200
        data = response_data(resp)
        assert "access_token" in data
        assert "id_token" in data
        assert data["token_type"] == "Bearer"


async def test_userinfo(app: Any, mock_db: MockSession) -> None:
    settings = app.state.settings
    # Generate access token
    access_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_123",
            "aud": "client_123",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "sid": "ses_123",
            "scope": "openid email profile",
            "token_use": "access",
        },
        settings,
    )

    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
        avatar="http://avatar.com",
    )
    mock_session = Session(
        id="ses_123",
        user_id="usr_123",
        token_hash=sha256_hash(access_token),
        expires_at=int(time.time()) + 3600,
        user=mock_user,
    )
    mock_db.query_results["sessions"] = [mock_session]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/oauth/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        assert resp.status_code == 200
        data = response_data(resp)
        assert data["sub"] == "usr_123"
        assert data["email"] == "person@example.com"
        assert data["name"] == "Person Example"


async def test_revoke(app: Any, mock_db: MockSession) -> None:
    mock_api_key = ApiKey(
        id="876_app_key_123",
        key_hash=sha256_hash("876_app_secret_123"),
        revoked=False,
        expires_at=None,
    )
    mock_db.query_results["api_keys"] = [mock_api_key]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/revoke",
            headers={"Authorization": "Bearer 876_app_secret_123"},
            data={"token": "access_token_123"},
        )
        assert resp.status_code == 200
        assert response_data(resp) == {"revoked": True}


async def test_authorize_rejects_untrusted_identity(app: Any, mock_db: MockSession) -> None:
    # A user_id query param without the internal key must not be trusted.
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        app_kind="external",
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_123"
        )
        assert resp.status_code == 401
        assert response_error(resp)["code"] == "provider/login-required"


async def test_authorize_internal_app_allows_enterprise(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        app_kind="internal",
    )
    mock_user = User(
        id="usr_ent",
        email="staff@example.com",
        email_verified=True,
        first_name="Staff",
        last_name="Member",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_ent")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_ent",
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        assert response_data(resp)["status"] == "authorized"


async def test_authorize_external_app_allows_any_user(app: Any, mock_db: MockSession) -> None:
    """All users can authorize external apps — no account-type gate in the unified identity model."""
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email"],
        app_kind="external",
    )
    mock_user = User(
        id="usr_ent",
        email="staff@example.com",
        email_verified=True,
        first_name="Staff",
        last_name="Member",
    )
    mock_db.query_results["apps"] = [mock_app]
    mock_db.get_results[(User, "usr_ent")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/authorize?response_type=code&client_id=client_123&redirect_uri=https%3A%2F%2Fclient.example.com%2Fcallback&user_id=usr_ent",
            headers=INTERNAL_HEADERS,
        )
        assert resp.status_code == 200
        # External app — user hasn't consented yet, so consent is required (not a 403 rejection).
        assert response_data(resp)["status"] in ("authorized", "consent_required")


async def test_refresh_token_grant(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        client_type="public",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email", "offline_access"],
    )
    mock_user = User(
        id="usr_123",
        email="person@example.com",
        email_verified=True,
        first_name="Person",
        last_name="Example",
    )
    mock_rt = OauthRefreshToken(
        id="rft_123",
        token_hash=sha256_hash("rt_value_123"),
        user_id="usr_123",
        app_id="rap_123",
        session_id="ses_old",
        scope="openid email offline_access",
        expires_at=int(time.time()) + 10000,
        used_at=None,
        revoked_at=None,
        created_at=int(time.time()),
    )
    mock_db.query_results["oauth_refresh_tokens"] = [mock_rt]
    mock_db.get_results[(App, "rap_123")] = mock_app
    mock_db.get_results[(User, "usr_123")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": "rt_value_123",
                "client_id": "client_123",
            },
        )
        assert resp.status_code == 200
        data = response_data(resp)
        assert "access_token" in data
        # offline_access scope ⇒ a rotated refresh token is returned.
        assert data["refresh_token"]


async def test_refresh_token_reuse_detected(app: Any, mock_db: MockSession) -> None:
    # A token already rotated (used_at set, revoked_at still None) is a replay:
    # it must be rejected as invalid_grant, not silently treated as expired.
    mock_app = App(
        id="rap_123",
        client_id="client_123",
        client_type="public",
        allowed_redirect_uris=["https://client.example.com/callback"],
        scopes_allowed=["openid", "email", "offline_access"],
    )
    mock_rt = OauthRefreshToken(
        id="rft_123",
        token_hash=sha256_hash("rt_used_123"),
        user_id="usr_123",
        app_id="rap_123",
        session_id="ses_old",
        scope="openid email offline_access",
        expires_at=int(time.time()) + 10000,
        used_at=int(time.time()) - 10,
        revoked_at=None,
        created_at=int(time.time()),
    )
    mock_db.query_results["oauth_refresh_tokens"] = [mock_rt]
    mock_db.get_results[(App, "rap_123")] = mock_app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": "rt_used_123",
                "client_id": "client_123",
            },
        )
        assert resp.status_code == 400
        assert response_error(resp)["code"] == "invalid_grant"


async def test_introspect_active(app: Any, mock_db: MockSession) -> None:
    settings = app.state.settings
    access_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_123",
            "aud": "client_123",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "sid": "ses_123",
            "scope": "openid email",
            "token_use": "access",
        },
        settings,
    )

    mock_api_key = ApiKey(
        id="876_app_key_123",
        key_hash=sha256_hash("876_app_secret_123"),
        revoked=False,
        expires_at=None,
    )
    mock_session = Session(
        id="ses_123",
        user_id="usr_123",
        app_id="rap_client",
        token_hash=sha256_hash(access_token),
        expires_at=int(time.time()) + 3600,
    )
    mock_db.query_results["api_keys"] = [mock_api_key]
    mock_db.query_results["sessions"] = [mock_session]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/introspect",
            headers={"Authorization": "Bearer 876_app_secret_123"},
            data={"token": access_token},
        )
        assert resp.status_code == 200
        data = response_data(resp)
        assert data["active"] is True
        assert data["app_id"] == "rap_client"
        assert data["sub"] == "usr_123"
        assert data["scope"] == "openid email"


async def test_create_session_from_oauth_id_token(app: Any, mock_db: MockSession) -> None:
    # Console exchanges its OAuth id token for a first-party session cookie.
    settings = app.state.settings
    id_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_ent",
            "aud": "client_mc",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "token_use": "id",
        },
        settings,
    )
    now = int(time.time())
    mock_user = User(
        id="usr_ent",
        workos_user_id="user_workos_ent",
        email="staff@example.com",
        email_verified=True,
        first_name="Staff",
        last_name="Member",
        middle_name=None,
        username=None,
        avatar="https://example.com/staff-avatar.jpg",
        status="active",
        created_at=now,
        updated_at=now,
    )
    mock_db.get_results[(User, "usr_ent")] = mock_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/auth/oauth/session", json={"id_token": id_token})
        assert resp.status_code == 200
        data = response_data(resp)
        assert data["object"] == "session"
        assert data["user"]["id"] == "usr_ent"
        assert data["user"]["avatar"] == "https://example.com/staff-avatar.jpg"
        cookie = resp.cookies.get("876-session")
        assert cookie is not None
        payload = unseal_session(cookie, settings.resolved_session_cookie_secret)
        assert payload is not None
        assert payload["avatar"] == "https://example.com/staff-avatar.jpg"


async def test_create_session_from_oauth_rejects_access_token(app: Any, mock_db: MockSession) -> None:
    # An access token (token_use=access) must not be accepted as an id token.
    settings = app.state.settings
    access_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_ent",
            "aud": "client_mc",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "token_use": "access",
        },
        settings,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/auth/oauth/session", json={"id_token": access_token})
        assert resp.status_code == 401


# ── Phase 1: JWT Bearer Verification ──────────────────────────────────────────────


async def test_bearer_valid_jwt_grants_session_access(app: Any, mock_db: MockSession) -> None:
    settings = app.state.settings
    access_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_123",
            "aud": "client_123",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "scope": "openid",
            "token_use": "access",
        },
        settings,
    )
    mock_user = User(
        id="usr_123",
        workos_user_id="user_workos_123",
        email="user@example.com",
        email_verified=True,
        first_name="User",
        last_name="Test",
        middle_name=None,
        username=None,
        avatar=None,
        status="active",
        created_at=int(time.time()),
        updated_at=int(time.time()),
    )
    mock_session = Session(
        id="ses_123",
        user_id="usr_123",
        token_hash="",
        expires_at=int(time.time()) + 3600,
        created_at=int(time.time()),
        updated_at=int(time.time()),
    )
    mock_session.user = mock_user
    mock_db.query_results["sessions"] = [mock_session]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    assert resp.status_code == 200
    assert response_data(resp)["sub"] == "usr_123"


async def test_bearer_invalid_jwt_rejected(app: Any) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/userinfo",
            headers={"Authorization": "Bearer not.a.jwt"},
        )
    assert resp.status_code == 401


async def test_bearer_expired_jwt_rejected(app: Any) -> None:
    settings = app.state.settings
    expired_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_123",
            "aud": "client_123",
            "exp": int(time.time()) - 3600,
            "iat": int(time.time()) - 7200,
            "scope": "openid",
            "token_use": "access",
        },
        settings,
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get(
            "/oauth/userinfo",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
    assert resp.status_code == 401


# ── Phase 2: client_credentials Grant ─────────────────────────────────────────────


async def test_client_credentials_confidential_client(app: Any, mock_db: MockSession) -> None:
    from utils.security_helpers import hash_client_secret

    secret = "s3cr3t"
    mock_app = App(
        id="app_svc",
        client_id="svc_client",
        client_type="confidential",
        client_secret_hash=hash_client_secret(secret),
        scopes_allowed=["profile", "email"],
        allowed_redirect_uris=[],
        allowed_logout_uris=[],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": "svc_client",
                "client_secret": secret,
                "scope": "profile",
            },
        )
    assert resp.status_code == 200
    data = response_data(resp)
    assert data["access_token"]
    assert data["token_type"] == "Bearer"
    assert "id_token" not in data or data["id_token"] is None
    assert data["refresh_token"] is None


async def test_client_credentials_public_client_rejected(app: Any, mock_db: MockSession) -> None:
    mock_app = App(
        id="app_pub",
        client_id="pub_client",
        client_type="public",
        client_secret_hash=None,
        scopes_allowed=["openid"],
        allowed_redirect_uris=[],
        allowed_logout_uris=[],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": "pub_client",
            },
        )
    assert resp.status_code == 400
    assert response_error(resp)["code"] == "unauthorized_client"


async def test_client_credentials_invalid_scope_rejected(app: Any, mock_db: MockSession) -> None:
    from utils.security_helpers import hash_client_secret

    secret = "s3cr3t"
    mock_app = App(
        id="app_svc2",
        client_id="svc_client2",
        client_type="confidential",
        client_secret_hash=hash_client_secret(secret),
        scopes_allowed=["profile"],
        allowed_redirect_uris=[],
        allowed_logout_uris=[],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post(
            "/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": "svc_client2",
                "client_secret": secret,
                "scope": "admin",  # not in scopes_allowed
            },
        )
    assert resp.status_code == 400
    assert response_error(resp)["code"] == "invalid_scope"


# ── Phase 3: end_session_endpoint ─────────────────────────────────────────────────


async def test_end_session_redirects_to_issuer_without_hint(app: Any) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver", follow_redirects=False) as client:
        resp = await client.get("/oauth/end-session")
    assert resp.status_code == 302
    assert resp.headers["location"] == "https://auth.example.com"


async def test_end_session_valid_redirect_uri(app: Any, mock_db: MockSession) -> None:
    settings = app.state.settings
    id_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_123",
            "aud": "client_123",
            "sid": "ses_abc",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "token_use": "id",
        },
        settings,
    )
    mock_app = App(
        id="app_123",
        client_id="client_123",
        client_type="public",
        client_secret_hash=None,
        scopes_allowed=["openid"],
        allowed_redirect_uris=["https://client.example.com/callback"],
        allowed_logout_uris=["https://client.example.com/logged-out"],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    import urllib.parse

    async with AsyncClient(transport=transport, base_url="http://testserver", follow_redirects=False) as client:
        resp = await client.get(
            f"/oauth/end-session?id_token_hint={urllib.parse.quote(id_token)}"
            "&post_logout_redirect_uri=https%3A%2F%2Fclient.example.com%2Flogged-out"
            "&state=xyz"
        )
    assert resp.status_code == 302
    location = resp.headers["location"]
    assert location.startswith("https://client.example.com/logged-out")
    assert "state=xyz" in location


async def test_end_session_invalid_redirect_uri_rejected(app: Any, mock_db: MockSession) -> None:
    settings = app.state.settings
    id_token = sign_provider_jwt(
        {
            "iss": "https://auth.example.com",
            "sub": "usr_123",
            "aud": "client_123",
            "sid": "ses_abc",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "token_use": "id",
        },
        settings,
    )
    mock_app = App(
        id="app_123",
        client_id="client_123",
        client_type="public",
        client_secret_hash=None,
        scopes_allowed=["openid"],
        allowed_redirect_uris=["https://client.example.com/callback"],
        allowed_logout_uris=["https://client.example.com/logged-out"],
    )
    mock_db.query_results["apps"] = [mock_app]

    transport = ASGITransport(app=app)
    import urllib.parse

    async with AsyncClient(transport=transport, base_url="http://testserver", follow_redirects=False) as client:
        resp = await client.get(
            f"/oauth/end-session?id_token_hint={urllib.parse.quote(id_token)}"
            "&post_logout_redirect_uri=https%3A%2F%2Fattacker.example.com%2Fsteal"
        )
    assert resp.status_code == 302
    # Must fall back to issuer, not the attacker URI
    assert resp.headers["location"] == "https://auth.example.com"


async def test_discovery_includes_end_session_and_client_credentials(app: Any) -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/oauth/.well-known/openid-configuration")
    assert resp.status_code == 200
    data = resp.json()
    assert "end_session_endpoint" in data
    assert data["end_session_endpoint"] == "https://auth.example.com/oauth/end-session"
    assert "client_credentials" in data["grant_types_supported"]
    assert data["backchannel_logout_supported"] is False
    assert data["frontchannel_logout_supported"] is False
