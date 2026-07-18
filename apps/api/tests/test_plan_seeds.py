from unittest.mock import Mock

from sqlalchemy.sql.elements import TextClause

from db.migrate import ensure_plan_features_cutover


def test_plan_feature_cutover_backfills_grants_once(monkeypatch) -> None:
    tables = {"application_modules", "plan_features", "plan_modules"}
    inspector = Mock(get_table_names=lambda: list(tables))
    connection = Mock()
    monkeypatch.setattr("db.migrate.sa_inspect", lambda _connection: inspector)

    ensure_plan_features_cutover(connection)

    statements = [str(call.args[0]) for call in connection.execute.call_args_list]
    assert len(statements) == 2
    assert "INSERT INTO plan_modules" in statements[0]
    assert "JOIN application_modules AS module ON module.feature_id = grant_.feature_id" in statements[0]
    assert "ON CONFLICT (product_id, module_id) DO NOTHING" in statements[0]
    assert statements[1] == "DROP TABLE plan_features"
    assert all(isinstance(call.args[0], TextClause) for call in connection.execute.call_args_list)

    tables.remove("plan_features")
    ensure_plan_features_cutover(connection)

    assert connection.execute.call_count == 2
