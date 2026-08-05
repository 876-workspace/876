from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import AuthAttempt
from db.repositories.auth_attempts import AuthAttemptRepository
from db.session import get_db
from domains.auth_attempts.schemas import AuthAttemptResponse, AuthAttemptSummaryResponse

from . import docs

router = APIRouter(prefix="/auth-attempts", tags=["Auth Attempts"])
user_router = APIRouter(prefix="/users", tags=["Users"])


def serialize_auth_attempt(row: AuthAttempt) -> AuthAttemptResponse:
    return AuthAttemptResponse.model_validate(row)


@router.get(
    "/summary",
    response_model=AuthAttemptSummaryResponse,
    summary=docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY_SUMMARY,
    description=docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY_DESCRIPTION,
    responses=docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY_RESPONSES,
)
async def retrieve_auth_attempt_summary(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    window: Literal["24h", "7d", "30d"] = "24h",
) -> AuthAttemptSummaryResponse:
    seconds = {"24h": 86_400, "7d": 604_800, "30d": 2_592_000}[window]
    summary = await AuthAttemptRepository(db).summary(since=now_unix_seconds() - seconds)
    return AuthAttemptSummaryResponse(window=window, **summary)  # type: ignore[arg-type]


@router.get(
    "",
    response_model=ListObject[AuthAttemptResponse],
    summary=docs.LIST_AUTH_ATTEMPTS_SUMMARY,
    description=docs.LIST_AUTH_ATTEMPTS_DESCRIPTION,
    responses=docs.LIST_AUTH_ATTEMPTS_RESPONSES,
)
async def list_auth_attempts(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    user_id: str | None = None,
    identifier: str | None = None,
    event: str | None = None,
    outcome: str | None = None,
    ip_address: str | None = None,
    ip_country_code: str | None = None,
    device_fingerprint: str | None = None,
    app_id: str | None = None,
    created_after: int | None = None,
    created_before: int | None = None,
    q: str | None = None,
) -> ListObject[AuthAttemptResponse]:
    rows, has_more = await AuthAttemptRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        user_id=user_id,
        identifier=identifier,
        event=event,
        outcome=outcome,
        ip_address=ip_address,
        ip_country_code=ip_country_code,
        device_fingerprint=device_fingerprint,
        app_id=app_id,
        created_after=created_after,
        created_before=created_before,
        query=q,
    )
    return ListObject(data=[serialize_auth_attempt(row) for row in rows], has_more=has_more, url="/auth-attempts")


@router.get(
    "/{attempt_id}",
    response_model=AuthAttemptResponse,
    summary=docs.RETRIEVE_AUTH_ATTEMPT_SUMMARY,
    description=docs.RETRIEVE_AUTH_ATTEMPT_DESCRIPTION,
    responses=docs.RETRIEVE_AUTH_ATTEMPT_RESPONSES,
)
async def retrieve_auth_attempt(
    attempt_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthAttemptResponse:
    row = await AuthAttemptRepository(db).retrieve(attempt_id)
    if row is None:
        raise AppHTTPException(
            code="auth-attempt/not-found",
            message="Authentication attempt not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return serialize_auth_attempt(row)


@user_router.get("/{user_id}/auth-attempts", response_model=ListObject[AuthAttemptResponse])
async def list_user_auth_attempts(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[AuthAttemptResponse]:
    rows, has_more = await AuthAttemptRepository(db).list(
        limit=limit, starting_after=starting_after, ending_before=ending_before, user_id=user_id
    )
    return ListObject(
        data=[serialize_auth_attempt(row) for row in rows], has_more=has_more, url=f"/users/{user_id}/auth-attempts"
    )
