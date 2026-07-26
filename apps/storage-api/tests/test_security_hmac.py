"""Internal key comparison — constant-time path and auth matrix."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from core.security import _secret_matches
from main import create_app
from tests.conftest import InMemoryObjectStorageProvider, make_engine, make_settings


def test_secret_matches_empty_pairs() -> None:
    assert _secret_matches("", "") is True
    assert _secret_matches("a", "") is False
    assert _secret_matches("", "a") is False


def test_secret_matches_long_secrets() -> None:
    secret = "s" * 10_000
    assert _secret_matches(secret, secret) is True
    assert _secret_matches(secret, secret[:-1] + "x") is False


def test_secret_matches_unicode() -> None:
    assert _secret_matches("café", "café") is True
    assert _secret_matches("café", "cafe") is False


@pytest.mark.parametrize(
    "presented",
    [
        "storage-test-key ",
        " storage-test-key",
        "STORAGE-TEST-KEY",
        "storage-test-ke",
        "storage-test-keyx",
        "Storage-test-key",
    ],
)
def test_near_miss_keys_rejected(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    presented: str,
) -> None:
    from db.models import Base

    database_url = f"sqlite+aiosqlite:///{tmp_path / 'auth.db'}"
    monkeypatch.setattr("db.session.make_engine", make_engine)

    async def init() -> None:
        engine = make_engine(database_url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(init())
    provider = InMemoryObjectStorageProvider()
    app = create_app(make_settings(database_url), provider)
    with TestClient(app) as client:
        response = client.get(
            "/v1/files/x",
            headers={"x-internal-key": presented},
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "storage/unauthorized"
    assert provider.create_upload_calls == []


def test_case_sensitive_exact_match_succeeds(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from db.models import Base

    database_url = f"sqlite+aiosqlite:///{tmp_path / 'auth2.db'}"
    monkeypatch.setattr("db.session.make_engine", make_engine)

    async def init() -> None:
        engine = make_engine(database_url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await engine.dispose()

    asyncio.run(init())
    app = create_app(make_settings(database_url), InMemoryObjectStorageProvider())
    with TestClient(app) as client:
        response = client.get(
            "/v1/files/missing",
            headers={"x-internal-key": "storage-test-key"},
        )
    # Auth passes; resource missing
    assert response.status_code == 404
