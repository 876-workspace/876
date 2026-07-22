#!/usr/bin/env python3
"""Generate explicit SQLAlchemy models from Billing's canonical Prisma schema.

The generated modules are checked in so application code and static analysis never
depend on Prisma or database reflection at runtime. During the extraction Prisma
remains the schema authority; ``check`` fails when the Python representation drifts.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

BILLING_API_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BILLING_API_ROOT.parents[1]
SCHEMA_ROOT = REPOSITORY_ROOT / "apps" / "billing" / "prisma" / "schema"
OUTPUT_ROOT = BILLING_API_ROOT / "db" / "models" / "generated"

SCALAR_TYPES = {"BigInt", "Boolean", "DateTime", "Decimal", "Float", "Int", "Json", "String", "Bytes"}
RESERVED_ATTRIBUTES = {"metadata"}
PARTIAL_INDEXES: dict[str, tuple[tuple[str, tuple[str, ...], str], ...]] = {
    "billing_contacts": (("billing_contacts_primary_key", ("tenant_id", "customer_id"), "is_primary"),),
    "billing_payment_modes": (("billing_payment_modes_default_key", ("tenant_id",), "is_default"),),
    "billing_payment_terms": (("billing_payment_terms_default_key", ("tenant_id",), "is_default"),),
    "billing_roles": (("billing_roles_default_key", ("tenant_id",), "is_default"),),
    "billing_tax_authorities": (("billing_tax_authorities_default_key", ("tenant_id",), "is_default"),),
    "billing_tax_rates": (("billing_tax_rates_default_key", ("tenant_id",), "is_default"),),
    "billing_tenant_currencies": (("billing_tenant_currencies_default_currency_key", ("tenant_id",), "is_default"),),
}
LEGACY_UNIQUE_CONSTRAINTS = {
    ("billing_addresses", ("tenant_id", "id")),
    ("billing_contacts", ("tenant_id", "id")),
    ("billing_credit_notes", ("tenant_id", "id")),
    ("billing_credit_notes", ("tenant_id", "number")),
    ("billing_refunds", ("tenant_id", "id")),
    ("billing_refunds", ("tenant_id", "number")),
}


def postgres_identifier(value: str) -> str:
    if len(value) <= 63:
        return value
    digest = hashlib.sha1(value.encode(), usedforsecurity=False).hexdigest()[:8]
    return f"{value[:54]}_{digest}"


@dataclass(frozen=True)
class EnumDefinition:
    name: str
    database_name: str
    values: tuple[str, ...]


@dataclass(frozen=True)
class FieldDefinition:
    name: str
    prisma_type: str
    optional: bool
    is_list: bool
    attributes: str

    @property
    def column_name(self) -> str:
        match = re.search(r'@map\("([^"]+)"\)', self.attributes)
        return match.group(1) if match else self.name


@dataclass(frozen=True)
class ConstraintDefinition:
    kind: str
    fields: tuple[str, ...]
    name: str | None = None


@dataclass(frozen=True)
class RelationDefinition:
    fields: tuple[str, ...]
    referenced_model: str
    references: tuple[str, ...]
    on_delete: str | None
    on_update: str | None


@dataclass
class ModelDefinition:
    name: str
    module: str
    fields: list[FieldDefinition] = field(default_factory=list)
    constraints: list[ConstraintDefinition] = field(default_factory=list)
    relations: list[RelationDefinition] = field(default_factory=list)
    database_name: str | None = None

    @property
    def table_name(self) -> str:
        return self.database_name or self.name


def snake_case(value: str) -> str:
    value = value.replace("-", "_")
    return re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()


def parse_list(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.strip("[]").split(",") if item.strip())


def parse_schema() -> tuple[dict[str, EnumDefinition], list[ModelDefinition]]:
    enums: dict[str, EnumDefinition] = {}
    models: list[ModelDefinition] = []

    for schema_path in sorted(SCHEMA_ROOT.glob("*.prisma")):
        source = schema_path.read_text()
        for match in re.finditer(r"enum\s+(\w+)\s*\{(.*?)^\}", source, re.MULTILINE | re.DOTALL):
            name, body = match.groups()
            mapped = re.search(r'@@map\("([^"]+)"\)', body)
            values = tuple(
                line.strip()
                for line in body.splitlines()
                if line.strip() and not line.lstrip().startswith(("//", "@@"))
            )
            enums[name] = EnumDefinition(name, mapped.group(1) if mapped else name, values)

        for match in re.finditer(r"model\s+(\w+)\s*\{(.*?)^\}", source, re.MULTILINE | re.DOTALL):
            name, body = match.groups()
            model = ModelDefinition(name=name, module=schema_path.stem.replace("-", "_"))
            for raw_line in body.splitlines():
                line = raw_line.strip()
                if not line or line.startswith("//"):
                    continue
                if line.startswith("@@map"):
                    mapped = re.search(r'@@map\("([^"]+)"\)', line)
                    if mapped:
                        model.database_name = mapped.group(1)
                    continue
                if line.startswith("@@"):
                    constraint = parse_constraint(line)
                    if constraint:
                        model.constraints.append(constraint)
                    continue

                field_match = re.match(r"(\w+)\s+(\w+)(\?|\[\])?\s*(.*)$", line)
                if not field_match:
                    continue
                field_name, prisma_type, modifier, attributes = field_match.groups()
                parsed_field = FieldDefinition(
                    name=field_name,
                    prisma_type=prisma_type,
                    optional=modifier == "?",
                    is_list=modifier == "[]",
                    attributes=attributes,
                )
                if "@relation" in attributes:
                    relation = parse_relation(prisma_type, attributes)
                    if relation:
                        model.relations.append(relation)
                model.fields.append(parsed_field)
            models.append(model)

    if not enums or not models:
        raise RuntimeError(f"No Prisma definitions found under {SCHEMA_ROOT}")
    return enums, models


def parse_constraint(line: str) -> ConstraintDefinition | None:
    match = re.match(r"@@(id|unique|index)\(\[([^]]+)](.*)\)", line)
    if not match:
        return None
    kind, raw_fields, suffix = match.groups()
    name_match = re.search(r'name:\s*"([^"]+)"', suffix)
    return ConstraintDefinition(
        kind=kind,
        fields=tuple(field.strip() for field in raw_fields.split(",")),
        name=name_match.group(1) if name_match else None,
    )


def parse_relation(referenced_model: str, attributes: str) -> RelationDefinition | None:
    fields_match = re.search(r"fields:\s*(\[[^]]+])", attributes)
    references_match = re.search(r"references:\s*(\[[^]]+])", attributes)
    if not fields_match or not references_match:
        return None
    delete_match = re.search(r"onDelete:\s*(\w+)", attributes)
    update_match = re.search(r"onUpdate:\s*(\w+)", attributes)
    return RelationDefinition(
        fields=parse_list(fields_match.group(1)),
        referenced_model=referenced_model,
        references=parse_list(references_match.group(1)),
        on_delete=delete_match.group(1) if delete_match else None,
        on_update=update_match.group(1) if update_match else None,
    )


def python_attribute(field_name: str) -> str:
    value = snake_case(field_name)
    return f"{value}_" if value in RESERVED_ATTRIBUTES else value


def render_enums(enums: dict[str, EnumDefinition]) -> str:
    lines = [
        "# Generated by scripts/generate_models.py; do not edit manually.",
        "from enum import Enum",
        "",
        "",
    ]
    for enum in enums.values():
        lines.append(f"class {enum.name}(str, Enum):")
        for value in enum.values:
            lines.append(f'    {value} = "{value}"')
        lines.extend(["", ""])
    names = ", ".join(f'"{name}"' for name in enums)
    lines.append(f"__all__ = [{names}]")
    lines.append("")
    return "\n".join(lines)


def render_type(field: FieldDefinition, enums: dict[str, EnumDefinition]) -> tuple[str, str]:
    prisma_type = field.prisma_type
    db_attribute = re.search(r"@db\.(\w+)(?:\(([^)]*)\))?", field.attributes)

    if prisma_type == "String":
        if db_attribute and db_attribute.group(1) == "Char":
            return "str", f"CHAR({db_attribute.group(2)})"
        if db_attribute and db_attribute.group(1) == "Text":
            return "str", "Text"
        if db_attribute and db_attribute.group(1) == "VarChar":
            return "str", f"String({db_attribute.group(2)})"
        return "str", "Text"
    if prisma_type == "Int":
        return "int", "Integer"
    if prisma_type == "BigInt":
        return "int", "BigInteger"
    if prisma_type == "Boolean":
        return "bool", "Boolean"
    if prisma_type == "Float":
        return "float", "Float"
    if prisma_type == "Decimal":
        if db_attribute and db_attribute.group(1) == "Decimal":
            return "Decimal", f"Numeric({db_attribute.group(2)})"
        return "Decimal", "Numeric"
    if prisma_type == "Json":
        return "dict[str, Any] | list[Any]", "JSONB"
    if prisma_type == "DateTime":
        return "datetime", "DateTime(timezone=True)"
    if prisma_type == "Bytes":
        return "bytes", "LargeBinary"
    if prisma_type in enums:
        enum = enums[prisma_type]
        return prisma_type, f'ENUM({prisma_type}, name="{enum.database_name}")'
    raise RuntimeError(f"Unsupported Prisma scalar type: {prisma_type}")


def render_default(field: FieldDefinition, enums: dict[str, EnumDefinition]) -> str | None:
    match = re.search(r"@default\(([^)]*)\)", field.attributes)
    if not match:
        return None
    value = match.group(1).strip()
    if value.startswith("["):
        items = parse_list(value)
        if field.prisma_type not in enums:
            raise RuntimeError(f"Unsupported array default for {field.name}: {value}")
        enum = enums[field.prisma_type]
        elements = ", ".join(f"'{item}'" for item in items)
        sql_default = f'ARRAY[{elements}]::"{enum.database_name}"[]'
        return f"text({sql_default!r})"
    if value.startswith('"'):
        literal = value[1:-1].replace("'", "''")
        return f"text(\"'{literal}'\")"
    if value in {"true", "false"} or re.fullmatch(r"-?\d+(?:\.\d+)?", value):
        return f'text("{value}")'
    if field.prisma_type in enums:
        return f"text(\"'{value}'\")"
    raise RuntimeError(f"Unsupported default for {field.name}: {value}")


def sql_action(value: str | None) -> str | None:
    if value is None:
        return None
    return re.sub(r"(?<!^)(?=[A-Z])", " ", value).upper()


def render_model(
    model: ModelDefinition,
    enums: dict[str, EnumDefinition],
    models_by_name: dict[str, ModelDefinition],
) -> str:
    scalar_fields = [item for item in model.fields if item.prisma_type in SCALAR_TYPES or item.prisma_type in enums]
    composite_primary_keys = {
        field_name for constraint in model.constraints if constraint.kind == "id" for field_name in constraint.fields
    }

    lines = [
        f"class {model.name}(Base):",
        f'    __tablename__ = "{model.table_name}"',
    ]

    table_args = render_table_args(model, models_by_name)
    if table_args:
        lines.extend(["", "    __table_args__ = (", *[f"        {item}," for item in table_args], "    )"])

    for parsed_field in scalar_fields:
        python_type, sqlalchemy_type = render_type(parsed_field, enums)
        if parsed_field.is_list:
            python_type = f"list[{python_type}]"
            sqlalchemy_type = f"ARRAY({sqlalchemy_type})"
        if parsed_field.optional:
            python_type = f"{python_type} | None"

        column_args = []
        attr_name = python_attribute(parsed_field.name)
        if parsed_field.column_name != attr_name:
            column_args.append(f'"{parsed_field.column_name}"')
        column_args.append(sqlalchemy_type)
        if "@id" in parsed_field.attributes or parsed_field.name in composite_primary_keys:
            column_args.append("primary_key=True")
        if parsed_field.optional:
            column_args.append("nullable=True")
        else:
            column_args.append("nullable=False")
        default = render_default(parsed_field, enums)
        if default:
            column_args.append(f"server_default={default}")
        lines.extend(["", f"    {attr_name}: Mapped[{python_type}] = mapped_column({', '.join(column_args)})"])

    lines.append("")
    return "\n".join(lines)


def render_module(
    definitions: list[ModelDefinition],
    enums: dict[str, EnumDefinition],
    models_by_name: dict[str, ModelDefinition],
) -> str:
    header = [
        "# Generated by scripts/generate_models.py; do not edit manually.",
        "from __future__ import annotations",
        "",
        "from datetime import datetime",
        "from decimal import Decimal",
        "from typing import Any",
        "",
        "from sqlalchemy import (",
        "    ARRAY,",
        "    BigInteger,",
        "    Boolean,",
        "    DateTime,",
        "    Float,",
        "    ForeignKeyConstraint,",
        "    Index,",
        "    Integer,",
        "    LargeBinary,",
        "    Numeric,",
        "    String,",
        "    Text,",
        "    UniqueConstraint,",
        "    text,",
        ")",
        "from sqlalchemy.dialects.postgresql import CHAR, ENUM, JSONB",
        "from sqlalchemy.orm import Mapped, mapped_column",
        "",
        "from db.models.base import Base",
        "from db.models.generated.enums import *  # noqa: F403",
        "",
        "",
    ]
    body = "\n\n".join(render_model(model, enums, models_by_name).rstrip() for model in definitions)
    return "\n".join(header) + body + "\n"


def render_table_args(model: ModelDefinition, models_by_name: dict[str, ModelDefinition]) -> list[str]:
    results: list[str] = []
    field_map = {item.name: item for item in model.fields}
    for parsed_field in model.fields:
        if "@unique" in parsed_field.attributes:
            name = postgres_identifier(f"{model.table_name}_{parsed_field.column_name}_key")
            results.append(f'Index("{name}", "{parsed_field.column_name}", unique=True)')
    for constraint in model.constraints:
        columns = [field_map[name].column_name for name in constraint.fields]
        quoted = ", ".join(f'"{name}"' for name in columns)
        if constraint.kind == "unique":
            unique_name = postgres_identifier(constraint.name or f"{model.table_name}_{'_'.join(columns)}_key")
            if (model.table_name, tuple(columns)) in LEGACY_UNIQUE_CONSTRAINTS:
                results.append(f'UniqueConstraint({quoted}, name="{unique_name}")')
            else:
                results.append(f'Index("{unique_name}", {quoted}, unique=True)')
        elif constraint.kind == "index":
            index_name = postgres_identifier(constraint.name or f"ix_{model.table_name}_{'_'.join(columns)}")
            results.append(f'Index("{index_name}", {quoted})')

    for index_name, columns, predicate in PARTIAL_INDEXES.get(model.table_name, ()):
        quoted = ", ".join(f'"{name}"' for name in columns)
        results.append(f'Index("{index_name}", {quoted}, unique=True, postgresql_where=text("{predicate}"))')

    for relation in model.relations:
        target = models_by_name[relation.referenced_model]
        local_columns = [field_map[name].column_name for name in relation.fields]
        target_fields = {item.name: item for item in target.fields}
        remote_columns = [f"{target.table_name}.{target_fields[name].column_name}" for name in relation.references]
        local = ", ".join(f'"{name}"' for name in local_columns)
        remote = ", ".join(f'"{name}"' for name in remote_columns)
        options = []
        if relation.on_delete:
            options.append(f'ondelete="{sql_action(relation.on_delete)}"')
        options.append(f'onupdate="{sql_action(relation.on_update) or "CASCADE"}"')
        suffix = f", {', '.join(options)}" if options else ""
        results.append(f"ForeignKeyConstraint([{local}], [{remote}]{suffix})")
    return results


def render_package(models: list[ModelDefinition]) -> str:
    lines = ["# Generated by scripts/generate_models.py; do not edit manually."]
    by_module: dict[str, list[ModelDefinition]] = {}
    for model in models:
        by_module.setdefault(model.module, []).append(model)
    for module, definitions in sorted(by_module.items()):
        names = ", ".join(model.name for model in definitions)
        lines.append(f"from db.models.generated.{module} import {names}")
    lines.append("")
    names = ", ".join(f'"{model.name}"' for model in models)
    lines.append(f"__all__ = [{names}]")
    lines.append("")
    return "\n".join(lines)


def expected_files() -> dict[Path, str]:
    enums, models = parse_schema()
    models_by_name = {model.name: model for model in models}
    grouped: dict[str, list[ModelDefinition]] = {}
    for model in models:
        grouped.setdefault(model.module, []).append(model)

    files = {
        OUTPUT_ROOT / "enums.py": render_enums(enums),
        OUTPUT_ROOT / "__init__.py": render_package(models),
    }
    for module, definitions in grouped.items():
        files[OUTPUT_ROOT / f"{module}.py"] = render_module(definitions, enums, models_by_name)
    return files


def generate() -> int:
    files = expected_files()
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    expected_paths = set(files)
    for stale_path in OUTPUT_ROOT.glob("*.py"):
        if stale_path not in expected_paths:
            stale_path.unlink()
    for path, content in files.items():
        path.write_text(content)
    print(f"Generated {len(files) - 2} model modules in {OUTPUT_ROOT.relative_to(REPOSITORY_ROOT)}")
    return 0


def check() -> int:
    failures: list[str] = []
    files = expected_files()
    for path, expected in files.items():
        if not path.exists():
            failures.append(f"missing {path.relative_to(REPOSITORY_ROOT)}")
        elif path.read_text() != expected:
            failures.append(f"stale {path.relative_to(REPOSITORY_ROOT)}")
    unexpected = sorted(set(OUTPUT_ROOT.glob("*.py")) - set(files)) if OUTPUT_ROOT.exists() else []
    failures.extend(f"unexpected {path.relative_to(REPOSITORY_ROOT)}" for path in unexpected)
    if failures:
        print("Billing SQLAlchemy model drift detected:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        print("Run: pnpm --filter @876/billing-api db:models:generate", file=sys.stderr)
        return 1
    print(f"Billing SQLAlchemy models match {len(files) - 2} Prisma schema modules")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("generate", "check"))
    args = parser.parse_args()
    return generate() if args.command == "generate" else check()


if __name__ == "__main__":
    raise SystemExit(main())
