"""File retrieve / read-url / delete edge cases."""

from __future__ import annotations

import asyncio
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import create_app
from providers.base import CreateReadUrlInput
from tests.conftest import (
    NOW,
    InMemoryObjectStorageProvider,
    StorageHarness,
    make_engine,
    make_settings,
)
from tests.test_storage_api import (
    AUTH_HEADERS,
    OBJECT_KEY,
    database_value,
    make_uploaded_object,
    open_upload,
)


async def _initialize_database(database_url: str) -> None:
    from db.models import Base

    engine = make_engine(database_url)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()


def complete_logo(harness: StorageHarness) -> None:
    assert open_upload(harness).status_code == 201
    make_uploaded_object(harness)
    completed = harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    assert completed.status_code == 200


def test_retrieve_missing_file_returns_not_found(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/v1/files/file_missing", headers=AUTH_HEADERS)

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "storage/file-not-found",
            "message": "The file was not found.",
        }
    }


def test_read_url_for_pending_file_returns_not_found(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/file-not-found"
    assert storage_harness.provider.create_read_calls == []


def test_read_url_for_failed_file_returns_not_found(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    assert response.status_code == 409

    read = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )

    assert read.status_code == 404


def test_read_url_expires_in_zero_is_invalid(storage_harness: StorageHarness) -> None:
    complete_logo(storage_harness)

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 0},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"


def test_read_url_expires_in_over_hour_is_invalid(storage_harness: StorageHarness) -> None:
    complete_logo(storage_harness)

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 3601},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"


def test_read_url_default_expires_in_is_used_for_private_files(
    storage_harness: StorageHarness,
) -> None:
    complete_logo(storage_harness)
    with sqlite3.connect(storage_harness.database_path) as connection:
        connection.execute(
            "UPDATE storage_files SET audience = ?, bucket = ? WHERE id = ?",
            ("organization", "files-test", "file_01TESTFILE"),
        )
        connection.commit()

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 200
    assert response.json()["expires_at"] == NOW + 300
    assert storage_harness.provider.create_read_calls == [
        CreateReadUrlInput(bucket="files-test", object_key=OBJECT_KEY, expires_in=300)
    ]


def test_app_audience_uses_signed_read_url(storage_harness: StorageHarness) -> None:
    complete_logo(storage_harness)
    with sqlite3.connect(storage_harness.database_path) as connection:
        connection.execute(
            "UPDATE storage_files SET audience = ?, bucket = ? WHERE id = ?",
            ("app", "files-test", "file_01TESTFILE"),
        )
        connection.commit()

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 120},
    )

    assert response.status_code == 200
    assert response.json()["url"] == "https://read.example.test/signed"
    assert response.json()["expires_at"] == NOW + 120
    assert storage_harness.provider.create_read_calls == [
        CreateReadUrlInput(bucket="files-test", object_key=OBJECT_KEY, expires_in=120)
    ]


def test_delete_missing_file_returns_not_found(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.delete("/v1/files/file_missing", headers=AUTH_HEADERS)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/file-not-found"


def test_soft_delete_does_not_delete_r2_object(storage_harness: StorageHarness) -> None:
    complete_logo(storage_harness)

    deleted = storage_harness.client.delete("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)

    assert deleted.status_code == 200
    assert storage_harness.provider.delete_calls == []
    assert database_value(
        storage_harness.database_path,
        "SELECT deleted_at FROM storage_files WHERE id = ?",
        ("file_01TESTFILE",),
    ) == NOW


def test_hard_delete_cascades_upload_sessions(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Hard delete removes the file and cascades child upload sessions.

    Migration declares ON DELETE CASCADE; the test harness enables SQLite FK
    enforcement so cascade matches Postgres production behavior.
    """
    database_path = tmp_path / "hard.db"
    database_url = f"sqlite+aiosqlite:///{database_path}"
    monkeypatch.setattr("db.session.make_engine", make_engine)
    asyncio.run(_initialize_database(database_url))
    settings = make_settings(database_url).model_copy(update={"deletion_mode": "hard"})
    provider = InMemoryObjectStorageProvider()
    identifiers = {
        "file": "file_01TESTFILE",
        "upload_session": "upl_01TESTSESSION",
        "version": "ver_01TESTVERSION",
    }
    monkeypatch.setattr("domains.uploads.router.generate_id", lambda entity_type: identifiers[entity_type])
    monkeypatch.setattr("domains.uploads.router.time.time", lambda: NOW)
    monkeypatch.setattr("domains.files.router.time.time", lambda: NOW)
    app = create_app(settings, provider)

    with TestClient(app) as client:
        harness = StorageHarness(
            client=client,
            provider=provider,
            database_path=database_path,
            settings=settings,
        )
        complete_logo(harness)

        with sqlite3.connect(database_path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            sessions_before = connection.execute(
                "SELECT COUNT(*) FROM storage_upload_sessions WHERE file_id = ?",
                ("file_01TESTFILE",),
            ).fetchone()[0]
        assert sessions_before == 1

        deleted = client.delete("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)
        assert deleted.status_code == 200
        assert deleted.json() == {"object": "file", "id": "file_01TESTFILE", "deleted": True}

        with sqlite3.connect(database_path) as connection:
            connection.execute("PRAGMA foreign_keys=ON")
            file_count = connection.execute(
                "SELECT COUNT(*) FROM storage_files WHERE id = ?",
                ("file_01TESTFILE",),
            ).fetchone()[0]
            session_count = connection.execute(
                "SELECT COUNT(*) FROM storage_upload_sessions WHERE file_id = ?",
                ("file_01TESTFILE",),
            ).fetchone()[0]
        assert file_count == 0
        assert session_count == 0

        retrieved = client.get("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)
        assert retrieved.status_code == 404


def test_deleted_file_cannot_create_read_url(storage_harness: StorageHarness) -> None:
    complete_logo(storage_harness)
    assert storage_harness.client.delete("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS).status_code == 200

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 404
    assert storage_harness.provider.create_read_calls == []


def test_files_routes_require_auth(storage_harness: StorageHarness) -> None:
    for method, path in (
        ("get", "/v1/files/file_01TESTFILE"),
        ("delete", "/v1/files/file_01TESTFILE"),
        ("post", "/v1/files/file_01TESTFILE/read-url"),
    ):
        response = storage_harness.client.request(method, path, json={} if method == "post" else None)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "storage/unauthorized"


def test_error_envelope_never_includes_http_status_field(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/v1/files/file_missing", headers=AUTH_HEADERS)

    assert response.status_code == 404
    body = response.json()
    assert set(body.keys()) == {"error"}
    assert set(body["error"].keys()) == {"code", "message"}
    assert "httpStatus" not in body["error"]
    assert "http_status" not in body["error"]
