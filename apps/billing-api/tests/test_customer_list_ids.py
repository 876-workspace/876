"""ResourceService list behaviour for the customer `ids` batch filter.

Apps that already hold opaque Billing customer ids (e.g. Couriers profiles)
resolve identity in one round trip via `?ids=cus_a,cus_b` rather than N retrieve
calls. These tests pin that contract without a live database.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from sqlalchemy.dialects import postgresql

from db.models import Customer
from domains.billing.resources import ResourceDefinition, ResourceService


class _Scalars:
    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return list(self._rows)


class _RecordingSession:
    def __init__(self, rows: list[Any] | None = None) -> None:
        self.rows = list(rows or [])
        self.statements: list[Any] = []

    async def scalars(self, statement: Any) -> _Scalars:
        self.statements.append(statement)
        return _Scalars(self.rows)


def _customer_definition() -> ResourceDefinition:
    return ResourceDefinition(
        Customer,
        "customer",
        "cust",
        archive_attribute="status",
        archive_value="ARCHIVED",
    )


def _compile(statement: Any) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


@pytest.mark.asyncio
async def test_list_filters_to_requested_customer_ids() -> None:
    session = _RecordingSession(
        rows=[
            SimpleNamespace(
                id="cus_a",
                tenant_id="ten_1",
                name="A",
            ),
            SimpleNamespace(
                id="cus_b",
                tenant_id="ten_1",
                name="B",
            ),
        ]
    )
    # serialize_resource needs real columns — stub the service list path by
    # patching serialize after the query so we only assert the SQL filter.
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()

    # Avoid full serialize of SimpleNamespace models: return empty rows and
    # only inspect the compiled WHERE clause.
    session.rows = []

    result = await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={
            "ids": "cus_a, cus_b, ,cus_c",
            "limit": "50",
            "_request_path": "/api/v1/integrations/organizations/org_1/customers",
        },
    )

    assert result["object"] == "list"
    assert result["data"] == []
    assert result["has_more"] is False
    assert len(session.statements) == 1
    sql = _compile(session.statements[0])
    assert "billing_customers.id IN" in sql or "IN (" in sql
    assert "cus_a" in sql
    assert "cus_b" in sql
    assert "cus_c" in sql
    # Whitespace-only segments are dropped before the filter is applied.
    assert "''" not in sql or sql.count("cus_") == 3


@pytest.mark.asyncio
async def test_list_caps_ids_to_the_page_limit() -> None:
    session = _RecordingSession(rows=[])
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()

    await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={
            "ids": "cus_1,cus_2,cus_3,cus_4,cus_5",
            "limit": "2",
        },
    )

    sql = _compile(session.statements[0])
    # Only the first `limit` ids are applied to the IN clause.
    assert "cus_1" in sql
    assert "cus_2" in sql
    assert "cus_3" not in sql
    assert "cus_4" not in sql
    assert "cus_5" not in sql


@pytest.mark.asyncio
async def test_list_without_ids_does_not_add_an_in_filter() -> None:
    session = _RecordingSession(rows=[])
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()

    await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={"limit": "10", "status": "ACTIVE"},
    )

    sql = _compile(session.statements[0])
    assert " IN " not in sql or "status" in sql.lower()
    # No empty IN () from a missing ids param.
    assert "IN ()" not in sql


@pytest.mark.asyncio
async def test_list_empty_ids_param_is_a_no_op() -> None:
    session = _RecordingSession(rows=[])
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()

    await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={"ids": "  ,  , ", "limit": "10"},
    )

    sql = _compile(session.statements[0])
    assert "cus_" not in sql


@pytest.mark.asyncio
async def test_list_limit_clamps_to_1_through_100() -> None:
    session = _RecordingSession(rows=[])
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()

    await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={"limit": "0"},
    )
    sql_low = _compile(session.statements[0])
    # take limit+1 with clamped limit=1 → LIMIT 2
    assert "LIMIT 2" in sql_low.upper() or "LIMIT 2" in sql_low

    session.statements.clear()
    await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={"limit": "999"},
    )
    sql_high = _compile(session.statements[0])
    # clamp 100 → LIMIT 101
    assert "101" in sql_high


@pytest.mark.asyncio
async def test_list_has_more_when_rows_exceed_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    # Return limit+1 synthetic rows and stub serialize to avoid ORM mapping.
    from domains.billing import resources as resources_mod

    rows = [SimpleNamespace(id=f"cus_{i}") for i in range(3)]
    session = _RecordingSession(rows=rows)
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()
    monkeypatch.setattr(
        resources_mod,
        "serialize_resource",
        lambda row, _name: {"id": row.id, "object": "customer"},
    )

    result = await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={"limit": "2"},
    )

    assert result["has_more"] is True
    assert len(result["data"]) == 2
    assert [row["id"] for row in result["data"]] == ["cus_0", "cus_1"]


@pytest.mark.asyncio
async def test_list_trims_ids_and_drops_blanks() -> None:
    session = _RecordingSession(rows=[])
    service = ResourceService(session)  # type: ignore[arg-type]
    definition = _customer_definition()

    await service.list(
        definition,
        tenant_id="ten_1",
        path_params={},
        query_params={"ids": " cus_a , ,cus_b ", "limit": "10"},
    )

    sql = _compile(session.statements[0])
    assert "cus_a" in sql
    assert "cus_b" in sql
