from __future__ import annotations

import re
import subprocess
from pathlib import Path

from sqlalchemy import ARRAY, BigInteger, Boolean, ForeignKeyConstraint, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB

from db.models import Base

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PRISMA_SCHEMA_ROOT = REPOSITORY_ROOT / "apps" / "billing" / "prisma" / "schema"
BILLING_API_ROOT = REPOSITORY_ROOT / "apps" / "billing-api"


def prisma_model_tables() -> dict[str, str]:
    tables: dict[str, str] = {}
    for path in PRISMA_SCHEMA_ROOT.glob("*.prisma"):
        source = path.read_text()
        for match in re.finditer(r"model\s+(\w+)\s*\{(.*?)^\}", source, re.MULTILINE | re.DOTALL):
            model_name, body = match.groups()
            mapped = re.search(r'@@map\("([^"]+)"\)', body)
            tables[model_name] = mapped.group(1) if mapped else model_name
    return tables


def test_generated_models_are_current() -> None:
    result = subprocess.run(
        [str(BILLING_API_ROOT / ".venv/bin/python"), "scripts/generate_models.py", "check"],
        cwd=BILLING_API_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr


def test_every_prisma_model_has_exactly_one_sqlalchemy_table() -> None:
    expected = set(prisma_model_tables().values())

    assert len(expected) == 75
    assert set(Base.metadata.tables) == expected


def test_representative_column_names_and_types_match_postgres_schema() -> None:
    customers = Base.metadata.tables["billing_customers"]
    invoices = Base.metadata.tables["billing_invoices"]
    tax_rates = Base.metadata.tables["billing_tax_rates"]

    assert isinstance(customers.c.id.type, String)
    assert isinstance(customers.c.outstanding_receivable.type, BigInteger)
    assert isinstance(customers.c.late_fee_exempt.type, Boolean)
    assert isinstance(customers.c.billing_address.type, JSONB)
    assert isinstance(customers.c.created_at.type, Integer)
    assert "payment_term_id" in customers.c
    assert isinstance(invoices.c.metadata.type, JSONB)
    assert isinstance(tax_rates.c.rate.type, Numeric)
    assert tax_rates.c.rate.type.precision == 7
    assert tax_rates.c.rate.type.scale == 4


def test_enum_arrays_and_server_defaults_are_preserved() -> None:
    associations = Base.metadata.tables["billing_plan_addon_associations"]
    events = associations.c.events

    assert isinstance(events.type, ARRAY)
    assert events.server_default is not None
    assert "SUBSCRIPTION_ACTIVATION" in str(events.server_default.arg)
    assert '"BillingAddonAssociationEvent"[]' in str(events.server_default.arg)

    roles = Base.metadata.tables["billing_roles"]
    assert str(roles.c.description.server_default.arg) == "''"


def test_composite_tenant_foreign_keys_are_preserved() -> None:
    customers = Base.metadata.tables["billing_customers"]
    payment_term_fk = next(
        constraint
        for constraint in customers.constraints
        if isinstance(constraint, ForeignKeyConstraint)
        and {element.target_fullname for element in constraint.elements}
        == {"billing_payment_terms.tenant_id", "billing_payment_terms.id"}
    )

    assert {column.name for column in payment_term_fk.columns} == {"tenant_id", "payment_term_id"}
    assert payment_term_fk.ondelete == "RESTRICT"


def test_named_indexes_and_unique_constraints_are_preserved() -> None:
    customers = Base.metadata.tables["billing_customers"]

    assert "billing_customers_source_app_idx" in {index.name for index in customers.indexes}
    assert "billing_customers_source_external_key" in {constraint.name for constraint in customers.constraints}
