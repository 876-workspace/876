from __future__ import annotations

import asyncio
from contextlib import suppress
from dataclasses import dataclass

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.config import Settings, get_settings
from core.logging import get_logger
from core.timestamps import now_unix_seconds
from db.models import FinanceProvisioningOutbox, ProvisioningRun
from db.repositories.provisioning_runs import ProvisioningRunRepository
from db.session import AsyncSessionLocal
from services.finance_provisioning import finance_event_payload

logger = get_logger(__name__)

_LOCK_TIMEOUT_SECONDS = 5 * 60
_MAX_ERROR_LENGTH = 2_000


@dataclass(frozen=True)
class FinanceDispatchSummary:
    claimed: int
    delivered: int
    failed: int
    configured: bool


async def claim_finance_provisioning_events(
    db: AsyncSession,
    *,
    now: int,
    limit: int,
) -> list[FinanceProvisioningOutbox]:
    """Claim one retry-safe batch without holding locks during network I/O."""
    retryable = or_(
        FinanceProvisioningOutbox.status.in_(("pending", "failed")),
        (
            (FinanceProvisioningOutbox.status == "processing")
            & (FinanceProvisioningOutbox.locked_at <= now - _LOCK_TIMEOUT_SECONDS)
        ),
    )
    rows = list(
        (
            await db.scalars(
                select(FinanceProvisioningOutbox)
                .where(
                    retryable,
                    FinanceProvisioningOutbox.available_at <= now,
                )
                .order_by(
                    FinanceProvisioningOutbox.created_at,
                    FinanceProvisioningOutbox.aggregate_id,
                    FinanceProvisioningOutbox.lifecycle_version,
                )
                .with_for_update(skip_locked=True)
                .limit(limit)
            )
        ).all()
    )
    run_ids = {run_id for row in rows if (run_id := getattr(row, "run_id", None)) is not None}
    runs_by_id: dict[str, ProvisioningRun] = {}
    if run_ids:
        runs = (
            await db.scalars(
                select(ProvisioningRun)
                .where(ProvisioningRun.id.in_(run_ids))
                .options(selectinload(ProvisioningRun.steps))
                .with_for_update()
            )
        ).all()
        runs_by_id = {run.id: run for run in runs}

    for row in rows:
        row.status = "processing"
        row.attempt_count += 1
        row.locked_at = now
        row.last_error = None
        row.updated_at = now
        run_id = getattr(row, "run_id", None)
        if run_id is not None and (run := runs_by_id.get(run_id)) is not None:
            ProvisioningRunRepository.mark_processing(run, now=now)
    await db.flush()
    return rows


async def dispatch_finance_provisioning_once(
    settings: Settings | None = None,
) -> FinanceDispatchSummary:
    active_settings = settings or get_settings()
    async with AsyncSessionLocal() as session:
        await ProvisioningRunRepository(session).expire_stale_application_runs(
            now=now_unix_seconds(),
            timeout_seconds=_LOCK_TIMEOUT_SECONDS,
        )
        await session.commit()
    billing_url = active_settings.billing_url.rstrip("/")
    if not billing_url or not active_settings.billing_internal_key:
        return FinanceDispatchSummary(claimed=0, delivered=0, failed=0, configured=False)

    async with AsyncSessionLocal() as session:
        rows = await claim_finance_provisioning_events(
            session,
            now=now_unix_seconds(),
            limit=active_settings.finance_provisioning_batch_size,
        )
        snapshots = [(row.id, row.attempt_count, finance_event_payload(row)) for row in rows]
        await session.commit()

    if not snapshots:
        return FinanceDispatchSummary(claimed=0, delivered=0, failed=0, configured=True)

    delivered = 0
    failed = 0
    endpoint = f"{billing_url}/api/v1/admin/finance-connections/ensure"
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        for event_id, attempt_count, payload in snapshots:
            try:
                response = await client.post(
                    endpoint,
                    headers={
                        "x-internal-key": active_settings.billing_internal_key,
                        "content-type": "application/json",
                        "x-request-id": event_id,
                    },
                    json=payload,
                )
                response.raise_for_status()
            except Exception as exc:
                failed += 1
                await _mark_failed(event_id, attempt_count, _delivery_error(exc))
                logger.warning(
                    "finance_provisioning.delivery_failed",
                    event_id=event_id,
                    attempt_count=attempt_count,
                    error=_delivery_error(exc),
                )
            else:
                delivered += 1
                await _mark_delivered(event_id)
                logger.info(
                    "finance_provisioning.delivered",
                    event_id=event_id,
                    attempt_count=attempt_count,
                )

    return FinanceDispatchSummary(
        claimed=len(snapshots),
        delivered=delivered,
        failed=failed,
        configured=True,
    )


async def run_finance_provisioning_worker(
    stop: asyncio.Event,
    settings: Settings | None = None,
) -> None:
    """Continuously drain the durable outbox until application shutdown."""
    active_settings = settings or get_settings()
    while not stop.is_set():
        try:
            await dispatch_finance_provisioning_once(active_settings)
        except Exception:
            logger.error("finance_provisioning.worker_failed", exc_info=True)

        with suppress(TimeoutError):
            await asyncio.wait_for(
                stop.wait(),
                timeout=active_settings.finance_provisioning_poll_seconds,
            )


async def _mark_delivered(event_id: str) -> None:
    async with AsyncSessionLocal() as session:
        event = await session.get(FinanceProvisioningOutbox, event_id, with_for_update=True)
        if event is None or event.status != "processing":
            return
        now = now_unix_seconds()
        event.status = "delivered"
        event.delivered_at = now
        event.locked_at = None
        event.last_error = None
        event.updated_at = now
        if event.run_id:
            run = await ProvisioningRunRepository(session).retrieve(event.run_id, for_update=True)
            if run is not None:
                ProvisioningRunRepository.mark_succeeded(run, now=now)
        await session.commit()


async def _mark_failed(event_id: str, attempt_count: int, message: str) -> None:
    async with AsyncSessionLocal() as session:
        event = await session.get(FinanceProvisioningOutbox, event_id, with_for_update=True)
        if event is None or event.status != "processing":
            return
        now = now_unix_seconds()
        retry_seconds = min(3_600, 5 * (2 ** min(attempt_count, 10)))
        event.status = "failed"
        available_at = now + retry_seconds
        event.available_at = available_at
        event.locked_at = None
        event.last_error = message[:_MAX_ERROR_LENGTH]
        event.updated_at = now
        if event.run_id:
            run = await ProvisioningRunRepository(session).retrieve(event.run_id, for_update=True)
            if run is not None:
                ProvisioningRunRepository.mark_failed(
                    run,
                    now=now,
                    available_at=available_at,
                    message=event.last_error,
                )
        await session.commit()


def _delivery_error(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        body = error.response.text[:500].strip()
        return f"Billing returned HTTP {error.response.status_code}: {body}"
    return f"{type(error).__name__}: {error}"
