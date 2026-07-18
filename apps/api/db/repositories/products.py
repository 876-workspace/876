from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models import PlanModule, Price, Product, SubscriptionItem
from db.repositories.base import BaseRepository


class ProductRepository(BaseRepository):
    async def get_by_id(self, product_id: str) -> Product | None:
        stmt = (
            select(Product)
            .options(
                selectinload(Product.prices),
                selectinload(Product.app),
                selectinload(Product.module_entitlements),
            )
            .where(Product.id == product_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def get_by_slug(self, slug: str) -> Product | None:
        stmt = (
            select(Product)
            .options(
                selectinload(Product.prices),
                selectinload(Product.app),
                selectinload(Product.module_entitlements),
            )
            .where(Product.slug == slug)
        )
        return (await self.db.scalars(stmt)).first()

    async def list_all(self, app_id: str | None = None, status: str | None = None) -> list[Product]:
        filters: list[Any] = []
        if app_id is not None:
            filters.append(Product.app_id == app_id)
        if status:
            filters.append(Product.status == status)
        stmt = (
            select(Product)
            .options(
                selectinload(Product.prices),
                selectinload(Product.app),
                selectinload(Product.module_entitlements),
            )
            .where(*filters)
            .order_by(Product.created_at.asc())
        )
        return list((await self.db.scalars(stmt)).all())

    async def create(self, **kwargs: Any) -> Product:
        product = Product(**kwargs)
        self.db.add(product)
        await self.db.flush()
        await self.db.refresh(product, attribute_names=["prices", "module_entitlements"])
        return product

    async def update(self, product_id: str, **kwargs: Any) -> Product | None:
        product = await self.db.get(Product, product_id)
        if product is None:
            return None
        for key, value in kwargs.items():
            setattr(product, key, value)
        await self.db.flush()
        await self.db.refresh(product, attribute_names=["prices", "module_entitlements"])
        return product

    async def replace_modules(self, product_id: str, module_ids: list[str]) -> Product | None:
        """Replace a plan's module set while retaining unchanged associations."""
        product = await self.get_by_id(product_id)
        if product is None:
            return None

        requested_ids = set(module_ids)
        existing_by_module_id = {entitlement.module_id: entitlement for entitlement in product.module_entitlements}
        removed_ids = set(existing_by_module_id) - requested_ids
        if removed_ids:
            await self.db.execute(
                delete(PlanModule).where(
                    PlanModule.product_id == product_id,
                    PlanModule.module_id.in_(removed_ids),
                )
            )

        now = now_unix_seconds()
        for module_id in requested_ids - set(existing_by_module_id):
            self.db.add(
                PlanModule(
                    id=generate_id("planModule"),
                    product_id=product_id,
                    module_id=module_id,
                    created_at=now,
                    updated_at=now,
                )
            )

        await self.db.flush()

        return await self.get_by_id(product_id)

    async def count_active_subscriptions(self, product_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(SubscriptionItem)
            .join(Price, Price.id == SubscriptionItem.price_id)
            .where(Price.product_id == product_id)
        )
        return (await self.db.scalar(stmt)) or 0
