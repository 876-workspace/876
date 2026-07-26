"""Idempotent complete — head only once, stable response."""

from __future__ import annotations

from tests.conftest import StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    make_uploaded_object,
    open_upload,
)


def test_triple_complete_is_idempotent(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)

    responses = [
        storage_harness.client.post(
            "/v1/uploads/upl_01TESTSESSION/complete",
            headers=AUTH_HEADERS,
            json={},
        )
        for _ in range(3)
    ]

    assert all(r.status_code == 200 for r in responses)
    bodies = [r.json() for r in responses]
    assert bodies[0] == bodies[1] == bodies[2]
    assert bodies[0]["status"] == "ready"
    # HEAD only on first completion
    assert len(storage_harness.provider.head_calls) == 1
    assert storage_harness.provider.delete_calls == []


def test_complete_response_has_no_bucket_or_object_key(
    storage_harness: StorageHarness,
) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)
    body = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    ).json()
    assert "bucket" not in body
    assert "object_key" not in body
    assert "provider" not in body
    assert "visibility" not in body
    assert "delivery" not in body
    assert body["object"] == "file"
