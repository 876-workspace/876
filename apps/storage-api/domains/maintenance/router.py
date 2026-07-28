import time
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import require_scheduler_key
from db.session import get_db
from domains.maintenance.reclamation import (
    reclaim_objects,
    release_expired_reservations,
    repair_usage_drift,
)
from domains.maintenance.schemas import StorageSweepResponse
from providers.dependencies import StorageProviderDep

router = APIRouter(prefix="/internal", include_in_schema=False)

SWEEP_LIMIT = 100


@router.post(
    "/storage-sweep",
    response_model=StorageSweepResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_scheduler_key)],
)
async def run_storage_sweep(
    db: Annotated[AsyncSession, Depends(get_db)],
    provider: StorageProviderDep,
) -> StorageSweepResponse:
    now = int(time.time())
    result = await reclaim_objects(
        db,
        provider,
        apply=True,
        limit=SWEEP_LIMIT,
        now=now,
    )

    # Reservations are released before drift is recomputed so the recompute
    # measures the counters as they should now stand, not as they stood while
    # abandoned sessions were still holding bytes.
    reservations = await release_expired_reservations(
        db,
        apply=True,
        limit=SWEEP_LIMIT,
        now=now,
    )
    drift = await repair_usage_drift(
        db,
        apply=True,
        limit=SWEEP_LIMIT,
        now=now,
    )

    return StorageSweepResponse(
        reclaimed=result.total,
        soft_deleted=result.soft_deleted,
        abandoned=result.abandoned,
        reservations_released=reservations.sessions,
        reservation_bytes_released=reservations.bytes_released,
        usage_subjects_checked=drift.subjects,
        usage_subjects_repaired=drift.repaired,
        usage_drift_bytes=drift.delta_bytes,
    )
