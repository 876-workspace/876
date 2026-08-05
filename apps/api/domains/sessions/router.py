from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.responses import ListObject
from core.security import AdminDep
from db.models import Session
from db.repositories.sessions import SessionRepository
from db.session import get_db
from domains.sessions.schemas import SessionDeleted, SessionResponse, UserSessionsDeleted

from . import docs

router = APIRouter(tags=["Sessions"])


def serialize_session(row: Session) -> SessionResponse:
    return SessionResponse.model_validate(row)


async def require_session_row(db: AsyncSession, session_id: str) -> Session:
    row = await db.get(Session, session_id)
    if row is None:
        raise AppHTTPException(
            code="session/not-found", message="Session not found.", http_status_code=status.HTTP_404_NOT_FOUND
        )
    return row


@router.get(
    "/sessions",
    response_model=ListObject[SessionResponse],
    summary=docs.LIST_SESSIONS_SUMMARY,
    description=docs.LIST_SESSIONS_DESCRIPTION,
    responses=docs.LIST_SESSIONS_RESPONSES,
)
async def list_sessions(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    user_id: str | None = None,
    active: bool | None = None,
    status_filter: Annotated[Literal["active", "revoked", "expired"] | None, Query(alias="status")] = None,
    device_id: str | None = None,
) -> ListObject[SessionResponse]:
    rows, has_more = await SessionRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        user_id=user_id,
        active=active,
        status=status_filter,
        device_id=device_id,
    )
    return ListObject(data=[serialize_session(row) for row in rows], has_more=has_more, url="/sessions")


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary=docs.RETRIEVE_SESSION_SUMMARY,
    description=docs.RETRIEVE_SESSION_DESCRIPTION,
    responses=docs.RETRIEVE_SESSION_RESPONSES,
)
async def retrieve_session(
    session_id: str, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> SessionResponse:
    return serialize_session(await require_session_row(db, session_id))


@router.delete(
    "/sessions/{session_id}",
    response_model=SessionDeleted,
    summary=docs.REVOKE_SESSION_SUMMARY,
    description=docs.REVOKE_SESSION_DESCRIPTION,
    responses=docs.REVOKE_SESSION_RESPONSES,
)
async def revoke_session(
    session_id: str, admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> SessionDeleted:
    row = await SessionRepository(db).revoke(session_id, admin.user_id)
    if row is None:
        await require_session_row(db, session_id)
    return SessionDeleted(id=session_id)


@router.delete(
    "/users/{user_id}/sessions",
    response_model=UserSessionsDeleted,
    summary=docs.REVOKE_USER_SESSIONS_SUMMARY,
    description=docs.REVOKE_USER_SESSIONS_DESCRIPTION,
    responses=docs.REVOKE_USER_SESSIONS_RESPONSES,
)
async def revoke_user_sessions(
    user_id: str, admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> UserSessionsDeleted:
    count = await SessionRepository(db).revoke_all_for_user(user_id, admin.user_id)
    return UserSessionsDeleted(user_id=user_id, revoked_count=count)


@router.get("/users/{user_id}/sessions", response_model=ListObject[SessionResponse])
async def list_user_sessions(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    active: bool | None = None,
    status_filter: Annotated[Literal["active", "revoked", "expired"] | None, Query(alias="status")] = None,
) -> ListObject[SessionResponse]:
    rows, has_more = await SessionRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        user_id=user_id,
        active=active,
        status=status_filter,
    )
    return ListObject(
        data=[serialize_session(row) for row in rows], has_more=has_more, url=f"/users/{user_id}/sessions"
    )
