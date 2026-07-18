from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from db.models import Price, Product
from db.repositories.base import BaseRepository


class PriceRepository(BaseRepository):
    async def get_by_id(self, price_id: str) -> Price | None:
        return await self.db.get(Price, price_id)

    async def list_by_product(self, product_id: str) -> list[Price]:
        stmt = select(Price).where(Price.product_id == product_id).order_by(Price.created_at.asc())
        return list((await self.db.scalars(stmt)).all())

    async def get_default_for_app(self, app_id: str) -> Price | None:
        """The price a new org subscribes to when none is specified — the
        oldest active price on the oldest active product scoped to this app."""
        stmt = (
            select(Price)
            .options(selectinload(Price.product))
            .join(Product, Product.id == Price.product_id)
            .where(Product.app_id == app_id, Product.status == "active", Price.status == "active")
            .order_by(Product.created_at.asc(), Price.created_at.asc())
            .limit(1)
        )
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> Price:
        price = Price(**kwargs)
        self.db.add(price)
        await self.db.flush()
        await self.db.refresh(price)
        return price

    async def update(self, price_id: str, **kwargs: Any) -> Price | None:
        price = await self.db.get(Price, price_id)
        if price is None:
            return None
        for key, value in kwargs.items():
            setattr(price, key, value)
        await self.db.flush()
        await self.db.refresh(price)
        return price
