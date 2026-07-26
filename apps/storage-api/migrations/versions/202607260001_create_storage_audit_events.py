"""Create append-only Storage audit events.

Revision ID: 202607260001
Revises: 202607250001
Create Date: 2026-07-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607260001"
down_revision: str | None = "202607250001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if "audit_events" in sa.inspect(bind).get_table_names():
        return

    op.create_table(
        "audit_events",
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_events")),
    )
    op.create_index(
        "ix_storage_audit_events_action_created_at",
        "audit_events",
        ["action", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_storage_audit_events_created_at",
        "audit_events",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_storage_audit_events_file_id_created_at",
        "audit_events",
        ["file_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_storage_audit_events_owner_id_created_at",
        "audit_events",
        ["owner_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "audit_events" not in sa.inspect(bind).get_table_names():
        return

    op.drop_index("ix_storage_audit_events_owner_id_created_at", table_name="audit_events")
    op.drop_index("ix_storage_audit_events_file_id_created_at", table_name="audit_events")
    op.drop_index("ix_storage_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_storage_audit_events_action_created_at", table_name="audit_events")
    op.drop_table("audit_events")
