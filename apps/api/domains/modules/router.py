from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import App, Feature, PlanModule
from db.repositories.modules import ModuleRepository
from db.session import get_db
from domains.modules.schemas import (
    ModuleCreate,
    ModuleDeleteResponse,
    ModuleResponse,
    ModuleUpdate,
)

from . import docs

router = APIRouter(prefix="/modules", tags=["Modules"])
logger = get_logger(__name__)


def _serialize(row: object) -> ModuleResponse:
    response = ModuleResponse.model_validate(row)
    feature = getattr(row, "feature", None)
    return response.model_copy(update={"feature_slug": feature.slug if feature else None})


async def _validate_feature(
    db: AsyncSession,
    *,
    app_id: str,
    feature_id: str | None,
    current_module_id: str | None = None,
) -> Feature | None:
    if feature_id is None:
        return None
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise AppHTTPException(
            code="module/feature-not-found",
            message="The selected rollout feature flag does not exist.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    if feature.app_id != app_id or feature.parent_feature_id is not None:
        raise AppHTTPException(
            code="module/feature-invalid",
            message="A module rollout flag must be a root feature owned by the same application.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    linked_module = await ModuleRepository(db).retrieve_by_feature(app_id, feature_id)
    if linked_module is not None and linked_module.id != current_module_id:
        raise AppHTTPException(
            code="module/feature-in-use",
            message="The selected rollout feature flag is already linked to another module.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    return feature


@router.get(
    "",
    response_model=ListObject[ModuleResponse],
    summary=docs.LIST_MODULES_SUMMARY,
    description=docs.LIST_MODULES_DESCRIPTION,
)
async def list_modules(
    app_id: Annotated[str, Query(alias="appId")],
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    include_archived: Annotated[bool, Query(alias="includeArchived")] = False,
) -> ListObject[ModuleResponse]:
    if await db.get(App, app_id) is None:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    rows = await ModuleRepository(db).list_for_app(app_id, include_archived=include_archived)
    return ListObject(data=[_serialize(row) for row in rows], has_more=False, url="/modules")


@router.get(
    "/entitlements",
    response_model=ListObject[ModuleResponse],
    summary=docs.EVALUATE_MODULES_SUMMARY,
    description=docs.EVALUATE_MODULES_DESCRIPTION,
)
async def list_entitled_modules(
    organization_id: Annotated[str, Query(alias="organizationId")],
    app_id: Annotated[str, Query(alias="appId")],
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ListObject[ModuleResponse]:
    rows = await ModuleRepository(db).list_entitled(organization_id, app_id)
    return ListObject(
        data=[_serialize(row) for row in rows],
        has_more=False,
        url="/modules/entitlements",
    )


@router.post(
    "",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MODULE_SUMMARY,
    description=docs.CREATE_MODULE_DESCRIPTION,
)
async def create_module(
    body: ModuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ModuleResponse:
    app = await db.get(App, body.app_id)
    if app is None or app.app_kind != "product":
        raise AppHTTPException(
            code="module/app-invalid",
            message="Modules can only belong to product applications.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    repository = ModuleRepository(db)
    if await repository.retrieve_by_key(body.app_id, body.key):
        raise AppHTTPException(
            code="module/duplicate-key",
            message="A module with this key already exists for the application.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    feature = await _validate_feature(db, app_id=body.app_id, feature_id=body.feature_id)
    now = now_unix_seconds()
    row = await repository.create(
        id=generate_id("applicationModule"),
        app_id=body.app_id,
        key=body.key,
        name=body.name.strip(),
        description=body.description,
        feature_id=feature.id if feature else None,
        status="active",
        position=body.position,
        created_at=now,
        updated_at=now,
    )
    row.feature = feature
    logger.info("modules.create", module_id=row.id, app_id=row.app_id, key=row.key)
    return _serialize(row)


@router.get("/{module_id}", response_model=ModuleResponse)
async def retrieve_module(
    module_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ModuleResponse:
    row = await ModuleRepository(db).retrieve(module_id)
    if row is None:
        raise AppHTTPException(
            code="module/not-found",
            message="Application module not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize(row)


@router.patch(
    "/{module_id}",
    response_model=ModuleResponse,
    summary=docs.UPDATE_MODULE_SUMMARY,
    description=docs.UPDATE_MODULE_DESCRIPTION,
)
async def update_module(
    module_id: str,
    body: ModuleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ModuleResponse:
    repository = ModuleRepository(db)
    row = await repository.retrieve(module_id)
    if row is None:
        raise AppHTTPException(
            code="module/not-found",
            message="Application module not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    provided = body.model_fields_set
    if "feature_id" in provided:
        feature = await _validate_feature(
            db,
            app_id=row.app_id,
            feature_id=body.feature_id,
            current_module_id=row.id,
        )
        row.feature_id = feature.id if feature else None
        row.feature = feature
    if body.name is not None:
        row.name = body.name.strip()
    if "description" in provided:
        row.description = body.description
    if body.position is not None:
        row.position = body.position
    if body.status is not None:
        row.status = body.status
        if body.status == "archived":
            await db.execute(delete(PlanModule).where(PlanModule.module_id == row.id))
    row.updated_at = now_unix_seconds()
    await db.flush()
    logger.info("modules.update", module_id=row.id, status=row.status)
    return _serialize(row)


@router.delete("/{module_id}", response_model=ModuleDeleteResponse)
async def archive_module(
    module_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ModuleDeleteResponse:
    row = await ModuleRepository(db).retrieve(module_id)
    if row is None:
        raise AppHTTPException(
            code="module/not-found",
            message="Application module not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    row.status = "archived"
    row.updated_at = now_unix_seconds()
    await db.execute(delete(PlanModule).where(PlanModule.module_id == row.id))
    await db.flush()
    return ModuleDeleteResponse(id=row.id)
