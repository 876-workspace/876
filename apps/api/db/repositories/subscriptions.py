from __future__ import annotations

from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models import App, Price, Subscription, SubscriptionItem
from db.repositories.base import BaseRepository
from services.finance_provisioning import enqueue_finance_connection_event

_LOAD_OPTIONS = (
    selectinload(Subscription.app),
    selectinload(Subscription.items).selectinload(SubscriptionItem.price).selectinload(Price.product),
)


class SubscriptionRepository(BaseRepository):
    async def get(self, org_id: str, app_id: str) -> Subscription | None:
        stmt = (
            select(Subscription)
            .options(*_LOAD_OPTIONS)
            .where(
                Subscription.organization_id == org_id,
                Subscription.app_id == app_id,
            )
        )
        return (await self.db.scalars(stmt)).first()

    async def get_by_app_slug(self, org_id: str, app_slug: str) -> Subscription | None:
        stmt = (
            select(Subscription)
            .options(*_LOAD_OPTIONS)
            .join(App, App.id == Subscription.app_id)
            .where(
                Subscription.organization_id == org_id,
                App.slug == app_slug,
            )
        )
        return (await self.db.scalars(stmt)).first()

    async def list_by_org(self, org_id: str, *, app_kind: str | None = None) -> list[Subscription]:
        stmt = select(Subscription).options(*_LOAD_OPTIONS).where(Subscription.organization_id == org_id)
        if app_kind:
            stmt = stmt.join(App, App.id == Subscription.app_id).where(App.app_kind == app_kind)
        return list((await self.db.scalars(stmt)).all())

    async def list_by_orgs(self, org_ids: list[str], *, app_kind: str | None = None) -> list[Subscription]:
        if not org_ids:
            return []
        stmt = select(Subscription).options(*_LOAD_OPTIONS).where(Subscription.organization_id.in_(org_ids))
        if app_kind:
            stmt = stmt.join(App, App.id == Subscription.app_id).where(App.app_kind == app_kind)
        return list((await self.db.scalars(stmt)).all())

    async def list_by_app(self, app_id: str) -> list[Subscription]:
        """All orgs subscribed to an app, for the Console subscriptions view."""
        stmt = (
            select(Subscription)
            .options(*_LOAD_OPTIONS)
            .where(Subscription.app_id == app_id)
            .order_by(Subscription.created_at.desc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def provision(
        self,
        org_id: str,
        app_id: str,
        price_id: str | None = None,
        *,
        status: str = "active",
    ) -> Subscription:
        """Create or re-activate an org's subscription to an app.

        ``price_id`` is only attached as a line item on first creation —
        re-provisioning a previously blocked org must not silently change
        its existing item(s).
        """
        existing = await self.get(org_id, app_id)
        now = now_unix_seconds()
        if existing is not None:
            existing.status = status
            existing.updated_at = now
            await self.db.flush()
            await enqueue_finance_connection_event(self.db, existing)
            await self.db.refresh(existing, attribute_names=["app", "items"])
            return existing

        subscription = Subscription(
            id=generate_id("subscription"),
            organization_id=org_id,
            app_id=app_id,
            status=status,
            finance_lifecycle_version=0,
            created_at=now,
            updated_at=now,
        )
        self.db.add(subscription)
        await self.db.flush()

        if price_id is not None:
            self.db.add(
                SubscriptionItem(
                    id=generate_id("subscriptionItem"),
                    subscription_id=subscription.id,
                    price_id=price_id,
                    quantity=1,
                    created_at=now,
                    updated_at=now,
                )
            )
            await self.db.flush()

        await enqueue_finance_connection_event(self.db, subscription)
        await self.db.refresh(subscription, attribute_names=["app", "items"])
        return subscription

    async def update(self, org_id: str, app_id: str, **kwargs: Any) -> Subscription | None:
        """Update status/lifecycle fields for an org's subscription."""
        now = now_unix_seconds()
        stmt = (
            update(Subscription)
            .where(
                Subscription.organization_id == org_id,
                Subscription.app_id == app_id,
            )
            .values(**kwargs, updated_at=now)
            .returning(Subscription)
        )
        row = (await self.db.scalars(stmt)).first()
        if row:
            if "status" in kwargs:
                await enqueue_finance_connection_event(self.db, row)
            await self.db.refresh(row, attribute_names=["app", "items"])
        return row

    async def update_by_id(self, subscription_id: str, **kwargs: Any) -> Subscription | None:
        """Update status/lifecycle fields for one subscription by ID."""
        now = now_unix_seconds()
        stmt = (
            update(Subscription)
            .where(Subscription.id == subscription_id)
            .values(**kwargs, updated_at=now)
            .returning(Subscription)
        )
        row = (await self.db.scalars(stmt)).first()
        if row:
            if "status" in kwargs:
                await enqueue_finance_connection_event(self.db, row)
            await self.db.refresh(row, attribute_names=["app", "items"])
        return row

    async def delete_by_id(self, subscription_id: str) -> bool:
        """Revoke embedded finance access before removing the entitlement row."""
        subscription = await self.db.get(Subscription, subscription_id)
        if subscription is None:
            return False
        subscription.status = "canceled"
        subscription.updated_at = now_unix_seconds()
        await self.db.flush()
        await enqueue_finance_connection_event(self.db, subscription)
        await self.db.delete(subscription)
        await self.db.flush()
        return True

    async def set_price(self, subscription_id: str, price_id: str) -> None:
        """Replace a subscription's single line item with a new price.

        Subscriptions in this app are single-item; swapping a plan removes
        the previous item rather than accumulating items.
        """
        now = now_unix_seconds()
        existing_items = list(
            (
                await self.db.scalars(
                    select(SubscriptionItem).where(SubscriptionItem.subscription_id == subscription_id)
                )
            ).all()
        )
        for item in existing_items:
            await self.db.delete(item)
        self.db.add(
            SubscriptionItem(
                id=generate_id("subscriptionItem"),
                subscription_id=subscription_id,
                price_id=price_id,
                quantity=1,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
