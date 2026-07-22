"""Create the vendor table omitted from the legacy Prisma migrations.

Revision ID: 202607220002
Revises: 202607220001
Create Date: 2026-07-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607220002"
down_revision: str | None = "202607220001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if "billing_vendors" in sa.inspect(bind).get_table_names():
        return

    postgresql.ENUM("ACTIVE", "ARCHIVED", name="BillingVendorStatus").create(bind, checkfirst=True)
    status = postgresql.ENUM("ACTIVE", "ARCHIVED", name="BillingVendorStatus", create_type=False)
    op.create_table(
        "billing_vendors",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("tenant_id", sa.Text(), nullable=False),
        sa.Column("external_reference", sa.Text(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("billing_address", postgresql.JSONB(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("default_currency", sa.Text(), nullable=True),
        sa.Column("status", status, server_default=sa.text("'ACTIVE'"), nullable=False),
        sa.Column("created_at", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["billing_tenants.id"],
            name="billing_vendors_tenant_id_fkey",
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="billing_vendors_pkey"),
    )
    op.create_index("billing_vendors_external_reference_idx", "billing_vendors", ["external_reference"])
    op.create_index("billing_vendors_tenant_id_idx", "billing_vendors", ["tenant_id"])
    op.create_index(
        "billing_vendors_tenant_id_external_reference_key",
        "billing_vendors",
        ["tenant_id", "external_reference"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("billing_vendors")
    postgresql.ENUM(name="BillingVendorStatus").drop(op.get_bind(), checkfirst=True)
