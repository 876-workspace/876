"""Audience → bucket routing — public assets vs private files."""

from __future__ import annotations

import sqlite3

from providers.base import CreateUploadUrlInput
from tests.conftest import StorageHarness
from tests.test_storage_api import AUTH_HEADERS, OBJECT_KEY, open_upload


def test_public_logo_uses_assets_bucket_on_sign(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness)
    assert response.status_code == 201
    assert storage_harness.provider.create_upload_calls == [
        CreateUploadUrlInput(
            bucket="assets-test",
            object_key=OBJECT_KEY,
            content_type="image/png",
            content_length=84_213,
            expires_in=600,
        )
    ]


def test_non_public_audience_would_use_files_bucket_if_routed(
    storage_harness: StorageHarness,
) -> None:
    """Only primaryLogo exists today (public). Simulate private route via DB mutation path
    by asserting settings mapping used in create_upload for non-public audiences.

    We open a public upload then rewrite the file's audience/bucket as the complete
    path would for a private route, and verify signed read uses files-test.
    """
    assert open_upload(storage_harness).status_code == 201
    storage_harness.provider.objects[("files-test", OBJECT_KEY)] = ("image/png", 84_213)
    # Manually mark ready private in files-test bucket
    with sqlite3.connect(storage_harness.database_path) as connection:
        connection.execute(
            "UPDATE files SET status = 'ready', audience = 'private', bucket = ? WHERE id = ?",
            ("files-test", "file_01TESTFILE"),
        )
        connection.execute(
            "UPDATE upload_sessions SET status = 'completed' WHERE id = ?",
            ("upl_01TESTSESSION",),
        )
        connection.commit()

    read = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 90},
    )
    assert read.status_code == 200
    assert storage_harness.provider.create_read_calls[-1].bucket == "files-test"
    assert storage_harness.provider.create_read_calls[-1].object_key == OBJECT_KEY


def test_public_ready_file_never_calls_signed_read(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    storage_harness.provider.objects[("assets-test", OBJECT_KEY)] = ("image/png", 84_213)
    assert (
        storage_harness.client.post(
            "/v1/uploads/upl_01TESTSESSION/complete",
            headers=AUTH_HEADERS,
            json={},
        ).status_code
        == 200
    )

    read = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )
    assert read.status_code == 200
    assert read.json()["expires_at"] is None
    assert "assets.example.test" in read.json()["url"]
    assert storage_harness.provider.create_read_calls == []


def test_object_key_is_unique_in_schema(storage_harness: StorageHarness) -> None:
    from db.models import File

    assert File.__table__.c.object_key.unique is True
