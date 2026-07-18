from types import SimpleNamespace
from typing import Any, cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.features import FeatureRepository


class _ScalarResult:
    def __init__(self, rows: list[Any]) -> None:
        self.rows = rows

    def all(self) -> list[Any]:
        return self.rows


class _Db:
    def __init__(self, rows: list[Any], anchor: Any | None = None) -> None:
        self.rows = rows
        self.anchor = anchor
        self.statement: Any | None = None

    async def get(self, _model: Any, _item_id: str) -> Any | None:
        return self.anchor

    async def scalars(self, statement: Any) -> _ScalarResult:
        self.statement = statement
        return _ScalarResult(self.rows)


@pytest.mark.asyncio
async def test_list_orders_features_alphabetically_with_stable_tie_breaker() -> None:
    rows = [SimpleNamespace(id="feat_alpha", name="Alpha")]
    db = _Db(rows)

    result, has_more = await FeatureRepository(cast(AsyncSession, db)).list(limit=20)

    assert result == rows
    assert has_more is False
    assert db.statement is not None
    sql = str(db.statement)
    assert "ORDER BY lower(features.name) ASC, features.id ASC" in sql


@pytest.mark.asyncio
async def test_list_previous_page_is_returned_in_alphabetical_order() -> None:
    rows = [
        SimpleNamespace(id="feat_beta", name="Beta"),
        SimpleNamespace(id="feat_alpha", name="Alpha"),
    ]
    anchor = SimpleNamespace(id="feat_charlie", name="Charlie")
    db = _Db(rows, anchor)

    result, has_more = await FeatureRepository(cast(AsyncSession, db)).list(
        limit=2,
        ending_before=anchor.id,
    )

    assert [feature.name for feature in result] == ["Alpha", "Beta"]
    assert has_more is False
    assert db.statement is not None
    sql = str(db.statement)
    assert "ORDER BY lower(features.name) DESC, features.id DESC" in sql


@pytest.mark.asyncio
async def test_search_orders_matching_features_alphabetically() -> None:
    db = _Db([])

    await FeatureRepository(cast(AsyncSession, db)).search("flag")

    assert db.statement is not None
    sql = str(db.statement)
    assert "ORDER BY lower(features.name) ASC, features.id ASC" in sql


@pytest.mark.asyncio
async def test_list_can_include_or_exclude_widget_tag_before_pagination() -> None:
    included_db = _Db([])
    excluded_db = _Db([])

    await FeatureRepository(cast(AsyncSession, included_db)).list(include_tag="widget")
    await FeatureRepository(cast(AsyncSession, excluded_db)).list(exclude_tag="widget")

    assert included_db.statement is not None
    assert excluded_db.statement is not None
    assert "ANY (features.tags)" in str(included_db.statement)
    assert "NOT" in str(excluded_db.statement)
    assert "ANY (features.tags)" in str(excluded_db.statement)
