from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import normalize_slug
from core.logging import get_logger
from core.platform_apps import feature_prefix_for_app_slug, feature_slug_matches_app
from core.timestamps import now_unix_seconds
from db.models import App, Feature, Organization, OrgFeature, User, UserFeature
from db.repositories.apps import AppRepository
from db.repositories.features import FeatureRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.users import UserRepository
from providers.feature_flags import get_feature_flag_provider

logger = get_logger(__name__)


@dataclass(frozen=True)
class FeatureEvaluationContext:
    user_id: str | None = None
    organization_id: str | None = None
    app_id: str | None = None
    app_slug: str | None = None


class FeatureService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.features = FeatureRepository(db)

    async def create_feature(
        self,
        *,
        name: str,
        slug: str | None,
        description: str | None,
        default_enabled: bool,
        scope: str | None,
        consumer_default_enabled: bool,
        default_value: bool | None,
        app_id: str | None,
        tags: list[str],
        value_type: str | None,
        value: Any | None,
        server_side_only: bool,
        parent_feature_id: str | None,
    ) -> Feature:
        resolved_slug = normalize_slug(slug or name).replace("-", "_")
        if not resolved_slug:
            resolved_slug = "unnamed_feature"

        app = await self.require_app(app_id) if app_id else None
        self._validate_feature_app(resolved_slug, app)

        parent = await self.require_feature(parent_feature_id) if parent_feature_id else None
        self._validate_feature_parent(resolved_slug, app_id, parent)

        provider = get_feature_flag_provider()
        provider_feature = await provider.create(
            slug=resolved_slug,
            description=description,
            default_enabled=default_enabled,
            server_side_only=server_side_only,
        )
        feature = await self.features.create(
            provider=provider_feature.provider,
            provider_feature_id=provider_feature.provider_feature_id,
            provider_environment_id=provider_feature.provider_environment_state_id,
            slug=provider_feature.slug,
            name=name or provider_feature.name,
            description=description,
            enabled=default_enabled,
            scope=scope or "global",
            consumer_default_enabled=consumer_default_enabled,
            default_value=default_value if default_value is not None else False,
            app_id=app_id,
            parent_feature_id=parent_feature_id,
            tags=tags,
            value_type=value_type,
            value=value,
            server_side_only=server_side_only,
            provider_metadata=provider_feature.metadata,
        )
        logger.info(
            "features.create",
            feature_id=feature.id,
            slug=feature.slug,
            scope=feature.scope,
            app_id=feature.app_id,
            provider=feature.provider,
            provider_feature_id=feature.provider_feature_id,
        )
        return feature

    async def retrieve_feature(self, feature_id: str) -> Feature:
        return await self.require_feature(feature_id)

    async def list_features(
        self,
        *,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        app_id: str | None = None,
        root_only: bool = False,
        include_tag: str | None = None,
        exclude_tag: str | None = None,
    ) -> tuple[list[Feature], bool]:
        return await self.features.list(
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
            app_id=app_id,
            root_only=root_only,
            include_tag=include_tag,
            exclude_tag=exclude_tag,
        )

    async def search_features(
        self,
        *,
        query: str,
        limit: int = 20,
        app_id: str | None = None,
        root_only: bool = False,
        include_tag: str | None = None,
        exclude_tag: str | None = None,
    ) -> list[Feature]:
        return await self.features.search(
            query=query,
            limit=limit,
            app_id=app_id,
            root_only=root_only,
            include_tag=include_tag,
            exclude_tag=exclude_tag,
        )

    async def update_feature(
        self,
        feature_id: str,
        *,
        description: str | None,
        description_set: bool,
        enabled: bool | None,
        app_id: str | None,
        app_id_set: bool,
        consumer_default_enabled: bool | None,
        scope: str | None,
        default_value: bool | None,
        tags: list[str] | None,
        value_type: str | None,
        value: Any | None,
        value_set: bool,
        server_side_only: bool | None,
        archived: bool | None,
        parent_feature_id: str | None,
        parent_feature_id_set: bool,
    ) -> Feature:
        feature = await self.require_feature(feature_id)
        provider_update: dict[str, Any] = {}
        provider_feature_id = self._require_posthog_mapping(feature)

        if description_set:
            feature.description = description
            provider_update["description"] = description or ""
        if enabled is not None:
            feature.enabled = enabled
            provider_update["default_enabled"] = enabled
        if app_id_set:
            app = await self.require_app(app_id) if app_id else None
            self._validate_feature_app(feature.slug, app)
            feature.app_id = app_id

            parent = await self.require_feature(feature.parent_feature_id) if feature.parent_feature_id else None
            self._validate_feature_parent(feature.slug, feature.app_id, parent)
        if consumer_default_enabled is not None:
            feature.consumer_default_enabled = consumer_default_enabled
        if scope is not None:
            feature.scope = scope
        if default_value is not None:
            feature.default_value = default_value
        if tags is not None:
            feature.tags = tags
        if value_type is not None:
            feature.value_type = value_type
        if value_set:
            feature.value = value
        if server_side_only is not None:
            feature.server_side_only = server_side_only
            provider_update["server_side_only"] = server_side_only
        if archived is not None:
            feature.archived_at = now_unix_seconds() if archived else None
        if parent_feature_id_set:
            if parent_feature_id == feature.id:
                raise AppHTTPException(
                    code="feature/invalid-parent",
                    message="A feature cannot be its own parent.",
                    http_status_code=status.HTTP_400_BAD_REQUEST,
                )
            if parent_feature_id:
                parent = await self.require_feature(parent_feature_id)
                self._validate_feature_parent(feature.slug, feature.app_id, parent)
            feature.parent_feature_id = parent_feature_id

        if provider_update:
            provider = get_feature_flag_provider()
            provider_feature = await provider.update(
                provider_feature_id=provider_feature_id,
                **provider_update,
            )
            feature.provider_metadata = {
                **(feature.provider_metadata or {}),
                **provider_feature.metadata,
            }
            feature.synced_at = now_unix_seconds()

        feature.updated_at = now_unix_seconds()
        await self.db.flush()
        await self.db.refresh(feature)
        return feature

    async def delete_feature(self, feature_id: str) -> str:
        feature = await self.require_feature(feature_id)
        provider_feature_id = self._require_posthog_mapping(feature)
        provider = get_feature_flag_provider()
        await provider.delete(provider_feature_id=provider_feature_id)
        await self.features.delete(feature_id)
        logger.info("features.delete", feature_id=feature_id, slug=feature.slug)
        return feature_id

    @staticmethod
    def _require_posthog_mapping(feature: Feature) -> str:
        if feature.provider == "posthog" and feature.provider_feature_id:
            return feature.provider_feature_id
        raise AppHTTPException(
            code="feature/provider-not-configured",
            message="This feature is not mapped to PostHog.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    async def require_feature(self, feature_id: str) -> Feature:
        feature = await self.features.get_by_id(feature_id)
        if not feature:
            raise AppHTTPException(
                code="feature/not-found",
                message="No feature exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        return feature

    async def require_app(self, app_id: str) -> App:
        app = await AppRepository(self.db).get_by_id(app_id)
        if app:
            return app
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    async def require_user(self, user_id: str) -> User:
        user = await UserRepository(self.db).get_by_id(user_id)
        if not user:
            raise AppHTTPException(
                code="feature/user-not-found",
                message="No user exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        return user

    async def require_organization(self, organization_id: str) -> Organization:
        organization = await OrganizationRepository(self.db).get_by_id(organization_id)
        if not organization:
            raise AppHTTPException(
                code="feature/organization-not-found",
                message="No organization exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        return organization

    async def list_user_features(self, user_id: str) -> list[UserFeature]:
        await self.require_user(user_id)
        return await self.features.list_user_features(user_id)

    async def grant_user_feature(
        self,
        user_id: str,
        feature_id: str,
        *,
        enabled: bool = True,
        note: str | None = None,
    ) -> UserFeature:
        await self.require_user(user_id)
        feature = await self.require_feature(feature_id)
        self._enforce_user_feature_scope(feature)
        grant = await self.features.grant_user_feature(
            user_id=user_id,
            feature_id=feature_id,
            enabled=enabled,
            note=note,
        )
        grant.feature = feature
        return grant

    async def update_user_feature(
        self,
        user_id: str,
        feature_id: str,
        *,
        enabled: bool | None = None,
        note: str | None = None,
    ) -> UserFeature:
        grant = await self.features.get_user_feature(user_id=user_id, feature_id=feature_id)
        if not grant:
            raise AppHTTPException(
                code="user-feature/not-found",
                message="No feature grant exists for this user and feature.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        feature = await self.require_feature(feature_id)
        now = now_unix_seconds()

        if enabled is not None:
            grant.status = "enabled" if enabled else "disabled"
            grant.synced_at = now

        if note is not None:
            grant.note = note
        grant.updated_at = now
        await self.db.flush()
        grant.feature = feature
        return grant

    async def revoke_user_feature(self, user_id: str, feature_id: str) -> str:
        grant = await self.features.get_user_feature(user_id=user_id, feature_id=feature_id)
        if not grant:
            raise AppHTTPException(
                code="user-feature/not-found",
                message="No feature grant exists for this user and feature.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        grant_id = grant.id
        await self.features.revoke_user_feature(user_id=user_id, feature_id=feature_id)
        return grant_id

    async def list_org_features(self, organization_id: str) -> list[OrgFeature]:
        await self.require_organization(organization_id)
        return await self.features.list_org_features(organization_id)

    async def grant_org_feature(
        self,
        organization_id: str,
        feature_id: str,
        *,
        enabled: bool = True,
        note: str | None = None,
    ) -> OrgFeature:
        await self.require_organization(organization_id)
        feature = await self.require_feature(feature_id)
        self._enforce_org_feature_scope(feature)
        grant = await self.features.grant_org_feature(
            organization_id=organization_id,
            feature_id=feature_id,
            enabled=enabled,
            note=note,
        )
        grant.feature = feature
        return grant

    async def update_org_feature(
        self,
        organization_id: str,
        feature_id: str,
        *,
        enabled: bool | None = None,
        note: str | None = None,
    ) -> OrgFeature:
        grant = await self.features.get_org_feature(organization_id=organization_id, feature_id=feature_id)
        if not grant:
            raise AppHTTPException(
                code="org-feature/not-found",
                message="No feature grant exists for this organization and feature.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        feature = await self.require_feature(feature_id)
        now = now_unix_seconds()

        if enabled is not None:
            grant.status = "enabled" if enabled else "disabled"
            grant.synced_at = now

        if note is not None:
            grant.note = note
        grant.updated_at = now
        await self.db.flush()
        grant.feature = feature
        return grant

    async def revoke_org_feature(self, organization_id: str, feature_id: str) -> str:
        grant = await self.features.get_org_feature(organization_id=organization_id, feature_id=feature_id)
        if not grant:
            raise AppHTTPException(
                code="org-feature/not-found",
                message="No feature grant exists for this organization and feature.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        grant_id = grant.id
        await self.features.revoke_org_feature(organization_id=organization_id, feature_id=feature_id)
        return grant_id

    async def evaluate(self, context: FeatureEvaluationContext) -> list[Feature]:
        app = await self._resolve_app(context)
        features = await self.features.list_evaluation_features(app.id if app else None)
        uses_plan = bool(app and app.app_kind == "product" and context.organization_id)
        module_feature_ids: set[str] = set()
        gated_feature_ids: set[str] = set()

        if uses_plan and app and context.organization_id:
            module_feature_ids = await self.features.list_plan_module_feature_ids(
                context.organization_id,
                app.id,
            )
            gated_feature_ids = await self.features.list_module_feature_ids(app.id)

        features_by_id = {feature.id: feature for feature in features}

        def root_feature_id(feature: Feature) -> str:
            current = feature
            seen: set[str] = set()
            while current.parent_feature_id and current.id not in seen:
                seen.add(current.id)
                parent = features_by_id.get(current.parent_feature_id)
                if parent is None:
                    break
                current = parent
            return current.id

        decisions: dict[str, bool] = {}
        for feature in features:
            if "widget" in feature.tags:
                decisions[feature.id] = feature.default_value
            elif uses_plan and feature.app_id is not None:
                root_id = root_feature_id(feature)
                decisions[feature.id] = (
                    root_id in module_feature_ids if root_id in gated_feature_ids else feature.enabled
                )
            else:
                decisions[feature.id] = feature.enabled

        if context.organization_id:
            org_grants = await self.features.list_org_features(context.organization_id)
            self._merge_grants(decisions, org_grants)

        if context.user_id:
            user_grants = await self.features.list_user_features(context.user_id)
            self._merge_grants(decisions, user_grants)

        effective: dict[str, bool] = {}
        resolving: set[str] = set()

        def resolve(feature: Feature) -> bool:
            if feature.id in effective:
                return effective[feature.id]
            if feature.id in resolving:
                return False
            resolving.add(feature.id)
            allowed = bool(feature.enabled and decisions.get(feature.id, False))
            if feature.parent_feature_id:
                parent = features_by_id.get(feature.parent_feature_id)
                allowed = bool(parent and allowed and resolve(parent))
            resolving.remove(feature.id)
            effective[feature.id] = allowed
            return allowed

        # Provider state is the final kill switch at every level in the parent
        # chain. Identity overrides can never revive a disabled feature or one
        # whose parent is disabled.
        return [feature for feature in features if resolve(feature)]

    async def _resolve_app(self, context: FeatureEvaluationContext) -> App | None:
        if context.app_id:
            app = await AppRepository(self.db).get_by_id(context.app_id)
            if not app:
                raise AppHTTPException(
                    code="app/not-found",
                    message="App not found.",
                    http_status_code=status.HTTP_404_NOT_FOUND,
                )
            if context.app_slug and app.slug != context.app_slug:
                raise AppHTTPException(
                    code="feature/app-mismatch",
                    message="The provided app ID and app slug identify different applications.",
                    http_status_code=status.HTTP_409_CONFLICT,
                )
            return app
        if not context.app_slug:
            return None
        app = await AppRepository(self.db).get_by_slug(context.app_slug)
        if not app:
            raise AppHTTPException(
                code="app/not-found",
                message="App not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        return app

    def _validate_feature_app(self, feature_slug: str, app: App | None) -> None:
        if app is None:
            if feature_slug.startswith("platform_"):
                return
            raise AppHTTPException(
                code="feature/platform-prefix-mismatch",
                message="Platform-wide feature keys must start with 'platform_'.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )

        if feature_slug_matches_app(feature_slug, app.slug):
            return
        prefix = feature_prefix_for_app_slug(app.slug)
        raise AppHTTPException(
            code="feature/app-prefix-mismatch",
            message=f"Feature keys for {app.name} must start with '{prefix}_'.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    def _validate_feature_parent(
        self,
        feature_slug: str,
        app_id: str | None,
        parent: Feature | None,
    ) -> None:
        if parent is None:
            return
        if parent.app_id != app_id:
            raise AppHTTPException(
                code="feature/parent-app-mismatch",
                message="A parent feature must belong to the same application.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        if feature_slug.startswith(f"{parent.slug}_"):
            return
        raise AppHTTPException(
            code="feature/parent-prefix-mismatch",
            message=f"Child feature keys must start with '{parent.slug}_'.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    def _merge_grants(self, decisions: dict[str, bool], grants: list[Any]) -> None:
        for grant in grants:
            if grant.feature_id not in decisions:
                continue
            decisions[grant.feature_id] = grant.status == "enabled"

    def _enforce_user_feature_scope(self, feature: Feature) -> None:
        if feature.scope == "enterprise":
            raise AppHTTPException(
                code="feature/scope-mismatch",
                message="This feature cannot be granted to the specified target type.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

    def _enforce_org_feature_scope(self, feature: Feature) -> None:
        if feature.scope == "consumer":
            raise AppHTTPException(
                code="feature/scope-mismatch",
                message="This feature cannot be granted to the specified target type.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
