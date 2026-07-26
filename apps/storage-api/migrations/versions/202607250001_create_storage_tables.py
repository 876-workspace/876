"""Create Storage files and upload sessions.

Revision ID: 202607250001
Revises:
Create Date: 2026-07-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607250001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if "files" in sa.inspect(bind).get_table_names():
        return

    op.create_table(
        "files",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("owner_type", sa.String(length=32), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("source_app_id", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=128), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("audience", sa.String(length=32), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("bucket", sa.String(length=255), nullable=False),
        sa.Column("object_key", sa.String(length=1024), nullable=False),
        sa.Column("version_id", sa.String(length=255), nullable=False),
        sa.Column("original_name", sa.String(length=1024), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.Column("deleted_at", sa.BigInteger(), nullable=True),
        sa.Column("deleted_by", sa.String(length=255), nullable=True),
        sa.Column("deletion_reason", sa.String(length=1024), nullable=True),
        sa.Column("purged_at", sa.BigInteger(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_files")),
        sa.UniqueConstraint("object_key", name=op.f("uq_files_object_key")),
    )
    op.create_index("ix_files_audience", "files", ["audience"], unique=False)
    op.create_index(
        "ix_files_owner_category",
        "files",
        ["owner_type", "owner_id", "category"],
        unique=False,
    )
    op.create_index("ix_files_source_purpose", "files", ["source_app_id", "purpose"], unique=False)
    op.create_index("ix_files_status", "files", ["status"], unique=False)

    op.create_table(
        "upload_sessions",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("file_id", sa.String(length=255), nullable=False),
        sa.Column("route_key", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("declared_content_type", sa.String(length=255), nullable=False),
        sa.Column("declared_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.Column("completed_at", sa.BigInteger(), nullable=True),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
            name=op.f("fk_upload_sessions_file_id_files"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_upload_sessions")),
    )
    op.create_index(op.f("ix_upload_sessions_file_id"), "upload_sessions", ["file_id"], unique=False)
    op.create_index("ix_upload_sessions_status", "upload_sessions", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_upload_sessions_status", table_name="upload_sessions")
    op.drop_index(op.f("ix_upload_sessions_file_id"), table_name="upload_sessions")
    op.drop_table("upload_sessions")
    op.drop_index("ix_files_status", table_name="files")
    op.drop_index("ix_files_source_purpose", table_name="files")
    op.drop_index("ix_files_owner_category", table_name="files")
    op.drop_index("ix_files_audience", table_name="files")
    op.drop_table("files")
