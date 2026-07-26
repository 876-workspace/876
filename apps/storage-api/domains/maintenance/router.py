import time
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import require_scheduler_key
from db.session import get_db
from domains.maintenance.reclamation import reclaim_objects
from domains.maintenance.schemas import StorageSweepResponse
from providers.dependencies import StorageProviderDep

router = APIRouter(prefix="/internal", include_in_schema=False)


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
    result = await reclaim_objects(
        db,
        provider,
        apply=True,
        limit=100,
        now=int(time.time()),
    )
    return StorageSweepResponse(
        reclaimed=result.total,
        soft_deleted=result.soft_deleted,
        abandoned=result.abandoned,
    )
