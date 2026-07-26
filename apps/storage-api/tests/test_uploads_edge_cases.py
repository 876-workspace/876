"""Upload open/complete edge cases and classification invariants."""

from __future__ import annotations

import sqlite3
from typing import Any

import pytest

from providers.base import DeleteObjectInput, HeadObjectInput
from tests.conftest import NOW, StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    OBJECT_KEY,
    VALID_UPLOAD,
    database_value,
    make_uploaded_object,
    open_upload,
)


def test_invalid_opaque_ids_are_rejected_without_provider_call(
    storage_harness: StorageHarness,
) -> None:
    for field, value in (
        ("owner_id", "org/123"),
        ("owner_id", " org_123"),
        ("owner_id", ""),
        ("actor_user_id", "user space"),
        ("source_app_id", "app@bad"),
        ("owner_id", "../etc/passwd"),
    ):
        response = open_upload(storage_harness, {field: value})
        assert response.status_code == 400, field
        body = response.json()
        assert body["error"]["code"] in {
            "storage/invalid-request",
        }
        assert storage_harness.provider.create_upload_calls == []


def test_exact_max_size_is_allowed(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness, {"size_bytes": 5 * 1024 * 1024})

    assert response.status_code == 201
    assert response.json()["headers"]["Content-Length"] == str(5 * 1024 * 1024)


@pytest.mark.parametrize("content_type", ["image/jpeg", "image/webp", "image/png"])
def test_allowed_logo_content_types_are_accepted(
    storage_harness: StorageHarness,
    content_type: str,
) -> None:
    response = open_upload(storage_harness, {"content_type": content_type})

    assert response.status_code == 201
    assert response.json()["headers"]["Content-Type"] == content_type


def test_extra_request_fields_are_rejected(storage_harness: StorageHarness) -> None:
    body = {**VALID_UPLOAD, "category": "library", "audience": "public", "bucket": "evil"}
    response = storage_harness.client.post("/v1/uploads", headers=AUTH_HEADERS, json=body)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"
    assert storage_harness.provider.create_upload_calls == []


def test_client_cannot_choose_category_audience_or_object_key(
    storage_harness: StorageHarness,
) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        row = connection.execute(
            "SELECT category, audience, object_key, purpose, bucket FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert row == (
        "attachment",
        "public",
        OBJECT_KEY,
        "organization_logo",
        "assets-test",
    )


def test_filename_is_metadata_only_and_not_in_object_key(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness, {"file_name": "../../../evil.png"})
    assert response.status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        original_name, object_key = connection.execute(
            "SELECT original_name, object_key FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert original_name == "../../../evil.png"
    assert "evil" not in object_key
    assert object_key == OBJECT_KEY


def test_platform_owner_type_is_invalid_for_org_logo(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness, {"owner_type": "platform"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-owner"


def test_completion_rejects_content_type_mismatch(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness, content_type="image/jpeg")

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "storage/upload-verification-failed"
    assert storage_harness.provider.delete_calls == [DeleteObjectInput(bucket="assets-test", object_key=OBJECT_KEY)]
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "failed"
    )


def test_completion_rejects_missing_content_length(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    # Simulate provider returning exists with no length.
    async def head_without_length(params: HeadObjectInput) -> Any:
        from providers.base import HeadObjectOutput

        storage_harness.provider.head_calls.append(params)
        return HeadObjectOutput(exists=True, content_type="image/png", content_length=None)

    storage_harness.provider.head_object = head_without_length  # type: ignore[method-assign]

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "storage/upload-verification-failed"


def test_completion_unknown_session_returns_not_found(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.post(
        "/v1/uploads/upl_missing/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "storage/upload-not-found",
            "message": "The upload session was not found.",
        }
    }


def test_complete_rejects_extra_body_fields(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={"verified": True},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"


def test_complete_sets_completed_at_and_ready_status(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 200
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT completed_at FROM upload_sessions WHERE id = ?",
            ("upl_01TESTSESSION",),
        )
        == NOW
    )
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "ready"
    )


def test_missing_required_upload_fields_return_invalid_request(
    storage_harness: StorageHarness,
) -> None:
    for field in (
        "route_key",
        "owner_type",
        "owner_id",
        "actor_user_id",
        "source_app_id",
        "file_name",
        "content_type",
        "size_bytes",
    ):
        body = {k: v for k, v in VALID_UPLOAD.items() if k != field}
        response = storage_harness.client.post("/v1/uploads", headers=AUTH_HEADERS, json=body)
        assert response.status_code == 400, field
        assert response.json()["error"]["code"] == "storage/invalid-request"


def test_negative_size_is_rejected(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness, {"size_bytes": -1})

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "storage/file-too-large"


def test_pending_public_file_retrieve_has_null_url(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    response = storage_harness.client.get("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["audience"] == "public"
    assert body["url"] is None
    assert body["category"] == "attachment"
    assert body["purpose"] == "organization_logo"


def test_ready_public_file_retrieve_includes_stable_cdn_url(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)
    assert (
        storage_harness.client.post(
            "/v1/uploads/upl_01TESTSESSION/complete",
            headers=AUTH_HEADERS,
            json={},
        ).status_code
        == 200
    )

    response = storage_harness.client.get("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["url"] == f"https://assets.example.test/{OBJECT_KEY}"
    assert body["object"] == "file"
