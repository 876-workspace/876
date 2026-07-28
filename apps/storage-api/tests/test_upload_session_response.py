"""Upload session HTTP response contract."""

from __future__ import annotations

from tests.conftest import NOW, StorageHarness
from tests.test_storage_api import open_upload


def test_session_response_shape(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness)
    assert response.status_code == 201
    body = response.json()
    assert set(body.keys()) == {
        "object",
        "id",
        "file_id",
        "upload_url",
        "method",
        "headers",
        "expires_at",
    }
    assert body["object"] == "upload_session"
    assert body["method"] == "PUT"
    assert body["id"].startswith("upl_")
    assert body["file_id"].startswith("file_")
    assert body["expires_at"] == NOW + 600
    assert set(body["headers"].keys()) == {"Content-Type", "Content-Length"}
    assert body["headers"]["Content-Type"] == "image/png"
    assert body["headers"]["Content-Length"] == "84213"
    assert "category" not in body
    assert "audience" not in body
    assert "bucket" not in body
    assert "object_key" not in body


def test_session_headers_length_matches_declared_size(
    storage_harness: StorageHarness,
) -> None:
    response = open_upload(storage_harness, {"size_bytes": 42})
    assert response.status_code == 201
    assert response.json()["headers"]["Content-Length"] == "42"
