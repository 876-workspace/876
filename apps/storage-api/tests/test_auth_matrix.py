"""Auth matrix across every authenticated route."""

from __future__ import annotations

import pytest

from tests.conftest import StorageHarness
from tests.test_storage_api import AUTH_HEADERS, VALID_UPLOAD, make_uploaded_object, open_upload

AUTHENTICATED_CASES = [
    ("POST", "/v1/uploads", VALID_UPLOAD),
    ("POST", "/v1/uploads/upl_01TESTSESSION/complete", {}),
    ("GET", "/v1/files/file_01TESTFILE", None),
    ("POST", "/v1/files/file_01TESTFILE/read-url", {}),
    ("DELETE", "/v1/files/file_01TESTFILE", None),
]


@pytest.mark.parametrize(("method", "path", "json_body"), AUTHENTICATED_CASES)
def test_missing_key_is_unauthorized(
    storage_harness: StorageHarness,
    method: str,
    path: str,
    json_body: dict[str, object] | None,
) -> None:
    response = storage_harness.client.request(method, path, json=json_body)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "storage/unauthorized"


@pytest.mark.parametrize(("method", "path", "json_body"), AUTHENTICATED_CASES)
def test_wrong_key_is_unauthorized(
    storage_harness: StorageHarness,
    method: str,
    path: str,
    json_body: dict[str, object] | None,
) -> None:
    response = storage_harness.client.request(
        method,
        path,
        headers={"x-internal-key": "wrong"},
        json=json_body,
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "storage/unauthorized"


def test_valid_key_reaches_handler_not_auth_layer(storage_harness: StorageHarness) -> None:
    # Missing file with valid key should be 404, not 401.
    response = storage_harness.client.get("/v1/files/file_missing", headers=AUTH_HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/file-not-found"


def test_public_health_routes_ignore_wrong_key(storage_harness: StorageHarness) -> None:
    health = storage_harness.client.get("/health", headers={"x-internal-key": "wrong"})
    ready = storage_harness.client.get("/ready", headers={"x-internal-key": "wrong"})
    assert health.status_code == 200
    assert ready.status_code == 200


def test_end_to_end_logo_flow_with_valid_key(storage_harness: StorageHarness) -> None:
    opened = open_upload(storage_harness)
    assert opened.status_code == 201
    make_uploaded_object(storage_harness)
    completed = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    assert completed.status_code == 200
    retrieved = storage_harness.client.get("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)
    assert retrieved.status_code == 200
    read = storage_harness.client.post(
        "/v1/files/file_01TESTFILE/read-url",
        headers=AUTH_HEADERS,
        json={},
    )
    assert read.status_code == 200
    deleted = storage_harness.client.delete("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)
    assert deleted.status_code == 200
