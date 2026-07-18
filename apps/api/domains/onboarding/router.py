from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from pydantic import JsonValue, TypeAdapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import App, OnboardingSession, Organization
from db.repositories.onboarding import OnboardingRepository
from db.session import get_db
from domains.onboarding.schemas import (
    OnboardingAnswersReplace,
    OnboardingCatalogResponse,
    OnboardingSessionResponse,
    OnboardingTargetType,
    OnboardingValidationResponse,
)
from services.onboarding_catalog import onboarding_catalog, validate_onboarding_answers

from . import docs

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
_json_value_adapter: TypeAdapter[JsonValue] = TypeAdapter(JsonValue)


def _catalog_or_error(
    target_type: OnboardingTargetType,
    target_key: str,
    country_code: str,
    *,
    catalog_revision: int | None = None,
) -> OnboardingCatalogResponse:
    try:
        return onboarding_catalog(
            target_type,
            target_key,
            country_code,
            catalog_revision=catalog_revision,
        )
    except ValueError as error:
        raise AppHTTPException(
            code="onboarding/catalog-not-found",
            message=str(error),
            http_status_code=status.HTTP_404_NOT_FOUND,
        ) from error


def _answers(row: OnboardingSession) -> dict[str, JsonValue]:
    return {answer.field_key: _json_value_adapter.validate_python(answer.value) for answer in row.answers}


def _serialize(row: OnboardingSession) -> OnboardingSessionResponse:
    return OnboardingSessionResponse(
        id=row.id,
        organization_id=row.organization_id,
        target_type=row.target_type,
        target_key=row.target_key,
        country_code=row.country_code,
        schema_version=1,
        catalog_revision=row.catalog_revision,
        status=row.status,
        answers=_answers(row),
        submitted_at=row.submitted_at,
        completed_at=row.completed_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _require_targets(
    db: AsyncSession,
    organization_id: str,
    target_type: OnboardingTargetType,
    target_key: str,
) -> None:
    if await db.get(Organization, organization_id) is None:
        raise AppHTTPException(
            code="onboarding/organization-not-found",
            message="Organization not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if target_type == "organization" and target_key not in {"global", "core"}:
        raise AppHTTPException(
            code="onboarding/target-not-found",
            message="The organization onboarding targets are named 'global' and 'core'.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if target_type == "application":
        result = await db.execute(select(App).where(App.slug == target_key))
        if result.scalar_one_or_none() is None:
            raise AppHTTPException(
                code="onboarding/target-not-found",
                message="Application onboarding target not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )


@router.get(
    "/catalog/{target_type}/{target_key}",
    response_model=OnboardingCatalogResponse,
    summary=docs.RETRIEVE_CATALOG_SUMMARY,
    description=docs.RETRIEVE_CATALOG_DESCRIPTION,
)
async def retrieve_catalog(
    target_type: OnboardingTargetType,
    target_key: str,
    _admin: AdminDep,
    country_code: Annotated[str, Query(min_length=2, max_length=2)] = "JM",
) -> OnboardingCatalogResponse:
    return _catalog_or_error(target_type, target_key, country_code)


@router.get(
    "/organizations/{organization_id}/{target_type}/{target_key}",
    response_model=OnboardingSessionResponse,
    summary=docs.RETRIEVE_SESSION_SUMMARY,
    description=docs.RETRIEVE_SESSION_DESCRIPTION,
)
async def retrieve_session(
    organization_id: str,
    target_type: OnboardingTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    country_code: Annotated[str, Query(min_length=2, max_length=2)] = "JM",
) -> OnboardingSessionResponse:
    await _require_targets(db, organization_id, target_type, target_key)
    catalog = _catalog_or_error(target_type, target_key, country_code)
    row = await OnboardingRepository(db).get_or_create(
        organization_id,
        target_type,
        target_key,
        country_code=catalog.country_code,
        catalog_revision=catalog.catalog_revision,
        now=now_unix_seconds(),
    )
    return _serialize(row)


@router.put(
    "/organizations/{organization_id}/{target_type}/{target_key}",
    response_model=OnboardingSessionResponse,
    summary=docs.REPLACE_ANSWERS_SUMMARY,
    description=docs.REPLACE_ANSWERS_DESCRIPTION,
)
async def replace_answers(
    organization_id: str,
    target_type: OnboardingTargetType,
    target_key: str,
    body: OnboardingAnswersReplace,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> OnboardingSessionResponse:
    await _require_targets(db, organization_id, target_type, target_key)
    catalog = _catalog_or_error(target_type, target_key, body.country_code)
    repo = OnboardingRepository(db)
    session = await repo.get_or_create(
        organization_id,
        target_type,
        target_key,
        country_code=catalog.country_code,
        catalog_revision=catalog.catalog_revision,
        now=now_unix_seconds(),
    )
    row = await repo.replace_answers(
        session,
        body.answers,
        country_code=catalog.country_code,
        now=now_unix_seconds(),
    )
    return _serialize(row)


@router.post(
    "/catalog/{target_type}/{target_key}/validate",
    response_model=OnboardingValidationResponse,
    summary=docs.VALIDATE_ANSWERS_SUMMARY,
    description=docs.VALIDATE_ANSWERS_DESCRIPTION,
)
async def validate_answers(
    target_type: OnboardingTargetType,
    target_key: str,
    body: OnboardingAnswersReplace,
    _admin: AdminDep,
) -> OnboardingValidationResponse:
    catalog = _catalog_or_error(target_type, target_key, body.country_code)
    issues = validate_onboarding_answers(catalog, body.answers)
    return OnboardingValidationResponse(valid=not issues, issues=issues)


@router.post(
    "/organizations/{organization_id}/{target_type}/{target_key}/submit",
    response_model=OnboardingSessionResponse,
    summary=docs.SUBMIT_SESSION_SUMMARY,
    description=docs.SUBMIT_SESSION_DESCRIPTION,
)
async def submit_session(
    organization_id: str,
    target_type: OnboardingTargetType,
    target_key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    country_code: Annotated[str, Query(min_length=2, max_length=2)] = "JM",
) -> OnboardingSessionResponse:
    await _require_targets(db, organization_id, target_type, target_key)
    repo = OnboardingRepository(db)
    session = await repo.retrieve_existing_for_update(
        organization_id,
        target_type,
        target_key,
        country_code=country_code.upper(),
        schema_version=1,
    )
    if session is None:
        _catalog_or_error(target_type, target_key, country_code)
        raise AppHTTPException(
            code="onboarding/session-not-found",
            message="Save onboarding answers before submitting them.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    catalog = _catalog_or_error(
        target_type,
        target_key,
        session.country_code,
        catalog_revision=session.catalog_revision,
    )
    issues = validate_onboarding_answers(catalog, _answers(session))
    if issues:
        raise AppHTTPException(
            code="onboarding/validation-failed",
            message=f"Onboarding answers failed validation with {len(issues)} issue(s).",
            http_status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return _serialize(await repo.submit(session, now=now_unix_seconds()))
