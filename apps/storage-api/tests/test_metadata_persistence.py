"""DB metadata written at upload open matches route policy and request."""

from __future__ import annotations

import sqlite3

from tests.conftest import NOW, StorageHarness
from tests.test_storage_api import OBJECT_KEY, open_upload


def test_pending_file_row_matches_route_and_request(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        row = connection.execute(
            """
            SELECT id, owner_type, owner_id, source_app_id, purpose, category, audience,
                   provider, bucket, object_key, version_id, original_name, content_type,
                   size_bytes, status, created_by, created_at, updated_at, deleted_at
            FROM files WHERE id = ?
            """,
            ("file_01TESTFILE",),
        ).fetchone()

    assert row == (
        "file_01TESTFILE",
        "organization",
        "org_123",
        "876-couriers",
        "organization_logo",
        "attachment",
        "public",
        "r2",
        "assets-test",
        OBJECT_KEY,
        "ver_01TESTVERSION",
        "logo.png",
        "image/png",
        84_213,
        "pending",
        "user_456",
        NOW,
        NOW,
        None,
    )


def test_upload_session_row_matches_declaration(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        row = connection.execute(
            """
            SELECT id, file_id, route_key, status, declared_content_type, declared_size_bytes,
                   expires_at, completed_at, created_by, created_at, updated_at
            FROM upload_sessions WHERE id = ?
            """,
            ("upl_01TESTSESSION",),
        ).fetchone()

    assert row == (
        "upl_01TESTSESSION",
        "file_01TESTFILE",
        "organization.primaryLogo",
        "created",
        "image/png",
        84_213,
        NOW + 600,
        None,
        "user_456",
        NOW,
        NOW,
    )


def test_jpeg_upload_persists_content_type(storage_harness: StorageHarness) -> None:
    assert (
        open_upload(
            storage_harness,
            {"content_type": "image/jpeg", "file_name": "photo.jpg", "size_bytes": 12},
        ).status_code
        == 201
    )
    with sqlite3.connect(storage_harness.database_path) as connection:
        content_type, name, size = connection.execute(
            "SELECT content_type, original_name, size_bytes FROM files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()
    assert content_type == "image/jpeg"
    assert name == "photo.jpg"
    assert size == 12
