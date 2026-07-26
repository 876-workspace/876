from __future__ import annotations

import asyncio
import sqlite3
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from db.models import Base
from db.session import make_engine
from main import create_app
from providers.base import CreateReadUrlInput, CreateUploadUrlInput, DeleteObjectInput, HeadObjectInput
from tests.conftest import NOW, InMemoryObjectStorageProvider, StorageHarness, make_settings

AUTH_HEADERS = {"x-internal-key": "storage-test-key"}
VALID_UPLOAD: dict[str, Any] = {
    "route_key": "organization.primaryLogo",
    "owner_type": "organization",
    "owner_id": "org_123",
    "actor_user_id": "user_456",
    "source_app_id": "876-couriers",
    "file_name": "logo.png",
    "content_type": "image/png",
    "size_bytes": 84_213,
}
OBJECT_KEY = "organizations/org_123/branding/file_01TESTFILE/ver_01TESTVERSION"


def open_upload(harness: StorageHarness, overrides: dict[str, Any] | None = None) -> Any:
    body = {**VALID_UPLOAD, **(overrides or {})}
    return harness.client.post("/v1/uploads", headers=AUTH_HEADERS, json=body)


def make_uploaded_object(harness: StorageHarness, *, content_type: str = "image/png", size_bytes: int = 84_213) -> None:
    harness.provider.objects[("assets-test", OBJECT_KEY)] = (content_type, size_bytes)


def database_value(database_path: Path, query: str, params: tuple[str, ...]) -> Any:
    with sqlite3.connect(database_path) as connection:
        return connection.execute(query, params).fetchone()[0]


@pytest.mark.parametrize(
    ("overrides", "status_code", "error"),
    [
        (
            {"route_key": "unknown.route"},
            404,
            {
                "error": {
                    "code": "storage/route-not-found",
                    "message": "The upload route was not found.",
                }
            },
        ),
        (
            {"owner_type": "user"},
            400,
            {
                "error": {
                    "code": "storage/invalid-owner",
                    "message": "The owner type is not valid for this upload.",
                }
            },
        ),
        (
            {"content_type": "image/svg+xml"},
            415,
            {
                "error": {
                    "code": "storage/mime-not-allowed",
                    "message": "This file type is not allowed for this upload.",
                }
            },
        ),
        (
            {"size_bytes": 5 * 1024 * 1024 + 1},
            413,
            {
                "error": {
                    "code": "storage/file-too-large",
                    "message": "The file exceeds the size allowed for this upload.",
                }
            },
        ),
        (
            {"size_bytes": 0},
            413,
            {
                "error": {
                    "code": "storage/file-too-large",
                    "message": "The file exceeds the size allowed for this upload.",
                }
            },
        ),
    ],
)
def test_upload_validation_does_not_call_provider(
    storage_harness: StorageHarness,
    overrides: dict[str, Any],
    status_code: int,
    error: dict[str, Any],
) -> None:
    response = open_upload(storage_harness, overrides)

    assert response.status_code == status_code
    assert response.json() == error
    assert storage_harness.provider.create_upload_calls == []
    assert storage_harness.provider.head_calls == []
    assert storage_harness.provider.delete_calls == []


def test_open_upload_session_returns_exact_signed_contract(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness)

    assert response.status_code == 201
    assert response.json() == {
        "object": "upload_session",
        "id": "upl_01TESTSESSION",
        "file_id": "file_01TESTFILE",
        "upload_url": "https://upload.example.test/signed",
        "method": "PUT",
        "headers": {
            "Content-Type": "image/png",
            "Content-Length": "84213",
        },
        "expires_at": NOW + 600,
    }
    assert storage_harness.provider.create_upload_calls == [
        CreateUploadUrlInput(
            bucket="assets-test",
            object_key=OBJECT_KEY,
            content_type="image/png",
            content_length=84_213,
            expires_in=600,
        )
    ]
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "pending"
    )
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM upload_sessions WHERE id = ?",
            ("upl_01TESTSESSION",),
        )
        == "created"
    )


def test_duplicate_completion_returns_same_file_without_reverification(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201
    make_uploaded_object(storage_harness)

    first = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    second = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    expected = {
        "object": "file",
        "id": "file_01TESTFILE",
        "owner_type": "organization",
        "owner_id": "org_123",
        "source_app_id": "876-couriers",
        "purpose": "organization_logo",
        "category": "attachment",
        "audience": "public",
        "status": "ready",
        "original_name": "logo.png",
        "content_type": "image/png",
        "size_bytes": 84_213,
        "version_id": "ver_01TESTVERSION",
        "url": f"https://assets.example.test/{OBJECT_KEY}",
        "created_at": NOW,
        "updated_at": NOW,
    }
    assert first.status_code == 200
    assert first.json() == expected
    assert second.status_code == 200
    assert second.json() == expected
    assert storage_harness.provider.head_calls == [HeadObjectInput(bucket="assets-test", object_key=OBJECT_KEY)]
    assert storage_harness.provider.delete_calls == []


def test_completion_marks_missing_object_failed(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "storage/upload-incomplete",
            "message": "The uploaded object was not found.",
        }
    }
    assert storage_harness.provider.head_calls == [HeadObjectInput(bucket="assets-test", object_key=OBJECT_KEY)]
    assert storage_harness.provider.delete_calls == []
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "failed"
    )
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM upload_sessions WHERE id = ?",
            ("upl_01TESTSESSION",),
        )
        == "failed"
    )


def test_completion_deletes_size_mismatch_and_marks_file_failed(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201
    make_uploaded_object(storage_harness, size_bytes=84_212)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "storage/upload-verification-failed",
            "message": "The uploaded object did not match the signed declaration.",
        }
    }
    assert storage_harness.provider.delete_calls == [DeleteObjectInput(bucket="assets-test", object_key=OBJECT_KEY)]
    assert storage_harness.provider.objects == {}
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "failed"
    )


def test_expired_session_is_persisted_without_calling_provider(
    storage_harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201
    monkeypatch.setattr("domains.uploads.router.time.time", lambda: NOW + 601)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 410
    assert response.json() == {
        "error": {
            "code": "storage/upload-expired",
            "message": "The upload session has expired.",
        }
    }
    assert storage_harness.provider.head_calls == []
    assert storage_harness.provider.delete_calls == []
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM upload_sessions WHERE id = ?",
            ("upl_01TESTSESSION",),
        )
        == "expired"
    )


def test_public_read_url_returns_stable_url_without_calling_provider(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201
    make_uploaded_object(storage_harness)
    completed = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    assert completed.status_code == 200

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 300},
    )

    assert response.status_code == 200
    assert response.json() == {
        "object": "read_url",
        "url": f"https://assets.example.test/{OBJECT_KEY}",
        "expires_at": None,
    }
    assert storage_harness.provider.create_read_calls == []


def test_private_read_url_is_signed_with_requested_expiry(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201
    make_uploaded_object(storage_harness)
    completed = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    assert completed.status_code == 200
    with sqlite3.connect(storage_harness.database_path) as connection:
        connection.execute(
            "UPDATE files SET audience = ?, bucket = ? WHERE id = ?",
            ("private", "files-test", "file_01TESTFILE"),
        )
        connection.commit()

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 450},
    )

    assert response.status_code == 200
    assert response.json() == {
        "object": "read_url",
        "url": "https://read.example.test/signed",
        "expires_at": NOW + 450,
    }
    assert storage_harness.provider.create_read_calls == [
        CreateReadUrlInput(bucket="files-test", object_key=OBJECT_KEY, expires_in=450)
    ]


def test_soft_delete_hides_file_from_retrieve(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201

    deleted = storage_harness.client.delete("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)
    retrieved = storage_harness.client.get("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)

    assert deleted.status_code == 200
    assert deleted.json() == {
        "object": "file",
        "id": "file_01TESTFILE",
        "deleted": True,
    }
    assert retrieved.status_code == 404
    assert retrieved.json() == {
        "error": {
            "code": "storage/file-not-found",
            "message": "The file was not found.",
        }
    }
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "deleted"
    )
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT deleted_at FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == NOW
    )
    assert storage_harness.provider.delete_calls == []


async def initialize_database(database_url: str) -> None:
    engine = make_engine(database_url)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()


@pytest.mark.parametrize(
    ("configured_key", "request_headers"),
    [
        ("", {"x-internal-key": "storage-test-key"}),
        ("storage-test-key", {"x-internal-key": "wrong-key"}),
        ("storage-test-key", {}),
    ],
)
def test_authenticated_routes_reject_empty_or_wrong_internal_key(
    tmp_path: Path,
    configured_key: str,
    request_headers: dict[str, str],
) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path / 'auth.db'}"
    asyncio.run(initialize_database(database_url))
    provider = InMemoryObjectStorageProvider()
    settings: Settings = make_settings(database_url, internal_key=configured_key)
    with TestClient(create_app(settings, provider)) as client:
        response = client.post("/v1/uploads", headers=request_headers, json=VALID_UPLOAD)

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "storage/unauthorized",
            "message": "The storage service credential is invalid.",
        }
    }
    assert provider.create_upload_calls == []
    assert provider.head_calls == []
    assert provider.create_read_calls == []
    assert provider.delete_calls == []
