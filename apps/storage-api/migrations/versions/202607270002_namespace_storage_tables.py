"""Namespace the Storage tables so they cannot collide with other services.

Storage may share a Postgres instance with the core identity API, whose own
`audit_events` table already shadowed this service's. `files` and
`upload_sessions` are just as generic, so both are renamed in place. This is a
rename, never a create-and-copy: every existing row, index, and grant follows
the table.

Revision ID: 202607270002
Revises: 202607270001
Create Date: 2026-07-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607270002"
down_revision: str | None = "202607270001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (("files", "storage_files"), ("upload_sessions", "storage_upload_sessions"))

# Postgres keeps indexes and tables in one namespace, so an unprefixed
# `ix_files_status` collides exactly like the table name does.
INDEXES = (
    ("ix_files_audience", "ix_storage_files_audience"),
    ("ix_files_owner_category", "ix_storage_files_owner_category"),
    ("ix_files_source_purpose", "ix_storage_files_source_purpose"),
    ("ix_files_status", "ix_storage_files_status"),
    ("pk_files", "pk_storage_files"),
    ("uq_files_object_key", "uq_storage_files_object_key"),
    ("ix_upload_sessions_file_id", "ix_storage_upload_sessions_file_id"),
    ("ix_upload_sessions_status", "ix_storage_upload_sessions_status"),
    ("pk_upload_sessions", "pk_storage_upload_sessions"),
)

CONSTRAINTS = (
    (
        "storage_upload_sessions",
        "fk_upload_sessions_file_id_files",
        "fk_storage_upload_sessions_file_id_storage_files",
    ),
)


def _rename(pairs: Sequence[tuple[str, str]]) -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    for old, new in pairs:
        if old in existing and new not in existing:
            op.rename_table(old, new)


def _rename_indexes(pairs: Sequence[tuple[str, str]]) -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for old, new in pairs:
        op.execute(sa.text(f'ALTER INDEX IF EXISTS "{old}" RENAME TO "{new}"'))


def _rename_constraints(triples: Sequence[tuple[str, str, str]]) -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table, old, new in triples:
        op.execute(sa.text(f'ALTER TABLE IF EXISTS "{table}" RENAME CONSTRAINT "{old}" TO "{new}"'))


def upgrade() -> None:
    _rename(TABLES)
    _rename_indexes(INDEXES)
    _rename_constraints(CONSTRAINTS)


def downgrade() -> None:
    _rename_constraints(
        tuple((table, new, old) for table, old, new in CONSTRAINTS),
    )
    _rename_indexes(tuple((new, old) for old, new in INDEXES))
    _rename(tuple((new, old) for old, new in TABLES))
