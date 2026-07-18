from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import AuditEvent
from db.repositories.audit_events import AuditEventRepository
from db.session import get_db
from domains.audit_events.schemas import AuditEventCreate, AuditEventResponse

from . import docs

router = APIRouter(prefix="/audit-events", tags=["Audit Events"])


def _serialize(row: AuditEvent) -> AuditEventResponse:
    return AuditEventResponse.model_validate(row)


@router.post(
    "",
    response_model=AuditEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_AUDIT_EVENT_SUMMARY,
    description=docs.CREATE_AUDIT_EVENT_DESCRIPTION,
    responses=docs.CREATE_AUDIT_EVENT_RESPONSES,
)
async def create_audit_event(
    body: AuditEventCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuditEventResponse:
    row = await AuditEventRepository(db).create(
        id=generate_id("auditEvent"),
        event=body.event,
        source=body.source,
        app_name=body.app_name,
        app_id=getattr(request.state, "app_id", None),
        user_id=body.user_id,
        path=body.path,
        search=body.search,
        referrer=body.referrer,
        title=body.title,
        request_id=body.request_id,
        session_id=body.session_id,
        distinct_id=body.distinct_id,
        properties=body.properties,
        created_at=now_unix_seconds(),
    )
    return _serialize(row)


@router.get(
    "",
    response_model=ListObject[AuditEventResponse],
    summary=docs.LIST_AUDIT_EVENTS_SUMMARY,
    description=docs.LIST_AUDIT_EVENTS_DESCRIPTION,
    responses=docs.LIST_AUDIT_EVENTS_RESPONSES,
)
async def list_audit_events(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    app_name: str | None = None,
    event: str | None = None,
    user_id: str | None = None,
    path: str | None = None,
    q: str | None = None,
) -> ListObject[AuditEventResponse]:
    rows, has_more, total_count = await AuditEventRepository(db).list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        app_name=app_name,
        event=event,
        user_id=user_id,
        path=path,
        query=q,
    )
    return ListObject[AuditEventResponse](
        data=[_serialize(row) for row in rows],
        has_more=has_more,
        url="/audit-events",
        total_count=total_count,
    )
