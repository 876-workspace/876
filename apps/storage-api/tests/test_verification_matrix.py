"""HEAD verification matrix — every mismatch path deletes the object."""

from __future__ import annotations

from typing import Any

import pytest

from providers.base import DeleteObjectInput, HeadObjectInput, HeadObjectOutput
from tests.conftest import StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    OBJECT_KEY,
    database_value,
    open_upload,
)


def _open(storage_harness: StorageHarness, size: int = 1000, content_type: str = "image/png") -> None:
    assert (
        open_upload(
            storage_harness,
            {"size_bytes": size, "content_type": content_type},
        ).status_code
        == 201
    )


def _complete(storage_harness: StorageHarness) -> Any:
    return storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )


@pytest.mark.parametrize(
    ("head_type", "head_size", "declared_type", "declared_size"),
    [
        ("image/png", 999, "image/png", 1000),  # size short
        ("image/png", 1001, "image/png", 1000),  # size long
        ("image/jpeg", 1000, "image/png", 1000),  # type mismatch
        ("image/webp", 1000, "image/png", 1000),
        ("application/octet-stream", 1000, "image/png", 1000),
        ("image/png", 0, "image/png", 1000),
        ("image/svg+xml", 1000, "image/png", 1000),
    ],
)
def test_head_mismatch_deletes_and_fails(
    storage_harness: StorageHarness,
    head_type: str,
    head_size: int,
    declared_type: str,
    declared_size: int,
) -> None:
    _open(storage_harness, size=declared_size, content_type=declared_type)
    storage_harness.provider.objects[("assets-test", OBJECT_KEY)] = (head_type, head_size)

    response = _complete(storage_harness)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "storage/upload-verification-failed"
    assert storage_harness.provider.delete_calls == [
        DeleteObjectInput(bucket="assets-test", object_key=OBJECT_KEY)
    ]
    assert ("assets-test", OBJECT_KEY) not in storage_harness.provider.objects
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        )
        == "failed"
    )
    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM storage_upload_sessions WHERE id = ?",
            ("upl_01TESTSESSION",),
        )
        == "failed"
    )


@pytest.mark.parametrize(
    ("head_type", "head_size"),
    [
        ("image/png", 1000),
        ("image/jpeg", 500),
        ("image/webp", 1),
    ],
)
def test_head_exact_match_marks_ready(
    storage_harness: StorageHarness,
    head_type: str,
    head_size: int,
) -> None:
    _open(storage_harness, size=head_size, content_type=head_type)
    storage_harness.provider.objects[("assets-test", OBJECT_KEY)] = (head_type, head_size)

    response = _complete(storage_harness)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["content_type"] == head_type
    assert body["size_bytes"] == head_size
    assert body["category"] == "attachment"
    assert body["audience"] == "public"
    assert body["url"] is not None
    assert storage_harness.provider.delete_calls == []


def test_head_missing_content_type_fails(storage_harness: StorageHarness) -> None:
    _open(storage_harness)

    async def head_no_type(params: HeadObjectInput) -> HeadObjectOutput:
        storage_harness.provider.head_calls.append(params)
        return HeadObjectOutput(exists=True, content_type=None, content_length=1000)

    storage_harness.provider.head_object = head_no_type  # type: ignore[method-assign]
    response = _complete(storage_harness)
    assert response.status_code == 422


def test_head_missing_length_fails(storage_harness: StorageHarness) -> None:
    _open(storage_harness)

    async def head_no_len(params: HeadObjectInput) -> HeadObjectOutput:
        storage_harness.provider.head_calls.append(params)
        return HeadObjectOutput(exists=True, content_type="image/png", content_length=None)

    storage_harness.provider.head_object = head_no_len  # type: ignore[method-assign]
    response = _complete(storage_harness)
    assert response.status_code == 422


def test_object_absent_is_409_not_422(storage_harness: StorageHarness) -> None:
    _open(storage_harness)
    response = _complete(storage_harness)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "storage/upload-incomplete"
    assert storage_harness.provider.delete_calls == []
