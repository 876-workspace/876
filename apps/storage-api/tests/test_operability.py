from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

import pytest

from db.repositories.audit_events import AuditEventRepository
from providers.base import CreateUploadUrlInput, CreateUploadUrlOutput, DeleteObjectInput
from tests.conftest import NOW, StorageHarness
from tests.test_storage_api import AUTH_HEADERS, OBJECT_KEY, VALID_UPLOAD, make_uploaded_object


def _headers(request_id: str) -> dict[str, str]:
    return {**AUTH_HEADERS, "x-request-id": request_id}


def _audit_rows(database_path: Path) -> list[tuple[Any, ...]]:
    with sqlite3.connect(database_path) as connection:
        return connection.execute(
            """
            SELECT actor_id, source_app_id, owner_type, owner_id, file_id,
                   upload_session_id, request_id, action, outcome, error_code,
                   created_at
              FROM storage_audit_events
             ORDER BY rowid
            """
        ).fetchall()


def _open(storage_harness: StorageHarness, request_id: str = "req_create") -> Any:
    return storage_harness.client.post(
        "/v1/uploads",
        headers=_headers(request_id),
        json=VALID_UPLOAD,
    )


def test_upload_create_writes_exact_audit_row(storage_harness: StorageHarness) -> None:
    response = _open(storage_harness)

    assert response.status_code == 201
    assert _audit_rows(storage_harness.database_path) == [
        (
            "user_456",
            "876-couriers",
            "organization",
            "org_123",
            "file_01TESTFILE",
            "upl_01TESTSESSION",
            "req_create",
            "upload_session.created",
            "succeeded",
            None,
            NOW,
        )
    ]


def test_ready_transition_writes_audit_and_upload_metrics(
    storage_harness: StorageHarness,
    capsys: pytest.CaptureFixture[str],
) -> None:
    capsys.readouterr()
    assert _open(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=_headers("req_ready"),
        json={},
    )
    output = capsys.readouterr().out

    assert response.status_code == 200
    assert _audit_rows(storage_harness.database_path)[-1] == (
        "user_456",
        "876-couriers",
        "organization",
        "org_123",
        "file_01TESTFILE",
        "upl_01TESTSESSION",
        "req_ready",
        "file.ready",
        "succeeded",
        None,
        NOW,
    )
    for event in (
        "storage.upload_created",
        "storage.completion_verified",
        "storage.bytes_uploaded",
    ):
        assert output.count(event) == 1
    assert "metric_name=uploads_created" in output
    assert "metric_name=completions_verified" in output
    assert "metric_name=bytes_uploaded" in output
    assert "metric_value=84213" in output
    for forbidden in (
        "https://upload.example.test/signed",
        "assets-test",
        OBJECT_KEY,
        str(VALID_UPLOAD["file_name"]),
    ):
        assert forbidden not in output


def test_failed_verification_writes_audit_and_rejection_metric(
    storage_harness: StorageHarness,
    capsys: pytest.CaptureFixture[str],
) -> None:
    capsys.readouterr()
    assert _open(storage_harness).status_code == 201

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=_headers("req_failed"),
        json={},
    )
    output = capsys.readouterr().out

    assert response.status_code == 409
    assert _audit_rows(storage_harness.database_path)[-1] == (
        "user_456",
        "876-couriers",
        "organization",
        "org_123",
        "file_01TESTFILE",
        "upl_01TESTSESSION",
        "req_failed",
        "file.verification_failed",
        "failed",
        "storage/upload-incomplete",
        NOW,
    )
    assert output.count("storage.completion_rejected") == 1
    assert "metric_name=completions_rejected" in output
    assert "rejection_reason=object_missing" in output


def test_soft_delete_writes_exact_audit_row(storage_harness: StorageHarness) -> None:
    assert _open(storage_harness).status_code == 201

    response = storage_harness.client.delete(
        "/v1/files/file_01TESTFILE",
        headers=_headers("req_delete"),
    )

    assert response.status_code == 200
    assert _audit_rows(storage_harness.database_path)[-1] == (
        "user_456",
        "876-couriers",
        "organization",
        "org_123",
        "file_01TESTFILE",
        "upl_01TESTSESSION",
        "req_delete",
        "file.soft_deleted",
        "succeeded",
        None,
        NOW,
    )


def test_purge_writes_audit_and_two_consecutive_sweeps_are_idempotent(
    storage_harness: StorageHarness,
    capsys: pytest.CaptureFixture[str],
) -> None:
    capsys.readouterr()
    assert _open(storage_harness).status_code == 201
    assert (
        storage_harness.client.delete(
            "/v1/files/file_01TESTFILE",
            headers=_headers("req_delete"),
        ).status_code
        == 200
    )

    first = storage_harness.client.post(
        "/internal/storage-sweep",
        headers={
            "x-scheduler-key": "scheduler-test-key",
            "x-request-id": "req_sweep_first",
        },
    )
    output = capsys.readouterr().out
    second = storage_harness.client.post(
        "/internal/storage-sweep",
        headers={
            "x-scheduler-key": "scheduler-test-key",
            "x-request-id": "req_sweep_second",
        },
    )

    assert first.status_code == 200
    assert first.json() == {
        "object": "storage_sweep",
        "reclaimed": 1,
        "soft_deleted": 1,
        "abandoned": 0,
    }
    assert second.status_code == 200
    assert second.json() == {
        "object": "storage_sweep",
        "reclaimed": 0,
        "soft_deleted": 0,
        "abandoned": 0,
    }
    assert storage_harness.provider.delete_calls == [DeleteObjectInput(bucket="assets-test", object_key=OBJECT_KEY)]
    assert output.count("storage.object_reclaimed") == 1
    assert "metric_name=objects_reclaimed" in output
    assert _audit_rows(storage_harness.database_path)[-1] == (
        "user_456",
        "876-couriers",
        "organization",
        "org_123",
        "file_01TESTFILE",
        "upl_01TESTSESSION",
        "req_sweep_first",
        "file.purged",
        "succeeded",
        None,
        NOW,
    )


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"x-scheduler-key": "wrong-key"},
        {"x-internal-key": "storage-test-key"},
    ],
)
def test_sweep_rejects_non_scheduler_credentials_without_calling_provider(
    storage_harness: StorageHarness,
    headers: dict[str, str],
) -> None:
    response = storage_harness.client.post("/internal/storage-sweep", headers=headers)

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "storage/unauthorized",
            "message": "The storage scheduler credential is invalid.",
        }
    }
    assert storage_harness.provider.delete_calls == []


def test_scheduler_credential_cannot_open_upload(
    storage_harness: StorageHarness,
) -> None:
    response = storage_harness.client.post(
        "/v1/uploads",
        headers={"x-scheduler-key": "scheduler-test-key"},
        json=VALID_UPLOAD,
    )

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "storage/unauthorized",
            "message": "The storage service credential is invalid.",
        }
    }
    assert storage_harness.provider.create_upload_calls == []


def test_failing_audit_write_does_not_fail_upload_request(
    storage_harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fail_audit_write(self: AuditEventRepository, **_kwargs: Any) -> Any:
        raise RuntimeError("audit database unavailable")

    monkeypatch.setattr(AuditEventRepository, "create", fail_audit_write)

    response = _open(storage_harness)

    assert response.status_code == 201
    assert response.json()["id"] == "upl_01TESTSESSION"
    assert storage_harness.provider.create_upload_calls == [
        CreateUploadUrlInput(
            bucket="assets-test",
            object_key=OBJECT_KEY,
            content_type="image/png",
            content_length=84_213,
            expires_in=600,
        )
    ]
    assert _audit_rows(storage_harness.database_path) == []


def test_provider_failure_logs_context_without_storage_secrets(
    storage_harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    signed_url = "https://upload.secret.test/signed?credential=credential-secret"
    credential = "credential-secret"
    bucket = "assets-test"
    object_key = OBJECT_KEY
    original_name = str(VALID_UPLOAD["file_name"])

    async def fail_provider(_params: CreateUploadUrlInput) -> CreateUploadUrlOutput:
        raise RuntimeError(f"{signed_url} {credential} {bucket} {object_key} {original_name}")

    monkeypatch.setattr(storage_harness.provider, "create_upload_url", fail_provider)
    capsys.readouterr()

    response = storage_harness.client.post(
        "/v1/uploads",
        headers=_headers("req_secret_test"),
        json=VALID_UPLOAD,
    )
    output = capsys.readouterr().out

    assert response.status_code == 502
    assert response.json() == {
        "error": {
            "code": "storage/provider-error",
            "message": "The storage provider could not complete the request.",
        }
    }
    for forbidden in (signed_url, credential, bucket, object_key, original_name):
        assert forbidden not in output
    for required in (
        "storage.provider_error",
        "request_id=req_secret_test",
        "source_app_id=876-couriers",
        "actor_id=user_456",
        "owner_id=org_123",
        "file_id=file_01TESTFILE",
        "upload_session_id=upl_01TESTSESSION",
        "route_key=organization.primaryLogo",
        "error_code=storage/provider-error",
        "provider_operation=create_upload_url",
    ):
        assert required in output


def test_signed_urls_are_redacted_under_any_key(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """The field denylist only covers keys we anticipated.

    A signed URL logged as `location`, `href`, or nested inside a container is
    still a live credential, so redaction must also match on the SigV4 markers
    in the value itself.
    """
    from core.logging import configure_logging, get_logger

    configure_logging("test", "info")
    capsys.readouterr()

    get_logger("test.redaction").info(
        "storage.probe",
        location="https://acct.r2.cloudflarestorage.com/o?X-Amz-Signature=DEADBEEF",
        href="https://acct.r2.cloudflarestorage.com/o?x-amz-credential=AKIA%2Fauto",
        nested={"deep": ["https://acct.r2.cloudflarestorage.com/o?X-Amz-Signature=CAFE"]},
        file_id="file_123",
        benign="https://assets.example.test/logo.png",
    )
    output = capsys.readouterr().out

    for signature in ("DEADBEEF", "CAFE", "AKIA"):
        assert signature not in output
    assert "X-Amz-Signature" not in output
    # Non-secret context must survive, or the logs stop being useful.
    assert "file_123" in output
    assert "https://assets.example.test/logo.png" in output
