import time
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.responses import ListObject
from db.repositories.usage import UsageRepository
from db.session import get_db
from domains.quotas.schemas import (
    StorageMemberUsageResponse,
    StorageQuotaUsageResponse,
    UsageRecomputeRequest,
    UsageRecomputeResultResponse,
)
from domains.usage import docs

router = APIRouter(prefix="/admin/usage", tags=["Usage"])


def _remaining(limit_bytes: int | None, total_bytes: int) -> int | None:
    if limit_bytes is None:
        return None
    return max(limit_bytes - total_bytes, 0)


@router.get(
    "",
    response_model=ListObject[StorageQuotaUsageResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USAGE_SUMMARY,
    description=docs.LIST_USAGE_DESCRIPTION,
    responses=docs.LIST_USAGE_RESPONSES,
)
async def list_usage(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    sort: Annotated[Literal["used_desc", "used_asc", "percent_desc"], Query()] = "used_desc",
    usage_status: Annotated[
        Literal["all", "ok", "near_limit", "over_limit"], Query(alias="status")
    ] = "all",
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> ListObject[StorageQuotaUsageResponse]:
    settings = request.app.state.settings
    rows = await UsageRepository(db).list_summaries(
        limit=limit + 1,
        sort=sort,
        status=usage_status,
        near_limit_percent=settings.near_limit_percent,
    )
    has_more = len(rows) > limit
    return ListObject[StorageQuotaUsageResponse](
        data=[
            StorageQuotaUsageResponse(
                subject_type=row.subject_type,  # type: ignore[arg-type]
                subject_id=row.subject_id,
                parent_org_id=row.parent_org_id,
                limit_bytes=row.limit_bytes,
                max_file_bytes=row.max_file_bytes,
                bytes_used=row.bytes_used,
                bytes_reserved=row.bytes_reserved,
                bytes_total=row.bytes_used + row.bytes_reserved,
                bytes_remaining=_remaining(row.limit_bytes, row.bytes_used + row.bytes_reserved),
                files_count=row.files_count,
                quota_status=row.quota_status,  # type: ignore[arg-type]
                recomputed_at=row.recomputed_at,
                updated_at=row.updated_at,
            )
            for row in rows[:limit]
        ],
        has_more=has_more,
        url="/v1/admin/usage",
    )


@router.get(
    "/{organization_id}/members",
    response_model=ListObject[StorageMemberUsageResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MEMBER_USAGE_SUMMARY,
    description=docs.LIST_MEMBER_USAGE_DESCRIPTION,
    responses=docs.LIST_MEMBER_USAGE_RESPONSES,
)
async def list_member_usage(
    organization_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[StorageMemberUsageResponse]:
    rows = await UsageRepository(db).member_breakdown(organization_id=organization_id)
    return ListObject[StorageMemberUsageResponse](
        data=[
            StorageMemberUsageResponse(
                user_id=row.user_id,
                owned_bytes=row.owned_bytes,
                owned_files=row.owned_files,
                uploaded_bytes=row.uploaded_bytes,
                uploaded_files=row.uploaded_files,
                limit_bytes=row.limit_bytes,
            )
            for row in rows
        ],
        has_more=False,
        url=f"/v1/admin/usage/{organization_id}/members",
        total_count=len(rows),
    )


@router.post(
    "/recompute",
    response_model=ListObject[UsageRecomputeResultResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.RECOMPUTE_USAGE_SUMMARY,
    description=docs.RECOMPUTE_USAGE_DESCRIPTION,
    responses=docs.RECOMPUTE_USAGE_RESPONSES,
)
async def recompute_usage(
    body: UsageRecomputeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[UsageRecomputeResultResponse]:
    repository = UsageRepository(db)
    now = int(time.time())

    if body.all:
        subjects = await repository.list_stale_subjects(limit=body.limit)
    elif body.subject_type is not None and body.subject_id is not None:
        subjects = [(body.subject_type, body.subject_id)]
    else:
        raise AppHTTPException(
            code="storage/invalid-request",
            message="Provide either a subject_type and subject_id, or all=true.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    results = [
        await repository.recompute(subject_type=subject_type, subject_id=subject_id, now=now)
        for subject_type, subject_id in subjects
    ]
    return ListObject[UsageRecomputeResultResponse](
        data=[
            UsageRecomputeResultResponse(
                subject_type=result.subject_type,  # type: ignore[arg-type]
                subject_id=result.subject_id,
                bytes_used=result.bytes_used,
                bytes_reserved=result.bytes_reserved,
                files_count=result.files_count,
                delta_bytes=result.delta_bytes,
            )
            for result in results
        ],
        has_more=False,
        url="/v1/admin/usage/recompute",
        total_count=len(results),
    )
