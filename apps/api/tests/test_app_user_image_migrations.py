from collections.abc import Callable

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Connection

from db.migrate import ensure_apps_logo_file_id_column, ensure_users_avatar_file_id_column

Migration = Callable[[Connection], None]


@pytest.mark.parametrize(
    ("migration", "table"),
    [
        (ensure_apps_logo_file_id_column, "apps"),
        (ensure_users_avatar_file_id_column, "users"),
    ],
)
def test_image_file_id_migration_is_noop_when_table_is_missing(
    migration: Migration,
    table: str,
) -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        migration(conn)

        assert table not in inspect(conn).get_table_names()


@pytest.mark.parametrize(
    ("migration", "table", "column"),
    [
        (ensure_apps_logo_file_id_column, "apps", "logo_file_id"),
        (ensure_users_avatar_file_id_column, "users", "avatar_file_id"),
    ],
)
def test_image_file_id_migration_is_noop_when_column_exists(
    migration: Migration,
    table: str,
    column: str,
) -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        conn.execute(text(f"CREATE TABLE {table} (id VARCHAR PRIMARY KEY, {column} VARCHAR)"))
        migration(conn)

        columns = [item["name"] for item in inspect(conn).get_columns(table)]

    assert columns == ["id", column]


@pytest.mark.parametrize(
    ("migration", "table", "column"),
    [
        (ensure_apps_logo_file_id_column, "apps", "logo_file_id"),
        (ensure_users_avatar_file_id_column, "users", "avatar_file_id"),
    ],
)
def test_image_file_id_migration_adds_column_exactly_once(
    migration: Migration,
    table: str,
    column: str,
) -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        conn.execute(text(f"CREATE TABLE {table} (id VARCHAR PRIMARY KEY)"))
        migration(conn)
        migration(conn)

        columns = [item["name"] for item in inspect(conn).get_columns(table)]

    assert columns == ["id", column]
