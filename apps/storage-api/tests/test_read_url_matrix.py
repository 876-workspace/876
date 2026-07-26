"""Read URL matrix across audiences and statuses."""

from __future__ import annotations

import sqlite3

import pytest

from tests.conftest import NOW, StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    OBJECT_KEY,
    make_uploaded_object,
    open_upload,
)


def _ready_public(harness: StorageHarness) -> None:
    assert open_upload(harness).status_code == 201
    make_uploaded_object(harness)
    assert (
        harness.client.post(
            "/v1/uploads/upl_01TESTSESSION/complete",
            headers=AUTH_HEADERS,
            json={},
        ).status_code
        == 200
    )


def _set_audience(harness: StorageHarness, audience: str, bucket: str = "files-test") -> None:
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            "UPDATE files SET audience = ?, bucket = ? WHERE id = ?",
            (audience, bucket if audience != "public" else "assets-test", "file_01TESTFILE"),
        )
        connection.commit()


def _set_status(harness: StorageHarness, status: str) -> None:
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            "UPDATE files SET status = ? WHERE id = ?",
            (status, "file_01TESTFILE"),
        )
        connection.commit()


@pytest.mark.parametrize("audience", ["private", "organization", "app"])
@pytest.mark.parametrize("expires_in", [1, 60, 300, 600, 3600])
def test_non_public_ready_signed_urls(
    storage_harness: StorageHarness,
    audience: str,
    expires_in: int,
) -> None:
    _ready_public(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": expires_in},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "read_url"
    assert body["url"] == "https://read.example.test/signed"
    assert body["expires_at"] == NOW + expires_in
    assert storage_harness.provider.create_read_calls[-1].expires_in == expires_in
    assert storage_harness.provider.create_read_calls[-1].bucket == "files-test"


def test_public_ready_stable_url_ignores_expires_in(storage_harness: StorageHarness) -> None:
    _ready_public(storage_harness)
    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 3600},
    )
    assert response.status_code == 200
    assert response.json()["expires_at"] is None
    assert response.json()["url"] == f"https://assets.example.test/{OBJECT_KEY}"
    assert storage_harness.provider.create_read_calls == []


@pytest.mark.parametrize("status", ["pending", "uploaded", "failed", "deleted"])
def test_non_ready_statuses_404(storage_harness: StorageHarness, status: str) -> None:
    assert open_upload(storage_harness).status_code == 201
    if status == "deleted":
        with sqlite3.connect(storage_harness.database_path) as connection:
            connection.execute(
                "UPDATE files SET status = ?, deleted_at = ? WHERE id = ?",
                (status, NOW, "file_01TESTFILE"),
            )
            connection.commit()
    else:
        _set_status(storage_harness, status)

    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )
    assert response.status_code == 404


@pytest.mark.parametrize("expires_in", [0, -1, 3601, 99999])
def test_expires_in_bounds(storage_harness: StorageHarness, expires_in: int) -> None:
    _ready_public(storage_harness)
    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": expires_in},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"


def test_read_url_rejects_extra_fields(storage_harness: StorageHarness) -> None:
    _ready_public(storage_harness)
    response = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={"expires_in": 60, "public": True},
    )
    assert response.status_code == 400
