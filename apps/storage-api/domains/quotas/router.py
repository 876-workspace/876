import time
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.responses import ListObject
from db.models import StorageQuota, StorageUsage
from db.repositories.quotas import QuotaRepository
from db.repositories.usage import UsageRepository
from db.session import get_db
from domains.quotas import docs
from domains.quotas.schemas import (
    QuotaEnsureRequest,
    StorageQuotaResponse,
    StorageQuotaUsageResponse,
)

router = APIRouter(tags=["Quotas"])


def _serialize_quota(row: StorageQuota) -> StorageQuotaResponse:
    return StorageQuotaResponse.model_validate(row, from_attributes=True)


def _remaining(limit_bytes: int | None, total_bytes: int) -> int | None:
    if limit_bytes is None:
        return None
    return max(limit_bytes - total_bytes, 0)


def _serialize_usage(quota: StorageQuota | None, usage: StorageUsage) -> StorageQuotaUsageResponse:
    total = usage.bytes_used + usage.bytes_reserved
    return StorageQuotaUsageResponse(
        subject_type=usage.subject_type,  # type: ignore[arg-type]
        subject_id=usage.subject_id,
        parent_org_id=quota.parent_org_id if quota else None,
        limit_bytes=quota.limit_bytes if quota else None,
        max_file_bytes=quota.max_file_bytes if quota else None,
        bytes_used=usage.bytes_used,
        bytes_reserved=usage.bytes_reserved,
        bytes_total=total,
        bytes_remaining=_remaining(quota.limit_bytes if quota else None, total),
        files_count=usage.files_count,
        quota_status=quota.status if quota else None,  # type: ignore[arg-type]
        recomputed_at=usage.recomputed_at,
        updated_at=usage.updated_at,
    )


@router.post(
    "/admin/quotas/ensure",
    response_model=StorageQuotaResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.ENSURE_QUOTA_SUMMARY,
    description=docs.ENSURE_QUOTA_DESCRIPTION,
    responses=docs.ENSURE_QUOTA_RESPONSES,
)
async def ensure_quota(
    body: QuotaEnsureRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StorageQuotaResponse:
    row = await QuotaRepository(db).upsert_from_entitlement(
        subject_type=body.subject_type,
        subject_id=body.subject_id,
        parent_org_id=body.parent_org_id,
        limit_bytes=body.limit_bytes,
        max_file_bytes=body.max_file_bytes,
        default_user_limit_bytes=body.default_user_limit_bytes,
        plan_product_id=body.plan_product_id,
        plan_slug=body.plan_slug,
        plan_name=body.plan_name,
        status=body.status,
        entitlement_version=body.entitlement_version,
        now=int(time.time()),
    )
    return _serialize_quota(row)


@router.get(
    "/admin/quotas",
    response_model=ListObject[StorageQuotaResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_QUOTAS_SUMMARY,
    description=docs.LIST_QUOTAS_DESCRIPTION,
    responses=docs.LIST_QUOTAS_RESPONSES,
)
async def list_quotas(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject_type: Annotated[Literal["organization", "user"] | None, Query()] = None,
    quota_status: Annotated[Literal["active", "suspended"] | None, Query(alias="status")] = None,
    usage_band: Annotated[Literal["ok", "near_limit", "over_limit"] | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: Annotated[str | None, Query()] = None,
    ending_before: Annotated[str | None, Query()] = None,
) -> ListObject[StorageQuotaResponse]:
    settings = request.app.state.settings
    rows = await QuotaRepository(db).list(
        subject_type=subject_type,
        status=quota_status,
        usage_band=usage_band,
        near_limit_percent=settings.near_limit_percent,
        limit=limit + 1,
        starting_after=starting_after,
        ending_before=ending_before,
    )
    has_more = len(rows) > limit
    return ListObject[StorageQuotaResponse](
        data=[_serialize_quota(row) for row in rows[:limit]],
        has_more=has_more,
        url="/v1/admin/quotas",
    )


@router.get(
    "/quotas/{subject_type}/{subject_id}",
    response_model=StorageQuotaUsageResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_QUOTA_SUMMARY,
    description=docs.RETRIEVE_QUOTA_DESCRIPTION,
    responses=docs.RETRIEVE_QUOTA_RESPONSES,
)
async def retrieve_quota(
    subject_type: Literal["organization", "user"],
    subject_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StorageQuotaUsageResponse:
    quota = await QuotaRepository(db).get(subject_type, subject_id)
    usage_rows = await UsageRepository(db).lock_for_update(
        [(subject_type, subject_id)],
        updated_at=int(time.time()),
    )
    if quota is None and usage_rows[0].files_count == 0 and usage_rows[0].bytes_used == 0:
        raise AppHTTPException(
            code="storage/quota-not-found",
            message="No storage quota exists for that subject.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_usage(quota, usage_rows[0])
