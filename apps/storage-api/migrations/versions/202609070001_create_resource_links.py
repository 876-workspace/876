"""Create typed file-to-resource links.

Revision ID: 202609070001
Revises: 202607280001
Create Date: 2026-09-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202609070001"
down_revision: str | None = "202607280001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "storage_resource_links",
        sa.Column("id", sa.String(length=255), nullable=False),
        sa.Column("file_id", sa.String(length=255), nullable=False),
        sa.Column("app_id", sa.String(length=255), nullable=False),
        sa.Column("resource_type", sa.String(length=128), nullable=False),
        sa.Column("resource_id", sa.String(length=255), nullable=False),
        sa.Column("relation", sa.String(length=128), nullable=False),
        sa.Column("created_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["storage_files.id"],
            name="fk_storage_resource_links_file_id_storage_files",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_storage_resource_links"),
        sa.UniqueConstraint(
            "file_id",
            "app_id",
            "resource_type",
            "resource_id",
            "relation",
            name="uq_storage_resource_links_target",
        ),
    )
    op.create_index(
        "ix_storage_resource_links_resource",
        "storage_resource_links",
        ["app_id", "resource_type", "resource_id", "relation"],
        unique=False,
    )
    op.create_index(
        "ix_storage_resource_links_file",
        "storage_resource_links",
        ["file_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_storage_resource_links_file", table_name="storage_resource_links")
    op.drop_index("ix_storage_resource_links_resource", table_name="storage_resource_links")
    op.drop_table("storage_resource_links")
