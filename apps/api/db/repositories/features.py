import time
from typing import Any

from sqlalchemy import and_, any_, func, literal, or_, select
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.elements import ColumnElement

from core.id import generate_id
from db.models import (
    ApplicationModule,
    Feature,
    OrgFeature,
    PlanModule,
    Price,
    Product,
    Subscription,
    SubscriptionItem,
    UserFeature,
)
from db.repositories.base import BaseRepository


class FeatureRepository(BaseRepository):
    async def get_by_id(self, feature_id: str) -> Feature | None:
        return await self.db.get(Feature, feature_id)

    async def get_by_slug(self, slug: str) -> Feature | None:
        stmt = select(Feature).where(Feature.slug == slug)
        return (await self.db.scalars(stmt)).first()

    async def create(
        self,
        slug: str,
        name: str,
        description: str | None,
        enabled: bool,
        scope: str,
        consumer_default_enabled: bool,
        default_value: bool,
        app_id: str | None = None,
        provider: str = "posthog",
        provider_feature_id: str | None = None,
        provider_environment_id: str | None = None,
        parent_feature_id: str | None = None,
        tags: list[str] | None = None,
        value_type: str | None = None,
        value: Any | None = None,
        server_side_only: bool = True,
        provider_metadata: dict[str, Any] | None = None,
    ) -> Feature:
        now = int(time.time())
        feature = Feature(
            id=generate_id("feature"),
            provider=provider,
            provider_feature_id=provider_feature_id,
            provider_environment_id=provider_environment_id,
            parent_feature_id=parent_feature_id,
            slug=slug,
            name=name,
            description=description,
            enabled=enabled,
            scope=scope,
            consumer_default_enabled=consumer_default_enabled,
            default_value=default_value,
            app_id=app_id,
            tags=tags or [],
            value_type=value_type,
            value=value,
            server_side_only=server_side_only,
            provider_metadata=provider_metadata,
            synced_at=now,
            created_at=now,
            updated_at=now,
        )
        self.db.add(feature)
        await self.db.flush()
        await self.db.refresh(feature)
        return feature

    async def upsert(self, provider_feature_id: str, **kwargs: Any) -> Feature:
        existing = (
            await self.db.scalars(select(Feature).where(Feature.provider_feature_id == provider_feature_id))
        ).first()
        now = int(time.time())
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            existing.updated_at = now
            await self.db.flush()
            await self.db.refresh(existing)
            return existing
        feature = Feature(provider_feature_id=provider_feature_id, **kwargs)
        self.db.add(feature)
        await self.db.flush()
        await self.db.refresh(feature)
        return feature

    async def delete(self, feature_id: str) -> None:
        from sqlalchemy import delete as sa_delete

        stmt = sa_delete(Feature).where(Feature.id == feature_id)
        await self.db.execute(stmt)

    async def grant_user_feature(
        self,
        user_id: str,
        feature_id: str,
        enabled: bool = True,
        note: str | None = None,
    ) -> UserFeature:
        """Upsert a UserFeature row (insert or update on conflict user_id+feature_id)."""
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        now = int(time.time())
        status = "enabled" if enabled else "disabled"
        new_id = generate_id("userFeature")
        stmt = (
            pg_insert(UserFeature)
            .values(
                id=new_id,
                user_id=user_id,
                feature_id=feature_id,
                status=status,
                note=note,
                synced_at=now,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=["user_id", "feature_id"],
                set_={
                    "status": status,
                    "note": note,
                    "updated_at": now,
                },
            )
            .returning(UserFeature)
        )
        result = await self.db.execute(stmt)
        row = result.scalars().first()
        await self.db.flush()
        return row  # type: ignore[return-value]

    async def revoke_user_feature(self, user_id: str, feature_id: str) -> None:
        """Delete the UserFeature row for the given user+feature pair."""
        from sqlalchemy import delete as sa_delete

        stmt = sa_delete(UserFeature).where(
            UserFeature.user_id == user_id,
            UserFeature.feature_id == feature_id,
        )
        await self.db.execute(stmt)

    async def get_user_feature(self, user_id: str, feature_id: str) -> UserFeature | None:
        stmt = select(UserFeature).where(
            UserFeature.user_id == user_id,
            UserFeature.feature_id == feature_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def search(
        self,
        query: str,
        limit: int = 20,
        app_id: str | None = None,
        root_only: bool = False,
        include_tag: str | None = None,
        exclude_tag: str | None = None,
    ) -> list[Feature]:
        pattern = f"%{query}%"
        stmt = select(Feature).where(
            or_(
                Feature.name.ilike(pattern),
                Feature.slug.ilike(pattern),
                Feature.description.ilike(pattern),
            )
        )
        if app_id is not None:
            stmt = stmt.where(Feature.app_id == app_id)
        if root_only:
            stmt = stmt.where(Feature.parent_feature_id.is_(None))
        if include_tag:
            stmt = stmt.where(literal(include_tag) == any_(Feature.tags))
        if exclude_tag:
            stmt = stmt.where(~(literal(exclude_tag) == any_(Feature.tags)))
        stmt = stmt.order_by(func.lower(Feature.name).asc(), Feature.id.asc()).limit(limit)
        return list((await self.db.scalars(stmt)).all())

    async def list_user_features(self, user_id: str) -> list[UserFeature]:
        stmt = (
            select(UserFeature)
            .where(UserFeature.user_id == user_id)
            .options(joinedload(UserFeature.feature))
            .order_by(UserFeature.created_at.desc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def grant_org_feature(
        self,
        organization_id: str,
        feature_id: str,
        enabled: bool = True,
        note: str | None = None,
    ) -> OrgFeature:
        """Upsert an OrgFeature row (insert or update on conflict organization_id+feature_id)."""
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        now = int(time.time())
        status = "enabled" if enabled else "disabled"
        new_id = generate_id("orgFeature")
        stmt = (
            pg_insert(OrgFeature)
            .values(
                id=new_id,
                organization_id=organization_id,
                feature_id=feature_id,
                status=status,
                note=note,
                synced_at=now,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                index_elements=["organization_id", "feature_id"],
                set_={
                    "status": status,
                    "note": note,
                    "synced_at": now,
                    "updated_at": now,
                },
            )
            .returning(OrgFeature)
        )
        result = await self.db.execute(stmt)
        row = result.scalars().first()
        await self.db.flush()
        return row  # type: ignore[return-value]

    async def get_org_feature(self, organization_id: str, feature_id: str) -> OrgFeature | None:
        stmt = select(OrgFeature).where(
            OrgFeature.organization_id == organization_id,
            OrgFeature.feature_id == feature_id,
        )
        return (await self.db.scalars(stmt)).first()

    async def list_org_features(self, organization_id: str) -> list[OrgFeature]:
        stmt = (
            select(OrgFeature)
            .where(OrgFeature.organization_id == organization_id)
            .options(joinedload(OrgFeature.feature))
            .order_by(OrgFeature.created_at.desc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def revoke_org_feature(self, organization_id: str, feature_id: str) -> None:
        from sqlalchemy import delete as sa_delete

        stmt = sa_delete(OrgFeature).where(
            OrgFeature.organization_id == organization_id,
            OrgFeature.feature_id == feature_id,
        )
        await self.db.execute(stmt)

    async def list_evaluation_features(self, app_id: str | None = None) -> list[Feature]:
        filters: list[ColumnElement[bool]] = [Feature.archived_at.is_(None)]
        if app_id is not None:
            filters.append(or_(Feature.app_id == app_id, Feature.app_id.is_(None)))
        stmt = select(Feature).where(*filters)
        return list((await self.db.scalars(stmt.order_by(Feature.created_at.desc()))).all())

    async def list_plan_module_feature_ids(self, organization_id: str, app_id: str) -> set[str]:
        """Root rollout flags linked to modules in an organization's active plan."""
        stmt = (
            select(ApplicationModule.feature_id)
            .join(PlanModule, PlanModule.module_id == ApplicationModule.id)
            .join(Product, Product.id == PlanModule.product_id)
            .join(Price, Price.product_id == Product.id)
            .join(SubscriptionItem, SubscriptionItem.price_id == Price.id)
            .join(Subscription, Subscription.id == SubscriptionItem.subscription_id)
            .where(
                Subscription.organization_id == organization_id,
                Subscription.app_id == app_id,
                Subscription.status.in_(("active", "trialing")),
                Product.app_id == app_id,
                ApplicationModule.app_id == app_id,
                ApplicationModule.status == "active",
                ApplicationModule.feature_id.is_not(None),
            )
        )

        return {feature_id for feature_id in (await self.db.scalars(stmt)).all() if feature_id is not None}

    async def list_module_feature_ids(self, app_id: str) -> set[str]:
        """Root flags whose access is controlled by an application module."""
        stmt = select(ApplicationModule.feature_id).where(
            ApplicationModule.app_id == app_id,
            ApplicationModule.feature_id.is_not(None),
        )
        return {feature_id for feature_id in (await self.db.scalars(stmt)).all() if feature_id is not None}

    async def list(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        app_id: str | None = None,
        root_only: bool = False,
        include_tag: str | None = None,
        exclude_tag: str | None = None,
    ) -> tuple[list[Feature], bool]:
        filters = []
        if app_id is not None:
            filters.append(Feature.app_id == app_id)
        if root_only:
            filters.append(Feature.parent_feature_id.is_(None))
        if include_tag:
            filters.append(literal(include_tag) == any_(Feature.tags))
        if exclude_tag:
            filters.append(~(literal(exclude_tag) == any_(Feature.tags)))

        name_order = func.lower(Feature.name)
        stmt = select(Feature)
        for feature_filter in filters:
            stmt = stmt.where(feature_filter)

        cursor_id = starting_after or ending_before
        if cursor_id:
            anchor = await self.get_by_id(cursor_id)
            if anchor is None:
                return [], False

            anchor_name = anchor.name.lower()
            if starting_after:
                stmt = stmt.where(
                    or_(
                        name_order > anchor_name,
                        and_(name_order == anchor_name, Feature.id > anchor.id),
                    )
                )
            else:
                stmt = stmt.where(
                    or_(
                        name_order < anchor_name,
                        and_(name_order == anchor_name, Feature.id < anchor.id),
                    )
                )
                stmt = stmt.order_by(name_order.desc(), Feature.id.desc()).limit(limit + 1)
                rows = list((await self.db.scalars(stmt)).all())

                return list(reversed(rows[:limit])), len(rows) > limit

        stmt = stmt.order_by(name_order.asc(), Feature.id.asc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())

        return rows[:limit], len(rows) > limit
