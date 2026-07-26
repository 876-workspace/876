"""Migration and model schema parity checks."""

from __future__ import annotations

import re
from pathlib import Path
from typing import cast

from sqlalchemy import Table, UniqueConstraint

from db.models import AuditEvent, File, UploadSession


def test_files_model_has_soft_delete_columns() -> None:
    columns = set(File.__table__.columns.keys())
    assert {"deleted_at", "deleted_by", "deletion_reason"}.issubset(columns)
    assert "id" in columns
    assert "object_key" in columns
    assert "category" in columns
    assert "audience" in columns
    assert "visibility" not in columns
    assert "delivery" not in columns


def test_files_object_key_is_unique() -> None:
    table = cast(Table, File.__table__)
    unique_constraints = {
        tuple(constraint.columns.keys()) for constraint in table.constraints if isinstance(constraint, UniqueConstraint)
    }
    # SQLAlchemy also models unique=True on the column.
    assert table.c.object_key.unique is True or ("object_key",) in unique_constraints


def test_upload_sessions_reference_files_with_cascade_delete() -> None:
    fks = list(UploadSession.__table__.foreign_keys)
    matching = [
        fk
        for fk in fks
        if fk.column.table.name == "files" and fk.parent.name == "file_id"
    ]
    assert matching
    assert any(fk.ondelete == "CASCADE" for fk in matching)


def test_files_owner_category_index_supports_drive_browse() -> None:
    index_cols = {
        str(index.name): tuple(col.name for col in index.columns)
        for index in cast(Table, File.__table__).indexes
    }
    assert index_cols["ix_files_owner_category"] == ("owner_type", "owner_id", "category")
    assert "ix_files_owner" not in index_cols


def test_migration_creates_expected_indexes() -> None:
    migration = Path("migrations/versions/202607250001_create_storage_tables.py").read_text()
    for index_name in (
        "ix_files_owner_category",
        "ix_files_source_purpose",
        "ix_files_status",
        "ix_files_audience",
        "ix_upload_sessions_status",
    ):
        assert index_name in migration
    # Owner-only index was replaced so Drive can filter by category in the same scan.
    assert "ix_files_owner\"" not in migration
    assert "ix_files_owner'" not in migration


def test_migration_does_not_create_visibility_column() -> None:
    migration = Path("migrations/versions/202607250001_create_storage_tables.py").read_text()
    assert "visibility" not in migration
    assert "delivery" not in migration
    assert re.search(r'["\']category["\']', migration)
    assert re.search(r'["\']audience["\']', migration)


def test_files_default_category_and_audience_match_architecture() -> None:
    assert File.category.default.arg == "attachment"
    assert File.audience.default.arg == "private"


def test_audit_event_model_has_operational_columns() -> None:
    assert set(AuditEvent.__table__.columns.keys()) == {
        "id",
        "actor_id",
        "source_app_id",
        "owner_type",
        "owner_id",
        "file_id",
        "upload_session_id",
        "request_id",
        "action",
        "outcome",
        "error_code",
        "created_at",
    }


def test_audit_migration_is_guarded_and_append_only() -> None:
    migration = Path("migrations/versions/202607260001_create_storage_audit_events.py").read_text()

    assert 'if "audit_events" in sa.inspect(bind).get_table_names()' in migration
    assert 'op.create_table(\n        "audit_events"' in migration
    assert "ForeignKeyConstraint" not in migration
