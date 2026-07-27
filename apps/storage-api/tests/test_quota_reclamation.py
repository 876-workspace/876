"""Returning quota to its subjects when files are deleted or uploads expire."""

from __future__ import annotations

import sqlite3
from typing import Any

from tests.conftest import NOW, StorageHarness
from tests.test_quota_enforcement import _set_quota, _set_usage, _usage
from tests.test_storage_api import (
    AUTH_HEADERS,
    database_value,
    make_uploaded_object,
    open_upload,
)

SCHEDULER_HEADERS = {"x-scheduler-key": "scheduler-test-key"}
SESSION_ID = "upl_01TESTSESSION"
UPLOADED_SIZE = 84_213


def _sweep(harness: StorageHarness) -> Any:
    return harness.client.post("/internal/storage-sweep", headers=SCHEDULER_HEADERS)


def _expire_session(harness: StorageHarness, *, session_id: str = SESSION_ID) -> None:
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            "UPDATE storage_upload_sessions SET expires_at = ? WHERE id = ?",
            (NOW - 10_000, session_id),
        )
        connection.commit()


def _ready_file(harness: StorageHarness) -> str:
    """Drive a real upload through to `ready` and return its file id."""
    _set_quota(harness, limit_bytes=10_000_000)
    _set_usage(harness)
    assert open_upload(harness).status_code == 201
    make_uploaded_object(harness, size_bytes=UPLOADED_SIZE)
    assert (
        harness.client.post(
            f"/v1/uploads/{SESSION_ID}/complete", headers=AUTH_HEADERS, json={}
        ).status_code
        == 200
    )
    return str(
        database_value(
            harness.database_path,
            "SELECT file_id FROM storage_upload_sessions WHERE id = ?",
            (SESSION_ID,),
        )
    )


class TestDeleteReleasesQuota:
    def test_soft_delete_returns_the_files_bytes_to_the_pool(
        self, storage_harness: StorageHarness
    ) -> None:
        file_id = _ready_file(storage_harness)
        assert _usage(storage_harness) == (UPLOADED_SIZE, 0, 1)

        assert (
            storage_harness.client.delete(
                f"/v1/files/{file_id}", headers=AUTH_HEADERS
            ).status_code
            == 200
        )

        assert _usage(storage_harness) == (0, 0, 0)

    def test_soft_delete_records_when_the_quota_was_released(
        self, storage_harness: StorageHarness
    ) -> None:
        file_id = _ready_file(storage_harness)

        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)

        assert (
            database_value(
                storage_harness.database_path,
                "SELECT quota_released_at FROM storage_files WHERE id = ?",
                (file_id,),
            )
            is not None
        )

    def test_deleting_twice_decrements_exactly_once(
        self, storage_harness: StorageHarness
    ) -> None:
        file_id = _ready_file(storage_harness)
        # Two files' worth of usage, so a second decrement is visible rather
        # than being swallowed by the clamp at zero.
        _set_usage(storage_harness, bytes_used=UPLOADED_SIZE * 2, files_count=2)

        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)
        assert _usage(storage_harness) == (UPLOADED_SIZE, 0, 1)

        # Undo the tombstone so the endpoint reaches the release path again.
        # Only the quota_released_at guard stops the second decrement.
        with sqlite3.connect(storage_harness.database_path) as connection:
            connection.execute(
                "UPDATE storage_files SET deleted_at = NULL, status = 'ready' WHERE id = ?",
                (file_id,),
            )
            connection.commit()
        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)

        assert _usage(storage_harness) == (UPLOADED_SIZE, 0, 1)

    def test_deleting_a_pending_file_does_not_touch_used_bytes(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, limit_bytes=10_000_000)
        _set_usage(storage_harness)
        assert open_upload(storage_harness).status_code == 201
        file_id = database_value(
            storage_harness.database_path,
            "SELECT file_id FROM storage_upload_sessions WHERE id = ?",
            (SESSION_ID,),
        )
        _, reserved_before, _ = _usage(storage_harness)
        assert reserved_before > 0

        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)

        used, reserved, files = _usage(storage_harness)
        assert used == 0
        assert files == 0
        # The reservation is the expiry sweep's job, not the delete's.
        assert reserved == reserved_before


class TestExpiredReservations:
    def test_sweep_releases_an_expired_reservation(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, limit_bytes=10_000_000)
        _set_usage(storage_harness)
        assert open_upload(storage_harness).status_code == 201
        _, reserved, _ = _usage(storage_harness)
        assert reserved > 0
        _expire_session(storage_harness)

        response = _sweep(storage_harness)

        assert response.status_code == 200
        assert response.json()["reservations_released"] == 1
        assert response.json()["reservation_bytes_released"] == reserved
        assert _usage(storage_harness)[1] == 0

    def test_a_released_reservation_is_not_released_again(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, limit_bytes=10_000_000)
        _set_usage(storage_harness)
        open_upload(storage_harness)
        _expire_session(storage_harness)
        assert _sweep(storage_harness).json()["reservations_released"] == 1

        second = _sweep(storage_harness)

        assert second.json()["reservations_released"] == 0
        assert _usage(storage_harness)[1] == 0

    def test_sweep_marks_an_expired_session_expired(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, limit_bytes=10_000_000)
        _set_usage(storage_harness)
        open_upload(storage_harness)
        _expire_session(storage_harness)

        _sweep(storage_harness)

        assert (
            database_value(
                storage_harness.database_path,
                "SELECT status FROM storage_upload_sessions WHERE id = ?",
                (SESSION_ID,),
            )
            == "expired"
        )

    def test_sweep_leaves_a_completed_session_alone(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)
        _expire_session(storage_harness)
        used_before = _usage(storage_harness)

        response = _sweep(storage_harness)

        assert response.json()["reservations_released"] == 0
        assert _usage(storage_harness) == used_before

    def test_sweep_leaves_a_live_reservation_alone(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, limit_bytes=10_000_000)
        _set_usage(storage_harness)
        open_upload(storage_harness)
        _, reserved, _ = _usage(storage_harness)

        response = _sweep(storage_harness)

        assert response.json()["reservations_released"] == 0
        assert _usage(storage_harness)[1] == reserved


class TestDriftRepair:
    def test_sweep_repairs_a_corrupted_counter(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)
        _set_usage(storage_harness, bytes_used=999_999_999, files_count=42)

        response = _sweep(storage_harness)

        assert response.json()["usage_subjects_repaired"] == 1
        assert _usage(storage_harness) == (UPLOADED_SIZE, 0, 1)

    def test_sweep_reports_the_repaired_delta(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)
        _set_usage(storage_harness, bytes_used=UPLOADED_SIZE + 5_000, files_count=1)

        response = _sweep(storage_harness)

        assert response.json()["usage_drift_bytes"] == -5_000

    def test_sweep_is_a_no_op_when_counters_are_already_correct(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)

        response = _sweep(storage_harness)

        assert response.json()["usage_subjects_checked"] >= 1
        assert response.json()["usage_subjects_repaired"] == 0
        assert response.json()["usage_drift_bytes"] == 0
        assert _usage(storage_harness) == (UPLOADED_SIZE, 0, 1)

    def test_recompute_excludes_soft_deleted_files(
        self, storage_harness: StorageHarness
    ) -> None:
        file_id = _ready_file(storage_harness)
        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)
        # Corrupt the counter so the recompute has to restate it from the files.
        _set_usage(storage_harness, bytes_used=UPLOADED_SIZE, files_count=1)

        _sweep(storage_harness)

        assert _usage(storage_harness) == (0, 0, 0)


class TestSweepAuth:
    def test_sweep_rejects_a_missing_scheduler_key(
        self, storage_harness: StorageHarness
    ) -> None:
        assert storage_harness.client.post("/internal/storage-sweep").status_code == 401

    def test_sweep_rejects_the_internal_key(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.post(
            "/internal/storage-sweep", headers=AUTH_HEADERS
        )

        assert response.status_code == 401
