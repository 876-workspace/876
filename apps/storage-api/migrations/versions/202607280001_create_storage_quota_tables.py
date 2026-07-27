"""Create Storage quota and usage counters with an existing-file backfill.

Revision ID: 202607280001
Revises: 202607270002
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607280001"
down_revision: str | None = "202607270002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "storage_quotas",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("subject_type", sa.String(length=32), nullable=False),
        sa.Column("subject_id", sa.String(length=255), nullable=False),
        sa.Column("parent_org_id", sa.String(length=255), nullable=True),
        sa.Column("limit_bytes", sa.BigInteger(), nullable=True),
        sa.Column("max_file_bytes", sa.BigInteger(), nullable=True),
        sa.Column("default_user_limit_bytes", sa.BigInteger(), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("plan_product_id", sa.String(length=255), nullable=True),
        sa.Column("plan_slug", sa.String(length=255), nullable=True),
        sa.Column("plan_name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("entitlement_version", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_storage_quotas")),
        sa.UniqueConstraint(
            "subject_type",
            "subject_id",
            name="uq_storage_quotas_subject",
        ),
    )
    op.create_index(
        "ix_storage_quotas_parent_org",
        "storage_quotas",
        ["parent_org_id"],
        unique=False,
    )

    op.create_table(
        "storage_usage",
        sa.Column("subject_type", sa.String(length=32), nullable=False),
        sa.Column("subject_id", sa.String(length=255), nullable=False),
        sa.Column("bytes_used", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("bytes_reserved", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("files_count", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("recomputed_at", sa.BigInteger(), nullable=True),
        sa.Column("updated_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint(
            "subject_type",
            "subject_id",
            name=op.f("pk_storage_usage"),
        ),
    )

    op.add_column(
        "storage_files",
        sa.Column("quota_org_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "storage_files",
        sa.Column("quota_released_at", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "storage_upload_sessions",
        sa.Column("reservation_released_at", sa.BigInteger(), nullable=True),
    )
    op.create_index(
        "ix_storage_files_quota_org",
        "storage_files",
        ["quota_org_id"],
        unique=False,
    )
    op.create_index(
        "ix_storage_files_created_by",
        "storage_files",
        ["created_by"],
        unique=False,
    )

    op.execute(
        sa.text(
            """
            UPDATE storage_files
               SET quota_org_id = owner_id
             WHERE owner_type = 'organization'
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO storage_usage (
                subject_type,
                subject_id,
                bytes_used,
                bytes_reserved,
                files_count,
                recomputed_at,
                updated_at
            )
            SELECT
                owner_type,
                owner_id,
                COALESCE(SUM(size_bytes), 0),
                0,
                COUNT(*),
                NULL,
                MAX(updated_at)
              FROM storage_files
             WHERE status = 'ready'
               AND deleted_at IS NULL
             GROUP BY owner_type, owner_id
            ON CONFLICT (subject_type, subject_id) DO UPDATE SET
                bytes_used = excluded.bytes_used,
                files_count = excluded.files_count,
                updated_at = excluded.updated_at
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        "ix_storage_files_created_by",
        table_name="storage_files",
    )
    op.drop_index(
        "ix_storage_files_quota_org",
        table_name="storage_files",
    )
    op.drop_column(
        "storage_upload_sessions",
        "reservation_released_at",
    )
    op.drop_column("storage_files", "quota_released_at")
    op.drop_column("storage_files", "quota_org_id")
    op.drop_table("storage_usage")
    op.drop_index(
        "ix_storage_quotas_parent_org",
        table_name="storage_quotas",
    )
    op.drop_table("storage_quotas")
