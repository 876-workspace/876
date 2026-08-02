from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.responses import ListObject
from core.security import SessionDep
from db.models import UserMobileNumber, Verification
from db.session import get_db

from . import docs
from .schemas import (
    MobileNumberCreate,
    MobileNumberDeleteResponse,
    MobileNumberResponse,
    MobileNumberUpdate,
    MobileNumberVerificationApprove,
    MobileNumberVerificationCreate,
    MobileNumberVerificationResponse,
)
from .service import MobileNumberService

router = APIRouter(prefix="/users/me/mobile-numbers", tags=["Mobile Numbers"])


def _serialize_mobile_number(row: UserMobileNumber) -> MobileNumberResponse:
    return MobileNumberResponse.model_validate(row)


def _serialize_verification(row: Verification) -> MobileNumberVerificationResponse:
    return MobileNumberVerificationResponse(
        id=row.id,
        mobile_number_id=row.subject_id or "",
        provider=row.provider,
        provider_sid=row.provider_sid,
        channel=row.channel,
        status=row.status,
        attempt_count=row.attempt_count or 0,
        last_sent_at=row.last_sent_at,
        can_resend_at=row.can_resend_at,
        verified_at=row.verified_at,
        expires_at=row.expires_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "",
    response_model=MobileNumberResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MOBILE_NUMBER_SUMMARY,
    description=docs.CREATE_MOBILE_NUMBER_DESCRIPTION,
    responses=docs.CREATE_MOBILE_NUMBER_RESPONSES,
)
async def create_mobile_number(
    body: MobileNumberCreate,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberResponse:
    row = await MobileNumberService(db).create(
        user_id=session.user_id or "", number=body.number, number_type=body.type
    )
    return _serialize_mobile_number(row)


@router.get(
    "",
    response_model=ListObject[MobileNumberResponse],
    summary=docs.LIST_MOBILE_NUMBERS_SUMMARY,
    description=docs.LIST_MOBILE_NUMBERS_DESCRIPTION,
    responses=docs.LIST_MOBILE_NUMBERS_RESPONSES,
)
async def list_mobile_numbers(
    session: SessionDep, db: Annotated[AsyncSession, Depends(get_db)]
) -> ListObject[MobileNumberResponse]:
    rows = await MobileNumberService(db).list(user_id=session.user_id or "")
    return ListObject(
        data=[_serialize_mobile_number(row) for row in rows],
        has_more=False,
        url="/users/me/mobile-numbers",
        total_count=len(rows),
    )


@router.get(
    "/{mobile_number_id}",
    response_model=MobileNumberResponse,
    summary=docs.RETRIEVE_MOBILE_NUMBER_SUMMARY,
    description=docs.RETRIEVE_MOBILE_NUMBER_DESCRIPTION,
    responses=docs.RETRIEVE_MOBILE_NUMBER_RESPONSES,
)
async def retrieve_mobile_number(
    mobile_number_id: str,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberResponse:
    row = await MobileNumberService(db).retrieve(
        user_id=session.user_id or "", mobile_number_id=mobile_number_id
    )
    return _serialize_mobile_number(row)


@router.patch(
    "/{mobile_number_id}",
    response_model=MobileNumberResponse,
    summary=docs.UPDATE_MOBILE_NUMBER_SUMMARY,
    description=docs.UPDATE_MOBILE_NUMBER_DESCRIPTION,
    responses=docs.UPDATE_MOBILE_NUMBER_RESPONSES,
)
async def update_mobile_number(
    mobile_number_id: str,
    body: MobileNumberUpdate,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberResponse:
    row = await MobileNumberService(db).update(
        user_id=session.user_id or "",
        mobile_number_id=mobile_number_id,
        number_type=body.type,
    )
    return _serialize_mobile_number(row)


@router.delete(
    "/{mobile_number_id}",
    response_model=MobileNumberDeleteResponse,
    summary=docs.DELETE_MOBILE_NUMBER_SUMMARY,
    description=docs.DELETE_MOBILE_NUMBER_DESCRIPTION,
    responses=docs.DELETE_MOBILE_NUMBER_RESPONSES,
)
async def delete_mobile_number(
    mobile_number_id: str,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberDeleteResponse:
    await MobileNumberService(db).delete(
        user_id=session.user_id or "", mobile_number_id=mobile_number_id
    )
    return MobileNumberDeleteResponse(id=mobile_number_id)


@router.post(
    "/{mobile_number_id}/verifications",
    response_model=MobileNumberVerificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_VERIFICATION_SUMMARY,
    description=docs.CREATE_VERIFICATION_DESCRIPTION,
    responses=docs.CREATE_VERIFICATION_RESPONSES,
)
async def create_verification(
    mobile_number_id: str,
    body: MobileNumberVerificationCreate,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberVerificationResponse:
    row = await MobileNumberService(db).create_verification(
        user_id=session.user_id or "",
        mobile_number_id=mobile_number_id,
        channel=body.channel,
    )
    return _serialize_verification(row)


@router.post(
    "/{mobile_number_id}/verifications/{verification_id}/approve",
    response_model=MobileNumberVerificationResponse,
    summary=docs.APPROVE_VERIFICATION_SUMMARY,
    description=docs.APPROVE_VERIFICATION_DESCRIPTION,
    responses=docs.APPROVE_VERIFICATION_RESPONSES,
)
async def approve_verification(
    mobile_number_id: str,
    verification_id: str,
    body: MobileNumberVerificationApprove,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberVerificationResponse:
    row = await MobileNumberService(db).approve_verification(
        user_id=session.user_id or "",
        mobile_number_id=mobile_number_id,
        verification_id=verification_id,
        code=body.code,
        make_primary=body.make_primary,
    )
    return _serialize_verification(row)


@router.post(
    "/{mobile_number_id}/make-primary",
    response_model=MobileNumberResponse,
    summary=docs.MAKE_PRIMARY_SUMMARY,
    description=docs.MAKE_PRIMARY_DESCRIPTION,
    responses=docs.MAKE_PRIMARY_RESPONSES,
)
async def make_primary(
    mobile_number_id: str,
    session: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MobileNumberResponse:
    row = await MobileNumberService(db).make_primary(
        user_id=session.user_id or "", mobile_number_id=mobile_number_id
    )
    return _serialize_mobile_number(row)
