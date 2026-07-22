from __future__ import annotations

import base64
import hashlib
import json
from collections.abc import Collection, Mapping, Sequence
from dataclasses import asdict, dataclass
from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from sqlalchemy import Table, Text, cast, select
from sqlalchemy.ext.asyncio import AsyncConnection

from db.models import Base
from db.session import make_engine


@dataclass(frozen=True)
class TableDigest:
    table: str
    rows: int
    sha256: str


@dataclass(frozen=True)
class DatabaseSnapshot:
    tables: tuple[TableDigest, ...]

    def as_dict(self) -> dict[str, Any]:
        return {"tables": [asdict(table) for table in self.tables]}


@dataclass(frozen=True)
class ReconciliationReport:
    matches: bool
    mismatched_tables: tuple[str, ...]
    source: DatabaseSnapshot
    target: DatabaseSnapshot

    def as_dict(self) -> dict[str, Any]:
        return {
            "object": "billing_reconciliation",
            "matches": self.matches,
            "mismatched_tables": list(self.mismatched_tables),
            "source": self.source.as_dict(),
            "target": self.target.as_dict(),
        }


def _canonical_value(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return {"float": format(value, ".17g")}
    if isinstance(value, Decimal):
        return {"decimal": str(value)}
    if isinstance(value, datetime):
        return {"datetime": value.isoformat(timespec="microseconds")}
    if isinstance(value, (date, time)):
        return {type(value).__name__: value.isoformat()}
    if isinstance(value, bytes):
        return {"bytes": base64.b64encode(value).decode("ascii")}
    if isinstance(value, UUID):
        return {"uuid": str(value)}
    if isinstance(value, Enum):
        return _canonical_value(value.value)
    if isinstance(value, Mapping):
        return {
            str(key): _canonical_value(nested) for key, nested in sorted(value.items(), key=lambda item: str(item[0]))
        }
    if isinstance(value, (list, tuple)):
        return [_canonical_value(nested) for nested in value]
    raise TypeError(f"Unsupported reconciliation value type: {type(value).__name__}")


def digest_rows(table: str, columns: Sequence[str], rows: Sequence[Mapping[str, Any]]) -> TableDigest:
    digest = hashlib.sha256()
    count = 0
    for row in rows:
        payload = json.dumps(
            [_canonical_value(row[column]) for column in columns],
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        digest.update(len(payload).to_bytes(8, "big"))
        digest.update(payload)
        count += 1
    return TableDigest(table=table, rows=count, sha256=digest.hexdigest())


def _selected_tables(names: Collection[str] | None) -> list[Table]:
    if names is None:
        return sorted(Base.metadata.tables.values(), key=lambda table: table.name)
    unknown = frozenset(names) - frozenset(Base.metadata.tables)
    if unknown:
        raise ValueError(f"Unknown Billing tables: {', '.join(sorted(unknown))}")
    return [Base.metadata.tables[name] for name in sorted(set(names))]


async def snapshot_connection(
    connection: AsyncConnection,
    *,
    tables: Collection[str] | None = None,
    batch_size: int = 500,
) -> DatabaseSnapshot:
    snapshots: list[TableDigest] = []
    for table in _selected_tables(tables):
        primary_key = list(table.primary_key.columns)
        if not primary_key:
            raise RuntimeError(f"Billing table {table.name} has no primary key.")
        statement = select(*(cast(column, Text).label(column.name) for column in table.columns)).order_by(*primary_key)
        result = await connection.stream(statement)
        columns = [column.name for column in table.columns]
        digest = hashlib.sha256()
        count = 0
        async for partition in result.partitions(batch_size):
            for row in partition:
                payload = json.dumps(
                    [_canonical_value(row._mapping[column]) for column in columns],
                    ensure_ascii=False,
                    separators=(",", ":"),
                ).encode()
                digest.update(len(payload).to_bytes(8, "big"))
                digest.update(payload)
                count += 1
        snapshots.append(TableDigest(table=table.name, rows=count, sha256=digest.hexdigest()))
    return DatabaseSnapshot(tables=tuple(snapshots))


async def snapshot_database(
    database_url: str,
    *,
    tables: Collection[str] | None = None,
    batch_size: int = 500,
) -> DatabaseSnapshot:
    engine = make_engine(database_url)
    try:
        async with engine.connect() as raw_connection:
            connection = await raw_connection.execution_options(isolation_level="REPEATABLE READ")
            async with connection.begin():
                return await snapshot_connection(connection, tables=tables, batch_size=batch_size)
    finally:
        await engine.dispose()


def compare_snapshots(source: DatabaseSnapshot, target: DatabaseSnapshot) -> ReconciliationReport:
    source_by_table = {table.table: table for table in source.tables}
    target_by_table = {table.table: table for table in target.tables}
    mismatched = tuple(
        name
        for name in sorted(source_by_table.keys() | target_by_table.keys())
        if source_by_table.get(name) != target_by_table.get(name)
    )
    return ReconciliationReport(
        matches=not mismatched,
        mismatched_tables=mismatched,
        source=source,
        target=target,
    )
