"""Route-level tests for the auth hardening pass: brute-force throttling and
session-payload sanitization."""

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings, get_settings
from core.security import require_api_key
from core.session import seal_session
from db.session import get_db
from main import create_app
from providers.workos.adapter import WorkOSAuthProvider


class FakeWorkOSClient:
    """Minimal WorkOS fake: rejects bad credentials/codes, accepts the rest."""

    async def authenticate_with_password(self, email, password, client_id, ip_address=None, user_agent=None):
        if password == "wrong":
            req = httpx.Request("POST", "https://api.workos.com")
            resp = httpx.Response(
                401,
                json={"code": "invalid_credentials", "message": "Invalid credentials."},
            )
            raise httpx.HTTPStatusError("Invalid credentials", request=req, response=resp)
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

    async def authenticate_with_magic_auth(self, code, email, client_id, link_authorization_code=None):
        req = httpx.Request("POST", "https://api.workos.com")
        resp = httpx.Response(401, json={"code": "invalid_credentials", "message": "Invalid code."})
        raise httpx.HTTPStatusError("Invalid code", request=req, response=resp)


async def _fake_db():
    class FakeScalarResult:
        def first(self):
            return None

        def all(self):
            return []

    class FakeSession:
        def add(self, obj):
            pass

        async def flush(self):
            pass

        async def refresh(self, obj):
            pass

        async def scalars(self, stmt):
            return FakeScalarResult()

    yield FakeSession()


@pytest.fixture
def settings() -> Settings:
    return Settings(workos_redirect_uri="http://localhost:3000/callback")


@pytest.fixture
def client(monkeypatch, settings):
    app = create_app(settings)
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[require_api_key] = lambda: True
    monkeypatch.setattr(
        "services.auth.get_auth_provider",
        lambda settings: WorkOSAuthProvider(FakeWorkOSClient()),
    )
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_login_rate_limited_per_identifier(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        for _ in range(10):
            response = await ac.post(
                "/auth/login",
                json={"identifier": "victim@example.com", "password": "wrong"},
            )
            assert response.status_code == 401

        throttled = await ac.post(
            "/auth/login",
            json={"identifier": "victim@example.com", "password": "wrong"},
        )
        # Another identifier is unaffected — the limit keys on the target.
        other = await ac.post(
            "/auth/login",
            json={"identifier": "someone-else@example.com", "password": "wrong"},
        )

    assert throttled.status_code == 429
    assert throttled.json()["error"]["code"] == "auth/rate-limited"
    assert other.status_code == 401


@pytest.mark.asyncio
async def test_magic_otp_verify_rate_limited_per_email(client) -> None:
    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        for _ in range(5):
            response = await ac.post(
                "/auth/magic-otp/verify",
                json={"email": "victim@example.com", "code": "000000"},
            )
            assert response.status_code == 401

        throttled = await ac.post(
            "/auth/magic-otp/verify",
            json={"email": "victim@example.com", "code": "000000"},
        )

    assert throttled.status_code == 429
    assert throttled.json()["error"]["code"] == "auth/rate-limited"


@pytest.mark.asyncio
async def test_get_session_never_returns_access_token(client, settings) -> None:
    sealed = seal_session(
        {"id": "usr_123", "email": "user@example.com"},
        "workos-access-token-secret",
        settings.resolved_session_cookie_secret,
        session_id="sess_1",
        accounts=[{"userId": "usr_123", "email": "user@example.com", "sid": "sess_1"}],
    )

    async with AsyncClient(transport=client, base_url="http://testserver") as ac:
        ac.cookies.set(settings.session_cookie_name, sealed)
        response = await ac.get("/auth/session")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["userId"] == "usr_123"
    assert "accessToken" not in data
    assert "workos-access-token-secret" not in response.text
