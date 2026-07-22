"""Revision-gated startup bootstrap orchestration.

The API owns a number of idempotent schema, catalog, and backfill tasks.  They
must run for a new deployment, but repeating every task on every process reload
adds avoidable database and provider latency.  This module records a revision
per task and only runs work whose declared revision has changed.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Iterable, Sequence
from dataclasses import dataclass
from time import perf_counter

from sqlalchemy import text

from core.logging import get_logger
from core.timestamps import now_unix_seconds

logger = get_logger(__name__)

_BOOTSTRAP_LOCK_ID = 876_2026_07_22
_CREATE_STATE_TABLE = """
CREATE TABLE IF NOT EXISTS platform_bootstrap_state (
    step VARCHAR(100) PRIMARY KEY,
    revision INTEGER NOT NULL,
    completed_at BIGINT NOT NULL
)
"""
_UPSERT_STATE = """
INSERT INTO platform_bootstrap_state (step, revision, completed_at)
VALUES (:step, :revision, :completed_at)
ON CONFLICT (step) DO UPDATE SET
    revision = EXCLUDED.revision,
    completed_at = EXCLUDED.completed_at
"""

BootstrapCallable = Callable[[object], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class BootstrapStep:
    """One independently versioned unit of startup work."""

    name: str
    revision: int
    run: BootstrapCallable
    required: bool = True


@dataclass(frozen=True, slots=True)
class BootstrapResult:
    completed: tuple[str, ...]
    skipped: tuple[str, ...]
    failed: tuple[str, ...]


def _validate_steps(steps: Sequence[BootstrapStep]) -> None:
    names = [step.name for step in steps]
    if len(names) != len(set(names)):
        raise ValueError("Bootstrap step names must be unique.")
    if any(step.revision < 1 for step in steps):
        raise ValueError("Bootstrap step revisions must be positive integers.")


async def run_bootstrap(
    engine: object,
    steps: Sequence[BootstrapStep],
    *,
    force: bool = False,
    selected_steps: Iterable[str] | None = None,
) -> BootstrapResult:
    """Run pending bootstrap steps while holding a cross-process lock.

    PostgreSQL deployments use a session advisory lock so concurrent replicas
    cannot race the same migration or seed. Other SQLAlchemy dialects skip the
    lock, which keeps lightweight test databases usable.
    """

    _validate_steps(steps)
    selected = set(selected_steps) if selected_steps is not None else None
    known_names = {step.name for step in steps}
    unknown_names = (selected or set()) - known_names
    if unknown_names:
        raise ValueError(f"Unknown bootstrap steps: {', '.join(sorted(unknown_names))}")

    started_at = perf_counter()
    completed: list[str] = []
    skipped: list[str] = []
    failed: list[str] = []

    async with engine.connect() as control:  # type: ignore[attr-defined]
        await control.execute(text(_CREATE_STATE_TABLE))
        await control.commit()

        uses_advisory_lock = control.dialect.name == "postgresql"
        if uses_advisory_lock:
            await control.execute(
                text("SELECT pg_advisory_lock(:lock_id)"),
                {"lock_id": _BOOTSTRAP_LOCK_ID},
            )
            await control.commit()

        try:
            result = await control.execute(text("SELECT step, revision FROM platform_bootstrap_state"))
            current_revisions = {str(row.step): int(row.revision) for row in result}
            await control.commit()

            for step in steps:
                if selected is not None and step.name not in selected:
                    skipped.append(step.name)
                    continue
                if not force and current_revisions.get(step.name) == step.revision:
                    skipped.append(step.name)
                    logger.info("db.bootstrap.step_skipped", step=step.name, revision=step.revision)
                    continue

                step_started_at = perf_counter()
                logger.info("db.bootstrap.step_started", step=step.name, revision=step.revision)
                try:
                    await step.run(engine)
                except Exception:
                    failed.append(step.name)
                    logger.error(
                        "db.bootstrap.step_failed",
                        step=step.name,
                        revision=step.revision,
                        duration_ms=round((perf_counter() - step_started_at) * 1000),
                        required=step.required,
                        exc_info=True,
                    )
                    if step.required:
                        raise
                    continue

                await control.execute(
                    text(_UPSERT_STATE),
                    {
                        "step": step.name,
                        "revision": step.revision,
                        "completed_at": now_unix_seconds(),
                    },
                )
                await control.commit()
                completed.append(step.name)
                logger.info(
                    "db.bootstrap.step_completed",
                    step=step.name,
                    revision=step.revision,
                    duration_ms=round((perf_counter() - step_started_at) * 1000),
                )
        finally:
            if uses_advisory_lock:
                await control.execute(
                    text("SELECT pg_advisory_unlock(:lock_id)"),
                    {"lock_id": _BOOTSTRAP_LOCK_ID},
                )
                await control.commit()

    logger.info(
        "db.bootstrap.completed",
        completed=completed,
        skipped=skipped,
        failed=failed,
        duration_ms=round((perf_counter() - started_at) * 1000),
    )
    return BootstrapResult(tuple(completed), tuple(skipped), tuple(failed))
