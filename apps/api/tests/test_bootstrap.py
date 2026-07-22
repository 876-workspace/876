from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from services.bootstrap import BootstrapStep, run_bootstrap


class _Connection:
    def __init__(self, revisions: dict[str, int], *, dialect: str = "sqlite") -> None:
        self.dialect = SimpleNamespace(name=dialect)
        self.revisions = revisions
        self.statements: list[str] = []

    async def execute(self, statement: object, params: dict[str, Any] | None = None) -> list[SimpleNamespace]:
        sql = str(statement).strip()
        self.statements.append(sql)
        if sql.startswith("SELECT step, revision"):
            return [SimpleNamespace(step=name, revision=revision) for name, revision in self.revisions.items()]
        if sql.startswith("INSERT INTO platform_bootstrap_state"):
            assert params is not None
            self.revisions[str(params["step"])] = int(params["revision"])
        return []

    async def commit(self) -> None:
        return None


class _ConnectionContext:
    def __init__(self, connection: _Connection) -> None:
        self.connection = connection

    async def __aenter__(self) -> _Connection:
        return self.connection

    async def __aexit__(self, *_args: object) -> None:
        return None


class _Engine:
    def __init__(self, revisions: dict[str, int], *, dialect: str = "sqlite") -> None:
        self.connection = _Connection(revisions, dialect=dialect)

    def connect(self) -> _ConnectionContext:
        return _ConnectionContext(self.connection)


async def test_current_revisions_skip_all_work() -> None:
    calls: list[str] = []

    async def run(_engine: object) -> None:
        calls.append("run")

    engine = _Engine({"schema": 2})
    result = await run_bootstrap(engine, (BootstrapStep("schema", 2, run),))

    assert calls == []
    assert result.completed == ()
    assert result.skipped == ("schema",)


async def test_pending_steps_run_in_order_and_record_revisions() -> None:
    calls: list[str] = []

    async def first(_engine: object) -> None:
        calls.append("first")

    async def second(_engine: object) -> None:
        calls.append("second")

    engine = _Engine({})
    result = await run_bootstrap(
        engine,
        (
            BootstrapStep("first", 1, first),
            BootstrapStep("second", 3, second),
        ),
    )

    assert calls == ["first", "second"]
    assert engine.connection.revisions == {"first": 1, "second": 3}
    assert result.completed == ("first", "second")


async def test_optional_failure_remains_pending_and_does_not_stop_later_steps() -> None:
    calls: list[str] = []

    async def failing(_engine: object) -> None:
        raise RuntimeError("provider unavailable")

    async def later(_engine: object) -> None:
        calls.append("later")

    engine = _Engine({})
    result = await run_bootstrap(
        engine,
        (
            BootstrapStep("provider", 1, failing, required=False),
            BootstrapStep("later", 1, later),
        ),
    )

    assert calls == ["later"]
    assert engine.connection.revisions == {"later": 1}
    assert result.failed == ("provider",)


async def test_required_failure_stops_bootstrap_without_recording_revision() -> None:
    async def failing(_engine: object) -> None:
        raise RuntimeError("schema unavailable")

    engine = _Engine({})
    with pytest.raises(RuntimeError, match="schema unavailable"):
        await run_bootstrap(engine, (BootstrapStep("schema", 1, failing),))

    assert engine.connection.revisions == {}


async def test_postgres_bootstrap_takes_and_releases_advisory_lock() -> None:
    async def run(_engine: object) -> None:
        return None

    engine = _Engine({}, dialect="postgresql")
    await run_bootstrap(engine, (BootstrapStep("schema", 1, run),))

    statements = engine.connection.statements
    assert any("pg_advisory_lock" in statement for statement in statements)
    assert any("pg_advisory_unlock" in statement for statement in statements)


async def test_unknown_selected_step_is_rejected() -> None:
    async def run(_engine: object) -> None:
        return None

    with pytest.raises(ValueError, match="Unknown bootstrap steps: missing"):
        await run_bootstrap(
            _Engine({}),
            (BootstrapStep("schema", 1, run),),
            selected_steps=("missing",),
        )
