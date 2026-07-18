from __future__ import annotations

import asyncio
import time
from contextlib import suppress
from dataclasses import dataclass

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from core.logging import get_logger
from core.timestamps import now_unix_seconds
from db.models import BillingCustomerOutbox
from db.session import AsyncSessionLocal
from services.billing_customer_sync import customer_event_payload

logger = get_logger(__name__)

_LOCK_TIMEOUT_SECONDS = 5 * 60
_MAX_ERROR_LENGTH = 2_000


@dataclass(frozen=True)
class BillingCustomerDispatchSummary:
    claimed: int
    delivered: int
    failed: int
    configured: bool


async def claim_billing_customer_events(
    db: AsyncSession,
    *,
    now: int,
    limit: int,
) -> list[BillingCustomerOutbox]:
    retryable = or_(
        BillingCustomerOutbox.status.in_(("pending", "failed")),
        (
            (BillingCustomerOutbox.status == "processing")
            & (BillingCustomerOutbox.locked_at <= now - _LOCK_TIMEOUT_SECONDS)
        ),
    )
    rows = list(
        (
            await db.scalars(
                select(BillingCustomerOutbox)
                .where(retryable, BillingCustomerOutbox.available_at <= now)
                .order_by(BillingCustomerOutbox.created_at, BillingCustomerOutbox.id)
                .with_for_update(skip_locked=True)
                .limit(limit)
            )
        ).all()
    )
    for row in rows:
        row.status = "processing"
        row.attempt_count += 1
        row.locked_at = now
        row.last_error = None
        row.updated_at = now
    await db.flush()
    return rows


async def dispatch_billing_customer_sync_once(
    settings: Settings | None = None,
) -> BillingCustomerDispatchSummary:
    active_settings = settings or get_settings()
    billing_url = active_settings.billing_url.rstrip("/")
    if not billing_url or not active_settings.billing_internal_key:
        return BillingCustomerDispatchSummary(claimed=0, delivered=0, failed=0, configured=False)

    async with AsyncSessionLocal() as session:
        rows = await claim_billing_customer_events(
            session,
            now=now_unix_seconds(),
            limit=active_settings.finance_provisioning_batch_size,
        )
        snapshots = [(row.id, row.attempt_count, customer_event_payload(row)) for row in rows]
        await session.commit()

    if not snapshots:
        return BillingCustomerDispatchSummary(claimed=0, delivered=0, failed=0, configured=True)

    delivered = 0
    failed = 0
    endpoint = f"{billing_url}/api/v1/admin/customers/ensure"
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
                error = _delivery_error(exc)
                await _mark_failed(event_id, attempt_count, error)
                logger.warning(
                    "billing_customer_sync.delivery_failed",
                    event_id=event_id,
                    attempt_count=attempt_count,
                    error=error,
                )
            else:
                delivered += 1
                await _mark_delivered(event_id)
                logger.info(
                    "billing_customer_sync.delivered",
                    event_id=event_id,
                    attempt_count=attempt_count,
                )

    return BillingCustomerDispatchSummary(
        claimed=len(snapshots),
        delivered=delivered,
        failed=failed,
        configured=True,
    )


async def trigger_billing_run_once(settings: Settings) -> bool:
    billing_url = settings.billing_url.rstrip("/")
    if not billing_url or not settings.billing_internal_key:
        return False
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            response = await client.post(
                f"{billing_url}/api/v1/admin/billing/run",
                headers={"x-internal-key": settings.billing_internal_key},
            )
            response.raise_for_status()
    except Exception as exc:
        logger.warning("billing_run.trigger_failed", error=_delivery_error(exc))
        return False
    return True


async def run_billing_sync_worker(
    stop: asyncio.Event,
    settings: Settings | None = None,
) -> None:
    active_settings = settings or get_settings()
    last_billing_run = time.monotonic()
    while not stop.is_set():
        try:
            await dispatch_billing_customer_sync_once(active_settings)
            now_monotonic = time.monotonic()
            if (
                active_settings.billing_run_interval_seconds > 0
                and now_monotonic - last_billing_run >= active_settings.billing_run_interval_seconds
            ):
                last_billing_run = now_monotonic
                await trigger_billing_run_once(active_settings)
        except Exception:
            logger.error("billing_customer_sync.worker_failed", exc_info=True)

        with suppress(TimeoutError):
            await asyncio.wait_for(
                stop.wait(),
                timeout=active_settings.finance_provisioning_poll_seconds,
            )


async def _mark_delivered(event_id: str) -> None:
    async with AsyncSessionLocal() as session:
        event = await session.get(BillingCustomerOutbox, event_id, with_for_update=True)
        if event is None or event.status != "processing":
            return
        now = now_unix_seconds()
        event.status = "delivered"
        event.delivered_at = now
        event.locked_at = None
        event.last_error = None
        event.updated_at = now
        await session.commit()


async def _mark_failed(event_id: str, attempt_count: int, message: str) -> None:
    async with AsyncSessionLocal() as session:
        event = await session.get(BillingCustomerOutbox, event_id, with_for_update=True)
        if event is None or event.status != "processing":
            return
        now = now_unix_seconds()
        event.status = "failed"
        event.available_at = now + min(3_600, 5 * (2 ** min(attempt_count, 10)))
        event.locked_at = None
        event.last_error = message[:_MAX_ERROR_LENGTH]
        event.updated_at = now
        await session.commit()


def _delivery_error(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        body = error.response.text[:500].strip()
        return f"Billing returned HTTP {error.response.status_code}: {body}"
    return f"{type(error).__name__}: {error}"
