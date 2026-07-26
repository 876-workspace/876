"""Provider failure paths during upload open and complete."""

from __future__ import annotations

import sqlite3

import pytest

from core.errors import AppHTTPException
from providers.base import (
    CreateUploadUrlInput,
    CreateUploadUrlOutput,
    DeleteObjectInput,
    DeleteObjectOutput,
    HeadObjectInput,
    HeadObjectOutput,
)
from tests.conftest import StorageHarness
from tests.test_storage_api import AUTH_HEADERS, make_uploaded_object, open_upload


@pytest.mark.asyncio
async def test_open_upload_surfaces_provider_error(storage_harness: StorageHarness) -> None:
    async def boom(params: CreateUploadUrlInput) -> CreateUploadUrlOutput:
        storage_harness.provider.create_upload_calls.append(params)
        raise AppHTTPException(
            code="storage/provider-error",
            message="The storage provider could not complete the request.",
            http_status_code=502,
        )

    storage_harness.provider.create_upload_url = boom  # type: ignore[method-assign]

    response = open_upload(storage_harness)

    assert response.status_code == 502
    assert response.json() == {
        "error": {
            "code": "storage/provider-error",
            "message": "The storage provider could not complete the request.",
        }
    }


def test_complete_surfaces_provider_error_on_head(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    async def boom(params: HeadObjectInput) -> HeadObjectOutput:
        storage_harness.provider.head_calls.append(params)
        raise AppHTTPException(
            code="storage/provider-error",
            message="The storage provider could not complete the request.",
            http_status_code=502,
        )

    storage_harness.provider.head_object = boom  # type: ignore[method-assign]

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "storage/provider-error"


def test_verification_failure_still_marks_failed_if_delete_also_fails(
    storage_harness: StorageHarness,
) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness, size_bytes=1)

    async def boom_delete(params: DeleteObjectInput) -> DeleteObjectOutput:
        storage_harness.provider.delete_calls.append(params)
        raise AppHTTPException(
            code="storage/provider-error",
            message="The storage provider could not complete the request.",
            http_status_code=502,
        )

    storage_harness.provider.delete_object = boom_delete  # type: ignore[method-assign]

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    # delete failure propagates after marking is attempted in finally
    assert response.status_code in {422, 502}
    with sqlite3.connect(storage_harness.database_path) as connection:
        statuses = connection.execute(
            "SELECT status FROM files WHERE id = ? UNION ALL SELECT status FROM upload_sessions WHERE id = ?",
            ("file_01TESTFILE", "upl_01TESTSESSION"),
        ).fetchall()
    # When delete raises, finally still marks failed then re-raises or returns verification error.
    # Assert we never leave the file ready after a mismatch.
    assert ("ready",) not in statuses


def test_error_body_never_includes_stack_or_provider_raw(
    storage_harness: StorageHarness,
) -> None:
    response = open_upload(storage_harness, {"route_key": "nope"})

    body = response.json()
    serialized = str(body).lower()
    assert "traceback" not in serialized
    assert "botocore" not in serialized
    assert "sqlalchemy" not in serialized
    assert set(body["error"].keys()) == {"code", "message"}
