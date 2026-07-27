"""Move Storage audit events onto a prefixed table name.

Storage shares a database server with the core identity API in development, and
core already owns an `audit_events` table with a completely different shape. The
previous migration guarded on `"audit_events" in table_names` and therefore
skipped creation entirely, leaving every audit insert to fail against core's
table. Prefixing the name makes the two bounded contexts unable to collide.

Revision ID: 202607270001
Revises: 202607260001
Create Date: 2026-07-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607270001"
down_revision: str | None = "202607260001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "storage_audit_events"
INDEXES = (
    ("ix_storage_audit_events_action_created_at", ["action", "created_at"]),
    ("ix_storage_audit_events_created_at", ["created_at"]),
    ("ix_storage_audit_events_file_id_created_at", ["file_id", "created_at"]),
    ("ix_storage_audit_events_owner_id_created_at", ["owner_id", "created_at"]),
)


def _is_storage_shaped(inspector: sa.Inspector, table: str) -> bool:
    """Whether `table` is Storage's audit table rather than core's same-named one."""
    if table not in inspector.get_table_names():
        return False
    return "source_app_id" in {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE in inspector.get_table_names():
        return

    # A Storage-only database got the table created under the unprefixed name;
    # carry its rows over instead of dropping them.
    if _is_storage_shaped(inspector, "audit_events"):
        op.rename_table("audit_events", TABLE)
        return

    op.create_table(
        TABLE,
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("actor_id", sa.String(length=255), nullable=True),
        sa.Column("source_app_id", sa.String(length=255), nullable=False),
        sa.Column("owner_type", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("file_id", sa.String(length=255), nullable=False),
        sa.Column("upload_session_id", sa.String(length=255), nullable=True),
        sa.Column("request_id", sa.String(length=255), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("error_code", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_storage_audit_events")),
    )
    for name, columns in INDEXES:
        op.create_index(name, TABLE, columns, unique=False)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if TABLE not in inspector.get_table_names():
        return

    for name, _columns in reversed(INDEXES):
        op.drop_index(name, table_name=TABLE)
    op.drop_table(TABLE)
