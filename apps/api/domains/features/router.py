from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep
from db.session import get_db
from domains.features.schemas import (
    FeatureCreate,
    FeatureDeleted,
    FeatureResponse,
    FeatureUpdate,
    OrgFeatureDeleted,
    OrgFeatureGrant,
    OrgFeatureResponse,
    OrgFeatureUpdate,
    UserFeatureDeleted,
    UserFeatureGrant,
    UserFeatureResponse,
    UserFeatureUpdate,
)
from services.features import FeatureEvaluationContext, FeatureService

from . import docs

logger = get_logger(__name__)
router = APIRouter(prefix="/features", tags=["Features"])


def _serialize_feature(row: Any) -> FeatureResponse:
    return FeatureResponse(
        id=row.id,
        provider=row.provider,
        provider_feature_id=row.provider_feature_id,
        provider_environment_id=row.provider_environment_id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        tags=row.tags or [],
        enabled=row.enabled,
        default_value=row.default_value,
        value_type=row.value_type,
        value=row.value,
        server_side_only=row.server_side_only,
        archived_at=row.archived_at,
        parent_feature_id=row.parent_feature_id,
        provider_metadata=row.provider_metadata,
        consumer_default_enabled=row.consumer_default_enabled,
        scope=row.scope,
        app_id=row.app_id,
        synced_at=row.synced_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_user_feature(row: Any) -> UserFeatureResponse:
    return UserFeatureResponse(
        id=row.id,
        user_id=row.user_id,
        feature_id=row.feature_id,
        slug=row.feature.slug,
        status=row.status,
        note=row.note,
        synced_at=row.synced_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_org_feature(row: Any) -> OrgFeatureResponse:
    return OrgFeatureResponse(
        id=row.id,
        organization_id=row.organization_id,
        feature_id=row.feature_id,
        slug=row.feature.slug,
        status=row.status,
        note=row.note,
        synced_at=row.synced_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "",
    response_model=ListObject[FeatureResponse],
    status_code=status.HTTP_200_OK,
    summary="List features",
    description=docs.LIST_FEATURES_DESCRIPTION,
    responses=docs.LIST_FEATURES_RESPONSES,
)
async def list_features(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    app_id: Annotated[str | None, Query(alias="appId")] = None,
    search: str | None = None,
    root_only: Annotated[bool, Query(alias="rootOnly")] = False,
    include_tag: Annotated[
        str | None,
        Query(alias="includeTag", description="Return only features carrying this tag."),
    ] = None,
    exclude_tag: Annotated[
        str | None,
        Query(alias="excludeTag", description="Exclude features carrying this tag."),
    ] = None,
) -> ListObject[FeatureResponse]:
    service = FeatureService(db)
    if search:
        rows = await service.search_features(
            query=search,
            limit=limit,
            app_id=app_id,
            root_only=root_only,
            include_tag=include_tag,
            exclude_tag=exclude_tag,
        )
        has_more = False
    else:
        rows, has_more = await service.list_features(
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
            app_id=app_id,
            root_only=root_only,
            include_tag=include_tag,
            exclude_tag=exclude_tag,
        )

    return ListObject[FeatureResponse](
        data=[_serialize_feature(row) for row in rows],
        has_more=has_more,
        url="/features",
    )


@router.post(
    "",
    response_model=FeatureResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_FEATURE_SUMMARY,
    description=docs.CREATE_FEATURE_DESCRIPTION,
    responses=docs.CREATE_FEATURE_RESPONSES,
)
async def create_feature(
    _admin: AdminDep,
    body: FeatureCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FeatureResponse:
    feature = await FeatureService(db).create_feature(
        name=body.name,
        slug=body.slug,
        description=body.description,
        default_enabled=body.default_enabled,
        scope=body.scope,
        consumer_default_enabled=body.consumer_default_enabled,
        default_value=body.default_value,
        app_id=body.app_id,
        tags=body.tags,
        value_type=body.value_type,
        value=body.value,
        server_side_only=body.server_side_only,
        parent_feature_id=body.parent_feature_id,
    )
    await db.commit()
    return _serialize_feature(feature)


@router.get(
    "/evaluate",
    response_model=ListObject[FeatureResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.EVALUATE_FEATURES_SUMMARY,
    description=docs.EVALUATE_FEATURES_DESCRIPTION,
    responses=docs.EVALUATE_FEATURES_RESPONSES,
)
async def evaluate_features(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: Annotated[str | None, Query(alias="userId")] = None,
    organization_id: Annotated[str | None, Query(alias="organizationId")] = None,
    app_id: Annotated[str | None, Query(alias="appId")] = None,
    app_slug: Annotated[str | None, Query(alias="appSlug")] = None,
) -> ListObject[FeatureResponse]:
    rows = await FeatureService(db).evaluate(
        FeatureEvaluationContext(
            user_id=user_id,
            organization_id=organization_id,
            app_id=app_id,
            app_slug=app_slug,
        )
    )

    return ListObject[FeatureResponse](
        data=[_serialize_feature(row) for row in rows],
        has_more=False,
        url="/features/evaluate",
    )


@router.get(
    "/{feature_id}",
    response_model=FeatureResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve feature",
    description=docs.RETRIEVE_FEATURE_DESCRIPTION,
    responses=docs.RETRIEVE_FEATURE_RESPONSES,
)
async def retrieve_feature(
    feature_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FeatureResponse:
    feature = await FeatureService(db).retrieve_feature(feature_id)
    return _serialize_feature(feature)


@router.patch(
    "/{feature_id}",
    response_model=FeatureResponse,
    status_code=status.HTTP_200_OK,
    summary="Update feature metadata",
    description=docs.UPDATE_FEATURE_DESCRIPTION,
    responses=docs.UPDATE_FEATURE_RESPONSES,
)
async def update_feature(
    feature_id: str,
    _admin: AdminDep,
    body: FeatureUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FeatureResponse:
    fields_set = body.model_fields_set or set()
    feature = await FeatureService(db).update_feature(
        feature_id,
        description=body.description,
        description_set="description" in fields_set,
        enabled=body.enabled,
        app_id=body.app_id,
        app_id_set="app_id" in fields_set,
        consumer_default_enabled=body.consumer_default_enabled,
        scope=body.scope,
        default_value=body.default_value,
        tags=body.tags,
        value_type=body.value_type,
        value=body.value,
        value_set="value" in fields_set,
        server_side_only=body.server_side_only,
        archived=body.archived,
        parent_feature_id=body.parent_feature_id,
        parent_feature_id_set="parent_feature_id" in fields_set,
    )
    await db.commit()
    return _serialize_feature(feature)


@router.delete(
    "/{feature_id}",
    response_model=FeatureDeleted,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_FEATURE_SUMMARY,
    description=docs.DELETE_FEATURE_DESCRIPTION,
    responses=docs.DELETE_FEATURE_RESPONSES,
)
async def delete_feature(
    feature_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FeatureDeleted:
    deleted_id = await FeatureService(db).delete_feature(feature_id)
    await db.commit()
    return FeatureDeleted(id=deleted_id)


# ---------------------------------------------------------------------------
# User feature grant routes
# ---------------------------------------------------------------------------


@router.get(
    "/users/{user_id}/features",
    response_model=ListObject[UserFeatureResponse],
    status_code=status.HTTP_200_OK,
    summary="List user feature grants",
    description="Returns all feature grants for a user. **Admin only**.",
    responses=docs.LIST_FEATURES_RESPONSES,
)
async def list_user_features(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[UserFeatureResponse]:
    rows = await FeatureService(db).list_user_features(user_id)
    return ListObject[UserFeatureResponse](
        data=[_serialize_user_feature(row) for row in rows],
        has_more=False,
        url=f"/features/users/{user_id}/features",
    )


@router.post(
    "/users/{user_id}/features",
    response_model=UserFeatureResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.GRANT_USER_FEATURE_SUMMARY,
    description=docs.GRANT_USER_FEATURE_DESCRIPTION,
    responses=docs.GRANT_USER_FEATURE_RESPONSES,
)
async def grant_user_feature(
    user_id: str,
    body: UserFeatureGrant,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserFeatureResponse:
    grant = await FeatureService(db).grant_user_feature(
        user_id=user_id,
        feature_id=body.feature_id,
        enabled=body.enabled,
        note=body.note,
    )
    await db.commit()
    logger.info("features.user_grant", user_id=user_id, feature_id=body.feature_id, enabled=body.enabled)
    return _serialize_user_feature(grant)


@router.patch(
    "/users/{user_id}/features/{feature_id}",
    response_model=UserFeatureResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_USER_FEATURE_SUMMARY,
    description=docs.UPDATE_USER_FEATURE_DESCRIPTION,
    responses=docs.UPDATE_USER_FEATURE_RESPONSES,
)
async def update_user_feature(
    user_id: str,
    feature_id: str,
    body: UserFeatureUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserFeatureResponse:
    grant = await FeatureService(db).update_user_feature(
        user_id=user_id,
        feature_id=feature_id,
        enabled=body.enabled,
        note=body.note,
    )
    await db.commit()
    logger.info("features.user_update", user_id=user_id, feature_id=feature_id, status=grant.status)
    return _serialize_user_feature(grant)


@router.delete(
    "/users/{user_id}/features/{feature_id}",
    response_model=UserFeatureDeleted,
    status_code=status.HTTP_200_OK,
    summary=docs.REVOKE_USER_FEATURE_SUMMARY,
    description=docs.REVOKE_USER_FEATURE_DESCRIPTION,
    responses=docs.REVOKE_USER_FEATURE_RESPONSES,
)
async def revoke_user_feature(
    user_id: str,
    feature_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserFeatureDeleted:
    grant_id = await FeatureService(db).revoke_user_feature(user_id=user_id, feature_id=feature_id)
    await db.commit()
    logger.info("features.user_revoke", user_id=user_id, feature_id=feature_id)
    return UserFeatureDeleted(id=grant_id)


# ---------------------------------------------------------------------------
# Organization feature grant routes
# ---------------------------------------------------------------------------


@router.get(
    "/organizations/{organization_id}/features",
    response_model=ListObject[OrgFeatureResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_ORG_FEATURES_SUMMARY,
    description=docs.LIST_ORG_FEATURES_DESCRIPTION,
    responses=docs.LIST_ORG_FEATURES_RESPONSES,
)
async def list_org_features(
    organization_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[OrgFeatureResponse]:
    rows = await FeatureService(db).list_org_features(organization_id)
    return ListObject[OrgFeatureResponse](
        data=[_serialize_org_feature(row) for row in rows],
        has_more=False,
        url=f"/features/organizations/{organization_id}/features",
    )


@router.post(
    "/organizations/{organization_id}/features",
    response_model=OrgFeatureResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.GRANT_ORG_FEATURE_SUMMARY,
    description=docs.GRANT_ORG_FEATURE_DESCRIPTION,
    responses=docs.GRANT_ORG_FEATURE_RESPONSES,
)
async def grant_org_feature(
    organization_id: str,
    body: OrgFeatureGrant,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgFeatureResponse:
    grant = await FeatureService(db).grant_org_feature(
        organization_id=organization_id,
        feature_id=body.feature_id,
        enabled=body.enabled,
        note=body.note,
    )
    await db.commit()
    logger.info(
        "features.org_grant",
        organization_id=organization_id,
        feature_id=body.feature_id,
        enabled=body.enabled,
    )
    return _serialize_org_feature(grant)


@router.patch(
    "/organizations/{organization_id}/features/{feature_id}",
    response_model=OrgFeatureResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_ORG_FEATURE_SUMMARY,
    description=docs.UPDATE_ORG_FEATURE_DESCRIPTION,
    responses=docs.UPDATE_ORG_FEATURE_RESPONSES,
)
async def update_org_feature(
    organization_id: str,
    feature_id: str,
    body: OrgFeatureUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgFeatureResponse:
    grant = await FeatureService(db).update_org_feature(
        organization_id=organization_id,
        feature_id=feature_id,
        enabled=body.enabled,
        note=body.note,
    )
    await db.commit()
    logger.info("features.org_update", organization_id=organization_id, feature_id=feature_id, status=grant.status)
    return _serialize_org_feature(grant)


@router.delete(
    "/organizations/{organization_id}/features/{feature_id}",
    response_model=OrgFeatureDeleted,
    status_code=status.HTTP_200_OK,
    summary=docs.REVOKE_ORG_FEATURE_SUMMARY,
    description=docs.REVOKE_ORG_FEATURE_DESCRIPTION,
    responses=docs.REVOKE_ORG_FEATURE_RESPONSES,
)
async def revoke_org_feature(
    organization_id: str,
    feature_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrgFeatureDeleted:
    grant_id = await FeatureService(db).revoke_org_feature(
        organization_id=organization_id,
        feature_id=feature_id,
    )
    await db.commit()
    logger.info("features.org_revoke", organization_id=organization_id, feature_id=feature_id)
    return OrgFeatureDeleted(id=grant_id)
