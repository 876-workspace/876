from __future__ import annotations

from typing import Literal, cast

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.id import generate_id
from db.models import ProvisioningManifestRevision, ProvisioningRun, ProvisioningRunStep, ProvisioningStep

ProvisioningRunTrigger = Literal["app_activation", "manifest_publish", "manual_reconcile", "retry"]


class ProvisioningRunRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_for_event(
        self,
        *,
        organization_id: str,
        app_id: str,
        subscription_id: str | None,
        outbox_event_id: str,
        trigger: ProvisioningRunTrigger,
        finance_revision: ProvisioningManifestRevision | None,
        application_revision: ProvisioningManifestRevision | None,
        now: int,
    ) -> ProvisioningRun:
        existing = await self.retrieve_by_event(outbox_event_id)
        if existing is not None:
            return existing

        run = ProvisioningRun(
            id=generate_id("provisioningRun"),
            organization_id=organization_id,
            app_id=app_id,
            subscription_id=subscription_id,
            outbox_event_id=outbox_event_id,
            trigger=trigger,
            status="queued",
            manifest_version=1,
            finance_revision_id=finance_revision.id if finance_revision else None,
            finance_revision=finance_revision.revision if finance_revision else None,
            application_revision_id=application_revision.id if application_revision else None,
            application_revision=application_revision.revision if application_revision else None,
            attempt_count=0,
            available_at=now,
            started_at=None,
            completed_at=None,
            last_error=None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(run)
        position = 0
        for target_type, target_key, revision in (
            ("finance", "shared", finance_revision),
            ("application", app_id, application_revision),
        ):
            if revision is None:
                continue
            ordered_steps = sorted(
                revision.steps, key=lambda step: (step.position, step.id)
            )
            source_steps: list[ProvisioningStep | None] = list(ordered_steps)
            if not source_steps:
                source_steps = [None]
            for source_step in source_steps:
                self.db.add(
                    ProvisioningRunStep(
                        id=generate_id("provisioningRunStep"),
                        run=run,
                        target_type=target_type,
                        target_key=target_key,
                        revision_id=revision.id,
                        revision=revision.revision,
                        step_key=source_step.key if source_step else "apply_defaults",
                        description=(
                            source_step.description
                            if source_step
                            else f"Apply {target_type} defaults without replacing tenant overrides."
                        ),
                        position=position,
                        status="queued",
                        attempt_count=0,
                        started_at=None,
                        completed_at=None,
                        last_error=None,
                        created_at=now,
                        updated_at=now,
                    )
                )
                position += 1
        await self.db.flush()
        return run

    async def create_for_application(
        self,
        *,
        organization_id: str,
        app_id: str,
        subscription_id: str,
        trigger: ProvisioningRunTrigger,
        application_revision: ProvisioningManifestRevision,
        now: int,
    ) -> tuple[ProvisioningRun, bool]:
        existing = await self.db.scalar(
            select(ProvisioningRun)
            .where(
                ProvisioningRun.subscription_id == subscription_id,
                ProvisioningRun.app_id == app_id,
                ProvisioningRun.application_revision_id == application_revision.id,
                ProvisioningRun.outbox_event_id.is_(None),
            )
            .options(selectinload(ProvisioningRun.steps))
            .order_by(ProvisioningRun.created_at.desc(), ProvisioningRun.id.desc())
            .limit(1)
        )
        if existing is not None:
            return existing, False

        run = ProvisioningRun(
            id=generate_id("provisioningRun"),
            organization_id=organization_id,
            app_id=app_id,
            subscription_id=subscription_id,
            outbox_event_id=None,
            trigger=trigger,
            status="queued",
            manifest_version=1,
            finance_revision_id=None,
            finance_revision=None,
            application_revision_id=application_revision.id,
            application_revision=application_revision.revision,
            attempt_count=0,
            available_at=now,
            started_at=None,
            completed_at=None,
            last_error=None,
            created_at=now,
            updated_at=now,
        )
        self.db.add(run)
        ordered_steps = sorted(application_revision.steps, key=lambda step: (step.position, step.id))
        source_steps: list[ProvisioningStep | None] = list(ordered_steps) or [None]
        for position, source_step in enumerate(source_steps):
            self.db.add(
                ProvisioningRunStep(
                    id=generate_id("provisioningRunStep"),
                    run=run,
                    target_type="application",
                    target_key=app_id,
                    revision_id=application_revision.id,
                    revision=application_revision.revision,
                    step_key=source_step.key if source_step else "apply_defaults",
                    description=(
                        source_step.description
                        if source_step
                        else "Apply application defaults without replacing tenant overrides."
                    ),
                    position=position,
                    status="queued",
                    attempt_count=0,
                    started_at=None,
                    completed_at=None,
                    last_error=None,
                    created_at=now,
                    updated_at=now,
                )
            )
        await self.db.flush()
        return run, True

    async def claim_application(
        self,
        *,
        organization_id: str,
        app_id: str,
        now: int,
    ) -> ProvisioningRun | None:
        run = await self.db.scalar(
            select(ProvisioningRun)
            .where(
                ProvisioningRun.organization_id == organization_id,
                ProvisioningRun.app_id == app_id,
                ProvisioningRun.outbox_event_id.is_(None),
                ProvisioningRun.status == "queued",
                ProvisioningRun.available_at <= now,
            )
            .options(selectinload(ProvisioningRun.steps))
            .order_by(ProvisioningRun.created_at, ProvisioningRun.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if run is None:
            return None
        self.mark_processing(run, now=now)
        await self.db.flush()
        return run

    async def expire_stale_application_runs(self, *, now: int, timeout_seconds: int) -> int:
        rows = list(
            (
                await self.db.scalars(
                    select(ProvisioningRun)
                    .where(
                        ProvisioningRun.outbox_event_id.is_(None),
                        ProvisioningRun.status == "processing",
                        ProvisioningRun.started_at <= now - timeout_seconds,
                    )
                    .options(selectinload(ProvisioningRun.steps))
                    .with_for_update(skip_locked=True)
                )
            ).all()
        )
        for run in rows:
            self.mark_failed(
                run,
                now=now,
                available_at=now,
                message="Application materializer did not report completion before its lease expired.",
            )
        await self.db.flush()
        return len(rows)

    async def retrieve(self, run_id: str, *, for_update: bool = False) -> ProvisioningRun | None:
        statement = (
            select(ProvisioningRun)
            .where(ProvisioningRun.id == run_id)
            .options(selectinload(ProvisioningRun.steps))
        )
        if for_update:
            statement = statement.with_for_update()
        return cast(ProvisioningRun | None, await self.db.scalar(statement))

    async def retrieve_by_event(self, event_id: str) -> ProvisioningRun | None:
        return cast(
            ProvisioningRun | None,
            await self.db.scalar(
            select(ProvisioningRun)
            .where(ProvisioningRun.outbox_event_id == event_id)
            .options(selectinload(ProvisioningRun.steps))
            ),
        )

    async def list(
        self,
        *,
        organization_id: str | None,
        app_id: str | None,
        status: str | None,
        limit: int,
        starting_after: str | None,
        ending_before: str | None,
    ) -> tuple[list[ProvisioningRun], bool]:
        filters = []
        if organization_id:
            filters.append(ProvisioningRun.organization_id == organization_id)
        if app_id:
            filters.append(ProvisioningRun.app_id == app_id)
        if status:
            filters.append(ProvisioningRun.status == status)

        cursor_id = starting_after or ending_before
        if cursor_id:
            anchor = await self.db.get(ProvisioningRun, cursor_id)
            if anchor is None:
                return [], False
            cursor_filter = (
                or_(
                    ProvisioningRun.created_at < anchor.created_at,
                    and_(ProvisioningRun.created_at == anchor.created_at, ProvisioningRun.id < anchor.id),
                )
                if starting_after
                else or_(
                    ProvisioningRun.created_at > anchor.created_at,
                    and_(ProvisioningRun.created_at == anchor.created_at, ProvisioningRun.id > anchor.id),
                )
            )
            filters.append(cursor_filter)

        descending = ending_before is None
        statement = (
            select(ProvisioningRun)
            .where(*filters)
            .options(selectinload(ProvisioningRun.steps))
            .order_by(
                ProvisioningRun.created_at.desc() if descending else ProvisioningRun.created_at.asc(),
                ProvisioningRun.id.desc() if descending else ProvisioningRun.id.asc(),
            )
            .limit(limit + 1)
        )
        rows = list((await self.db.scalars(statement)).all())
        has_more = len(rows) > limit
        items = rows[:limit]
        if ending_before:
            items.reverse()
        return items, has_more

    @staticmethod
    def mark_processing(run: ProvisioningRun, *, now: int) -> None:
        run.status = "processing"
        run.attempt_count += 1
        run.started_at = now
        run.completed_at = None
        run.last_error = None
        run.updated_at = now
        for step in run.steps:
            if step.status != "succeeded":
                step.status = "processing"
                step.attempt_count += 1
                step.started_at = now
                step.completed_at = None
                step.last_error = None
                step.updated_at = now

    @staticmethod
    def mark_succeeded(run: ProvisioningRun, *, now: int) -> None:
        run.status = "succeeded"
        run.completed_at = now
        run.last_error = None
        run.updated_at = now
        for step in run.steps:
            step.status = "succeeded"
            step.completed_at = now
            step.last_error = None
            step.updated_at = now

    @staticmethod
    def mark_failed(run: ProvisioningRun, *, now: int, available_at: int, message: str) -> None:
        run.status = "failed"
        run.available_at = available_at
        run.completed_at = now
        run.last_error = message
        run.updated_at = now
        for step in run.steps:
            if step.status != "succeeded":
                step.status = "failed"
                step.completed_at = now
                step.last_error = message
                step.updated_at = now

    @staticmethod
    def queue_retry(run: ProvisioningRun, *, now: int) -> None:
        run.status = "queued"
        run.available_at = now
        run.completed_at = None
        run.last_error = None
        run.updated_at = now
        for step in run.steps:
            step.status = "queued"
            step.completed_at = None
            step.last_error = None
            step.updated_at = now
