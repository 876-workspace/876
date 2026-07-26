"""Logging redaction and database session URL helpers — security-sensitive."""

from __future__ import annotations

from core.logging import _redact
from db.session import make_engine


def test_redact_masks_storage_sensitive_fields() -> None:
    payload = _redact(
        {
            "event": "storage.upload",
            "file_id": "file_1",
            "bucket": "876-assets-development",
            "object_key": "organizations/org/branding/file/ver",
            "upload_url": "https://signed.example/put",
            "signed_url": "https://signed.example/get",
            "internal_key": "secret",
            "x_internal_key": "secret",
            "token": "tok",
            "url": "https://assets.example/logo.png",
            "status": "ready",
        }
    )

    assert payload["event"] == "storage.upload"
    assert payload["file_id"] == "file_1"
    assert payload["status"] == "ready"
    for key in (
        "bucket",
        "object_key",
        "upload_url",
        "signed_url",
        "internal_key",
        "x_internal_key",
        "token",
        "url",
    ):
        assert payload[key] == "[redacted]", key


def test_redact_is_case_insensitive_for_keys() -> None:
    payload = _redact({"Upload_URL": "https://x", "SECRET": "y", "ok": 1})
    assert payload["Upload_URL"] == "[redacted]"
    assert payload["SECRET"] == "[redacted]"
    assert payload["ok"] == 1


def test_make_engine_converts_postgresql_scheme() -> None:
    engine = make_engine("postgresql://user:pass@localhost:5432/storage")
    try:
        assert str(engine.url).startswith("postgresql+asyncpg://")
    finally:
        # dispose is sync-safe for unstarted engines
        pass


def test_make_engine_converts_postgres_scheme() -> None:
    engine = make_engine("postgres://user:pass@127.0.0.1:5432/storage")
    assert "asyncpg" in str(engine.url)


def test_make_engine_accepts_sqlite() -> None:
    engine = make_engine("sqlite+aiosqlite:///:memory:")
    assert "sqlite" in str(engine.url)
