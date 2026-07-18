"""Regression tests for OAuth bearer-token principal resolution.

`resolve_principal` must only accept an *access* token as a stand-in for a
user's first-party session. Accepting id tokens or client-credentials
("service") tokens would let any OAuth token a client holds authorize
self-scoped `/users/me/*` requests, ignoring the consented scopes.
"""

from __future__ import annotations

import time
from types import SimpleNamespace

import pytest

from core.config import get_settings
from core.errors import AppHTTPException
from core.security import resolve_principal
from domains.oauth.tokens import sign_provider_jwt


def _fake_request() -> SimpleNamespace:
    # No `settings` on app.state → resolve_principal falls back to get_settings().
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace()))


def _token(token_use: str, *, sub: str = "user_123") -> str:
    now = int(time.time())
    return sign_provider_jwt(
        {
            "iss": "https://876.test",
            "sub": sub,
            "aud": "client_abc",
            "exp": now + 3600,
            "iat": now,
            "scope": "openid",
            "token_use": token_use,
            "realm": "consumer",
        },
        get_settings(),
    )


async def test_access_token_yields_user_principal() -> None:
    principal = await resolve_principal(
        _fake_request(), internal_key=None, bearer_token=_token("access")
    )
    assert principal.user_id == "user_123"
    assert principal.internal is False


async def test_id_token_is_rejected() -> None:
    with pytest.raises(AppHTTPException) as exc:
        await resolve_principal(
            _fake_request(), internal_key=None, bearer_token=_token("id")
        )
    assert exc.value.status_code == 401


async def test_service_token_is_rejected() -> None:
    with pytest.raises(AppHTTPException) as exc:
        await resolve_principal(
            _fake_request(),
            internal_key=None,
            bearer_token=_token("service", sub="client_abc"),
        )
    assert exc.value.status_code == 401


async def test_token_without_token_use_is_rejected() -> None:
    now = int(time.time())
    legacy = sign_provider_jwt(
        {"sub": "user_123", "exp": now + 3600, "iat": now}, get_settings()
    )
    with pytest.raises(AppHTTPException):
        await resolve_principal(
            _fake_request(), internal_key=None, bearer_token=legacy
        )
