"""Integration tests for the multi-account switch / sign-out endpoints."""

import time

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import Settings, get_settings
from core.security import require_api_key
from core.session import account_entry, seal_session
from db.models import Session as SessionModel
from db.models import User as UserModel
from db.session import get_db
from main import create_app

SETTINGS = Settings(workos_redirect_uri="http://localhost:3000/callback")
SECRET = SETTINGS.resolved_session_cookie_secret
COOKIE_NAME = SETTINGS.session_cookie_name


def _user(uid: str, email: str) -> dict[str, object]:
    return {
        "id": uid,
        "email": email,
        "firstName": "Jane",
        "lastName": "Doe",
        "emailVerified": True,
        "avatar": None,
        "username": None,
    }


def _two_account_cookie(active_sid: str) -> str:
    accounts = [
        account_entry(_user("usr_1", "a@x.com"), "ses_a"),
        account_entry(_user("usr_2", "b@x.com"), "ses_b"),
    ]
    active = next(a for a in accounts if a["sid"] == active_sid)
    return seal_session(
        active,
        None,
        SECRET,
        session_id=active_sid,
        accounts=accounts,
    )


def _make_transport(row_expiry: int | None) -> ASGITransport:
    """Build the app with a fake db whose `get` returns a Session row whose
    `expires_at` is `row_expiry` (None → no row found)."""

    async def _fake_db():
        class FakeSession:
            async def flush(self):
                pass

            def add(self, obj):
                pass

            async def get(self, model, pk):
                if model is UserModel:
                    # switch_session re-checks the target user's ban status.
                    return UserModel(id=pk, banned=False)
                if row_expiry is None:
                    return None
                return SessionModel(
                    id=pk,
                    user_id="usr_1",
                    token_hash="hash",
                    expires_at=row_expiry,
                    created_at=0,
                    updated_at=0,
                )

            async def execute(self, stmt):
                class ExecResult:
                    rowcount = 1

                return ExecResult()

        yield FakeSession()

    app = create_app(SETTINGS)
    app.dependency_overrides[get_db] = _fake_db
    app.dependency_overrides[get_settings] = lambda: SETTINGS
    app.dependency_overrides[require_api_key] = lambda: True
    return ASGITransport(app=app)


_FUTURE = int(time.time()) + 10_000
_PAST = int(time.time()) - 10


@pytest.mark.asyncio
async def test_switch_to_account_in_set() -> None:
    transport = _make_transport(_FUTURE)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/auth/sessions/switch",
            json={"sid": "ses_b"},
            cookies={COOKIE_NAME: _two_account_cookie("ses_a")},
        )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["active_sid"] == "ses_b"
    assert body["user"]["userId"] == "usr_2"
    assert f"{COOKIE_NAME}=" in resp.headers["set-cookie"]


@pytest.mark.asyncio
async def test_switch_foreign_sid_rejected() -> None:
    transport = _make_transport(_FUTURE)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/auth/sessions/switch",
            json={"sid": "ses_not_mine"},
            cookies={COOKIE_NAME: _two_account_cookie("ses_a")},
        )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "auth/session-not-found"


@pytest.mark.asyncio
async def test_switch_without_cookie_unauthorized() -> None:
    transport = _make_transport(_FUTURE)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post("/auth/sessions/switch", json={"sid": "ses_b"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "auth/no-session"


@pytest.mark.asyncio
async def test_switch_expired_row_rejected() -> None:
    transport = _make_transport(_PAST)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/auth/sessions/switch",
            json={"sid": "ses_b"},
            cookies={COOKIE_NAME: _two_account_cookie("ses_a")},
        )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "auth/session-expired"


@pytest.mark.asyncio
async def test_signout_one_keeps_others_active() -> None:
    transport = _make_transport(_FUTURE)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/auth/sessions/ses_a/signout",
            cookies={COOKIE_NAME: _two_account_cookie("ses_b")},
        )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["error"] is None
    body = payload["data"]
    assert body["signed_out"] == "ses_a"
    assert body["remaining"] == 1


@pytest.mark.asyncio
async def test_signout_foreign_sid_rejected() -> None:
    transport = _make_transport(_FUTURE)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/auth/sessions/ses_not_mine/signout",
            cookies={COOKIE_NAME: _two_account_cookie("ses_a")},
        )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "auth/session-not-found"
