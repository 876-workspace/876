import secrets
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.platform_apps import feature_prefix_for_app_slug
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.repositories.api_keys import ApiKeyRepository
from db.repositories.apps import AppRepository
from db.repositories.features import FeatureRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.session import get_db
from domains.apps.schemas import (
    ApiKeyCreate,
    ApiKeyCreatedResponse,
    ApiKeyDeleteResponse,
    ApiKeyResponse,
    ApiKeyUpdate,
    AppCreate,
    AppCreatedResponse,
    AppDeleteResponse,
    AppPublicResponse,
    AppResponse,
    AppUpdate,
)
from domains.features.router import _serialize_feature
from domains.features.schemas import FeatureResponse
from domains.oauth.scopes import supported_scopes
from domains.organizations.router import _serialize_subscription
from domains.organizations.schemas import SubscriptionResponse
from services.finance_provisioning import reconcile_finance_connections
from utils.security_helpers import (
    generate_api_key,
    generate_client_id,
    generate_client_secret,
    hash_api_key,
    hash_client_secret,
    is_redirect_uri_safe,
    slugify_registered_app_name,
)

from . import docs

router = APIRouter(prefix="/apps", tags=["Apps"])
public_router = APIRouter(prefix="/apps", tags=["Apps"])

logger = get_logger(__name__)

ALLOWED_SCOPES = set(supported_scopes())


def _serialize_app(row: Any) -> AppResponse:
    return AppResponse(
        id=row.id,
        name=row.name,
        slug=row.slug,
        feature_prefix=feature_prefix_for_app_slug(row.slug),
        organization_id=row.organization_id,
        client_id=row.client_id,
        client_type=row.client_type,
        app_kind=row.app_kind,
        status=getattr(row, "status", "active"),
        allowed_redirect_uris=row.allowed_redirect_uris or [],
        allowed_logout_uris=row.allowed_logout_uris or [],
        logo_url=row.logo_url,
        homepage_url=row.homepage_url,
        type=row.type,
        scopes_allowed=row.scopes_allowed or [],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "",
    response_model=ListObject[AppResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_APPS_SUMMARY,
    description=docs.LIST_APPS_DESCRIPTION,
    responses=docs.LIST_APPS_RESPONSES,
)
async def list_apps(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    organizationId: Annotated[str | None, Query(alias="organizationId")] = None,
    app_kind: Annotated[str | None, Query(alias="appKind")] = None,
    client_type: Annotated[str | None, Query(alias="clientType")] = None,
    app_status: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[AppResponse]:
    repo = AppRepository(db)

    if organizationId:
        rows, has_more = await repo.list_by_org(
            organization_id=organizationId,
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
            status=app_status,
        )
    else:
        # No filter — require admin (internal key) to list all registered apps
        settings = get_settings()
        internal_key = request.headers.get("x-internal-key")
        if not settings.internal_key or internal_key != settings.internal_key:
            raise AppHTTPException(
                code="provider/invalid-request",
                message="organizationId is required.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
        rows, has_more = await repo.list_all(
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
            app_kind=app_kind,
            client_type=client_type,
            status=app_status,
        )

    return ListObject[AppResponse](
        data=[_serialize_app(row) for row in rows],
        has_more=has_more,
        url="/apps",
    )


@router.post(
    "",
    response_model=AppCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_APP_SUMMARY,
    description=docs.CREATE_APP_DESCRIPTION,
    responses=docs.CREATE_APP_RESPONSES,
)
async def create_app_endpoint(
    request: Request,
    body: AppCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppCreatedResponse:
    if not body.organization_id:
        settings = get_settings()
        internal_key = request.headers.get("x-internal-key")
        if not settings.internal_key or internal_key != settings.internal_key:
            raise AppHTTPException(
                code="provider/invalid-request",
                message="organizationId is required.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

    scopes = body.scopes_allowed if body.scopes_allowed is not None else ["openid", "profile", "email"]
    for s in scopes:
        if s not in ALLOWED_SCOPES:
            raise AppHTTPException(
                code="provider/invalid-scope",
                message="The requested scope is not allowed for this app.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

    redirect_uris = body.redirect_uris or []
    for uri in redirect_uris:
        if not is_redirect_uri_safe(uri):
            raise AppHTTPException(
                code="provider/invalid-redirect-uri",
                message="The redirect URI is not registered for this app.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

    client_secret = generate_client_secret() if body.client_type == "confidential" else None
    client_secret_hash = hash_client_secret(client_secret) if client_secret else None

    slug = f"{slugify_registered_app_name(body.name) or 'app'}-{secrets.token_hex(4)}"

    repo = AppRepository(db)
    now = now_unix_seconds()
    app = await repo.create(
        id=generate_id("registeredApp"),
        name=body.name.strip(),
        slug=slug,
        organization_id=body.organization_id,
        client_id=generate_client_id(),
        client_secret_hash=client_secret_hash,
        client_type=body.client_type,
        app_kind=body.app_kind,
        status=body.status,
        allowed_redirect_uris=redirect_uris,
        allowed_logout_uris=[],
        logo_url=body.logo_url,
        homepage_url=body.homepage_url,
        scopes_allowed=scopes,
        created_at=now,
        updated_at=now,
    )

    logger.info(
        "apps.create",
        app_id=app.id,
        slug=app.slug,
        client_id=app.client_id,
        client_type=app.client_type,
        organization_id=app.organization_id,
    )
    res = _serialize_app(app)
    return AppCreatedResponse(**res.model_dump(), clientSecret=client_secret)


@public_router.get(
    "/public/{client_id}",
    response_model=AppPublicResponse,
    summary=docs.GET_APP_PUBLIC_SUMMARY,
    description=docs.GET_APP_PUBLIC_DESCRIPTION,
    responses=docs.GET_APP_PUBLIC_RESPONSES,
)
async def get_app_public(
    client_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppPublicResponse:
    app = await AppRepository(db).get_by_client_id(client_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=404,
        )
    return AppPublicResponse(
        name=app.name,
        logo_url=app.logo_url,
        app_kind=app.app_kind,  # type: ignore[arg-type]
    )


@router.get(
    "/current",
    response_model=AppResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_CURRENT_APP_SUMMARY,
    description=docs.RETRIEVE_CURRENT_APP_DESCRIPTION,
    responses=docs.RETRIEVE_CURRENT_APP_RESPONSES,
)
async def retrieve_current_app(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppResponse:
    app_id = getattr(request.state, "app_id", None)
    app = await AppRepository(db).get_by_id(app_id) if app_id else None
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_app(app)


@router.get(
    "/{app_id}",
    response_model=AppResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_APP_SUMMARY,
    description=docs.RETRIEVE_APP_DESCRIPTION,
    responses=docs.RETRIEVE_APP_RESPONSES,
)
async def retrieve_app(
    app_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppResponse:
    app = await AppRepository(db).get_by_id(app_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_app(app)


@router.patch(
    "/{app_id}",
    response_model=AppResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_APP_SUMMARY,
    description=docs.UPDATE_APP_DESCRIPTION,
    responses=docs.UPDATE_APP_RESPONSES,
)
async def update_app(
    app_id: str,
    body: AppUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> AppResponse:
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="No fields to update.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    updates["updated_at"] = now_unix_seconds()
    app = await AppRepository(db).update(app_id, **updates)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if "status" in updates:
        await reconcile_finance_connections(db, app_id=app_id, limit=None)
    logger.info("apps.update", app_id=app_id, changed_fields=sorted(updates.keys()))
    return _serialize_app(app)


@router.delete(
    "/{app_id}",
    response_model=AppDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_APP_SUMMARY,
    description=docs.DELETE_APP_DESCRIPTION,
    responses=docs.DELETE_APP_RESPONSES,
)
async def delete_app(
    app_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> AppDeleteResponse:
    await reconcile_finance_connections(
        db,
        app_id=app_id,
        limit=None,
        desired_status="REVOKED",
    )
    deleted = await AppRepository(db).delete(app_id)
    if not deleted:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("apps.delete", app_id=app_id)
    return AppDeleteResponse(id=app_id)


# ─── Features sub-resource ────────────────────────────────────────────────────


@router.get(
    "/{app_id}/features",
    response_model=ListObject[FeatureResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_APP_FEATURES_SUMMARY,
    description=docs.LIST_APP_FEATURES_DESCRIPTION,
    responses=docs.LIST_APP_FEATURES_RESPONSES,
)
async def list_app_features(
    app_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
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
    app = await AppRepository(db).get_by_id(app_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    rows, has_more = await FeatureRepository(db).list(
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
        url=f"/apps/{app_id}/features",
    )


# ─── Subscriptions sub-resource ────────────────────────────────────────────────


@router.get(
    "/{app_id}/subscriptions",
    response_model=list[SubscriptionResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_APP_SUBSCRIPTIONS_SUMMARY,
    description=docs.LIST_APP_SUBSCRIPTIONS_DESCRIPTION,
    responses=docs.LIST_APP_SUBSCRIPTIONS_RESPONSES,
)
async def list_app_subscriptions(
    app_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SubscriptionResponse]:
    app = await AppRepository(db).get_by_id(app_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    rows = await SubscriptionRepository(db).list_by_app(app_id)
    return [_serialize_subscription(row) for row in rows]


# ─── API Key sub-resource ──────────────────────────────────────────────────────


@router.post(
    "/{app_id}/api-keys",
    response_model=ApiKeyCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_API_KEY_SUMMARY,
    description=docs.CREATE_API_KEY_DESCRIPTION,
    responses=docs.CREATE_API_KEY_RESPONSES,
)
async def create_api_key(
    app_id: str,
    body: ApiKeyCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ApiKeyCreatedResponse:
    app = await AppRepository(db).get_by_id(app_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    plaintext = generate_api_key()
    now = now_unix_seconds()
    record = await ApiKeyRepository(db).create(
        id=generate_id("apiKey"),
        app_id=app_id,
        key_hash=hash_api_key(plaintext),
        name=body.name,
        expires_at=body.expires_at,
        created_at=now,
    )

    logger.info(
        "apps.api_key.create",
        app_id=app_id,
        key_id=record.id,
        name=record.name,
        expires_at=record.expires_at,
    )
    return ApiKeyCreatedResponse(
        id=record.id,
        app_id=record.app_id,
        name=record.name,
        revoked=record.revoked,
        expires_at=record.expires_at,
        last_used_at=record.last_used_at,
        created_at=record.created_at,
        key=plaintext,
    )


@router.get(
    "/{app_id}/api-keys",
    response_model=ListObject[ApiKeyResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_API_KEYS_SUMMARY,
    description=docs.LIST_API_KEYS_DESCRIPTION,
    responses=docs.LIST_API_KEYS_RESPONSES,
)
async def list_api_keys(
    app_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
) -> ListObject[ApiKeyResponse]:
    app = await AppRepository(db).get_by_id(app_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    keys, has_more = await ApiKeyRepository(db).list_by_app(
        app_id=app_id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
    )

    return ListObject[ApiKeyResponse](
        data=[ApiKeyResponse.model_validate(k) for k in keys],
        has_more=has_more,
        url=f"/apps/{app_id}/api-keys",
    )


@router.patch(
    "/{app_id}/api-keys/{key_id}",
    response_model=ApiKeyResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_API_KEY_SUMMARY,
    description=docs.UPDATE_API_KEY_DESCRIPTION,
    responses=docs.UPDATE_API_KEY_RESPONSES,
)
async def update_api_key(
    app_id: str,
    key_id: str,
    body: ApiKeyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ApiKeyResponse:
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="No fields to update.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    record = await ApiKeyRepository(db).update(key_id, app_id=app_id, **updates)
    if not record:
        raise AppHTTPException(
            code="api-key/not-found",
            message="API key not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return ApiKeyResponse.model_validate(record)


@router.post(
    "/{app_id}/api-keys/{key_id}/revoke",
    response_model=ApiKeyResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.REVOKE_API_KEY_SUMMARY,
    description=docs.REVOKE_API_KEY_DESCRIPTION,
    responses=docs.REVOKE_API_KEY_RESPONSES,
)
async def revoke_api_key(
    app_id: str,
    key_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ApiKeyResponse:
    record = await ApiKeyRepository(db).revoke(key_id, app_id=app_id)
    if not record:
        raise AppHTTPException(
            code="api-key/not-found",
            message="API key not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("apps.api_key.revoke", app_id=app_id, key_id=key_id)
    return ApiKeyResponse.model_validate(record)


@router.delete(
    "/{app_id}/api-keys/{key_id}",
    response_model=ApiKeyDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_API_KEY_SUMMARY,
    description=docs.DELETE_API_KEY_DESCRIPTION,
    responses=docs.DELETE_API_KEY_RESPONSES,
)
async def delete_api_key(
    app_id: str,
    key_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> ApiKeyDeleteResponse:
    deleted = await ApiKeyRepository(db).delete(key_id, app_id=app_id)
    if not deleted:
        raise AppHTTPException(
            code="api-key/not-found",
            message="API key not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("apps.api_key.delete", app_id=app_id, key_id=key_id)
    return ApiKeyDeleteResponse(id=key_id)
