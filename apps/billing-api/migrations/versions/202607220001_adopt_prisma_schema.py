"""Adopt the complete Prisma Billing schema under Alembic ownership.

Revision ID: 202607220001
Revises: None
Create Date: 2026-07-22
"""

import hashlib
import json
from collections.abc import Collection, Mapping, Sequence

from alembic import op
from sqlalchemy import inspect
from sqlalchemy.engine.reflection import Inspector

revision: str = "202607220001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None
EXPECTED_SCHEMA_FINGERPRINTS = frozenset(
    {
        "67ae485cca6fe83be1dd6075d7463fa99e74bd77c429289d81565026624116f6",
        "247c9009e7cc476ecd1cd0fa6bd31ceffa5198cc777060770ceb1092e159fde3",
    }
)


def _billing_columns(inspector: Inspector) -> Mapping[str, Collection[str]]:
    table_names = inspector.get_table_names()
    return {
        table_name: [column["name"] for column in inspector.get_columns(table_name)]
        for table_name in table_names
        if table_name.startswith("billing_")
    }


def _schema_fingerprint(columns: Mapping[str, Collection[str]]) -> str:
    payload = {table: sorted(names) for table, names in sorted(columns.items())}
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    actual = _schema_fingerprint(_billing_columns(inspector))
    if actual in EXPECTED_SCHEMA_FINGERPRINTS:
        return
    # Bootstrap an empty Billing database (fresh pooled DB or local dev).
    # The empty schema fingerprint is 44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a.
    # Prisma is the schema authority, but Base.metadata reflects that exact
    # schema, so creating all tables here is equivalent to replaying the
    # Prisma baseline for a new environment.
    if actual == "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a":
        from db.models import Base

        Base.metadata.create_all(bind=bind)
        actual = _schema_fingerprint(_billing_columns(inspect(bind)))
        if actual not in EXPECTED_SCHEMA_FINGERPRINTS:
            raise RuntimeError(f"Billing schema bootstrap produced unexpected fingerprint: {actual}")
        return
    raise RuntimeError("Refusing to adopt a Billing schema that does not match the frozen Prisma baseline.")


def downgrade() -> None:
    raise RuntimeError("The Billing schema adoption baseline cannot be downgraded.")
