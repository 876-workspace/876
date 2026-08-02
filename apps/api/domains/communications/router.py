from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.responses import ListObject
from core.security import AdminDep
from db.models import CommunicationCall, CommunicationMessage, CommunicationPhoneLookup
from db.session import get_db

from . import docs
from .schemas import CallCreate, CallResponse, MessageCreate, MessageResponse, PhoneLookupCreate, PhoneLookupResponse
from .service import CommunicationsService

router = APIRouter(prefix="/communications", tags=["Communications"])


def _lookup(row: CommunicationPhoneLookup) -> PhoneLookupResponse:
    return PhoneLookupResponse.model_validate(row)


def _message(row: CommunicationMessage) -> MessageResponse:
    return MessageResponse.model_validate(row)


def _call(row: CommunicationCall) -> CallResponse:
    return CallResponse.model_validate(row)


@router.post(
    "/phone-lookups",
    response_model=PhoneLookupResponse,
    summary=docs.CREATE_PHONE_LOOKUP_SUMMARY,
    description=docs.CREATE_PHONE_LOOKUP_DESCRIPTION,
    responses=docs.CREATE_PHONE_LOOKUP_RESPONSES,
)
async def create_phone_lookup(
    body: PhoneLookupCreate, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> PhoneLookupResponse:
    return _lookup(await CommunicationsService(db).lookup(number=body.number, include_line_type=body.include_line_type))


@router.post(
    "/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MESSAGE_SUMMARY,
    description=docs.CREATE_MESSAGE_DESCRIPTION,
    responses=docs.CREATE_MESSAGE_RESPONSES,
)
async def create_message(
    body: MessageCreate, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> MessageResponse:
    return _message(
        await CommunicationsService(db).create_message(
            to_number=body.to_number,
            channel=body.channel,
            template_key=body.template_key,
            idempotency_key=body.idempotency_key,
            user_id=body.user_id,
            organization_id=body.organization_id,
            app_id=body.app_id,
            client_reference=body.client_reference,
        )
    )


@router.get(
    "/messages",
    response_model=ListObject[MessageResponse],
    summary=docs.LIST_MESSAGES_SUMMARY,
    description=docs.LIST_MESSAGES_DESCRIPTION,
    responses=docs.LIST_MESSAGES_RESPONSES,
)
async def list_messages(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
) -> ListObject[MessageResponse]:
    rows, has_more, total = await CommunicationsService(db).list_messages(
        limit=limit, starting_after=starting_after, ending_before=ending_before, status=status_filter
    )
    return ListObject(
        data=[_message(row) for row in rows],
        has_more=has_more,
        url="/communications/messages",
        total_count=total,
    )


@router.get(
    "/messages/{message_id}",
    response_model=MessageResponse,
    summary=docs.RETRIEVE_MESSAGE_SUMMARY,
    description=docs.RETRIEVE_MESSAGE_DESCRIPTION,
    responses=docs.RETRIEVE_MESSAGE_RESPONSES,
)
async def retrieve_message(
    message_id: str, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> MessageResponse:
    return _message(await CommunicationsService(db).retrieve_message(message_id))


@router.post(
    "/calls",
    response_model=CallResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_CALL_SUMMARY,
    description=docs.CREATE_CALL_DESCRIPTION,
    responses=docs.CREATE_CALL_RESPONSES,
)
async def create_call(body: CallCreate, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]) -> CallResponse:
    return _call(
        await CommunicationsService(db).create_call(
            to_number=body.to_number,
            template_key=body.template_key,
            idempotency_key=body.idempotency_key,
            user_id=body.user_id,
            organization_id=body.organization_id,
            app_id=body.app_id,
            client_reference=body.client_reference,
        )
    )


@router.get(
    "/calls",
    response_model=ListObject[CallResponse],
    summary=docs.LIST_CALLS_SUMMARY,
    description=docs.LIST_CALLS_DESCRIPTION,
    responses=docs.LIST_CALLS_RESPONSES,
)
async def list_calls(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    starting_after: str | None = None,
    ending_before: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
) -> ListObject[CallResponse]:
    rows, has_more, total = await CommunicationsService(db).list_calls(
        limit=limit, starting_after=starting_after, ending_before=ending_before, status=status_filter
    )
    return ListObject(
        data=[_call(row) for row in rows], has_more=has_more, url="/communications/calls", total_count=total
    )


@router.get(
    "/calls/{call_id}",
    response_model=CallResponse,
    summary=docs.RETRIEVE_CALL_SUMMARY,
    description=docs.RETRIEVE_CALL_DESCRIPTION,
    responses=docs.RETRIEVE_CALL_RESPONSES,
)
async def retrieve_call(call_id: str, _admin: AdminDep, db: Annotated[AsyncSession, Depends(get_db)]) -> CallResponse:
    return _call(await CommunicationsService(db).retrieve_call(call_id))
