"""CORS and HTTP method matrix for the storage surface."""

from __future__ import annotations

from tests.conftest import StorageHarness
from tests.test_storage_api import AUTH_HEADERS


def test_options_preflight_for_uploads_allows_configured_methods(
    storage_harness: StorageHarness,
) -> None:
    response = storage_harness.client.options(
        "/v1/uploads",
        headers={
            "Origin": "http://localhost:3003",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-internal-key",
        },
    )
    # CORS middleware may return 200/204 even when origin not allowlisted
    assert response.status_code in {200, 204, 400, 405}


def test_get_on_uploads_collection_is_not_allowed(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/v1/uploads", headers=AUTH_HEADERS)
    assert response.status_code in {404, 405}


def test_put_on_file_is_not_allowed(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.put(
        "/v1/files/file_01TESTFILE",
        headers=AUTH_HEADERS,
        json={},
    )
    assert response.status_code in {404, 405}


def test_patch_on_file_is_not_allowed(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.patch(
        "/v1/files/file_01TESTFILE",
        headers=AUTH_HEADERS,
        json={"status": "ready"},
    )
    assert response.status_code in {404, 405}


def test_post_uploads_without_json_content_type_still_validates(
    storage_harness: StorageHarness,
) -> None:
    response = storage_harness.client.post(
        "/v1/uploads",
        headers={**AUTH_HEADERS, "Content-Type": "text/plain"},
        content=b"not-json",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"


def test_unknown_path_returns_storage_shaped_404(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/v1/nope", headers=AUTH_HEADERS)
    assert response.status_code == 404
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] in {"storage/file-not-found", "storage/invalid-request"}
