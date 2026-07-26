from sqlalchemy import create_engine, inspect, text

from db.migrate import ensure_organizations_logo_file_id_column


def test_organization_logo_file_id_migration_is_guarded_and_idempotent() -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        ensure_organizations_logo_file_id_column(conn)
        conn.execute(text("CREATE TABLE organizations (id VARCHAR PRIMARY KEY)"))
        ensure_organizations_logo_file_id_column(conn)
        ensure_organizations_logo_file_id_column(conn)

        columns = {column["name"] for column in inspect(conn).get_columns("organizations")}

    assert columns == {"id", "logo_file_id"}


def test_organization_logo_file_id_migration_is_nullable() -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE organizations (id VARCHAR PRIMARY KEY)"))
        ensure_organizations_logo_file_id_column(conn)

        conn.execute(text("INSERT INTO organizations (id) VALUES ('org_without_logo')"))
        row = conn.execute(
            text("SELECT id, logo_file_id FROM organizations WHERE id = 'org_without_logo'")
        ).one()

    assert row[0] == "org_without_logo"
    assert row[1] is None


def test_organization_logo_file_id_migration_preserves_existing_rows() -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE organizations ("
                "id VARCHAR PRIMARY KEY, "
                "name VARCHAR NOT NULL, "
                "logo_url VARCHAR"
                ")"
            )
        )
        conn.execute(
            text(
                "INSERT INTO organizations (id, name, logo_url) "
                "VALUES ('org_existing', 'Island Logistics', 'https://cdn.example/old.png')"
            )
        )
        ensure_organizations_logo_file_id_column(conn)

        row = conn.execute(
            text(
                "SELECT id, name, logo_url, logo_file_id "
                "FROM organizations WHERE id = 'org_existing'"
            )
        ).one()
        columns = {column["name"] for column in inspect(conn).get_columns("organizations")}

    assert columns == {"id", "name", "logo_url", "logo_file_id"}
    assert row == (
        "org_existing",
        "Island Logistics",
        "https://cdn.example/old.png",
        None,
    )


def test_organization_logo_file_id_accepts_opaque_file_ids() -> None:
    engine = create_engine("sqlite://")

    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE organizations (id VARCHAR PRIMARY KEY)"))
        ensure_organizations_logo_file_id_column(conn)
        conn.execute(
            text(
                "INSERT INTO organizations (id, logo_file_id) "
                "VALUES ('org_with_logo', 'file_01JAMAICA876')"
            )
        )
        value = conn.execute(
            text("SELECT logo_file_id FROM organizations WHERE id = 'org_with_logo'")
        ).scalar_one()

    assert value == "file_01JAMAICA876"
