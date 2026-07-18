from sqlalchemy import select

from db.models import Country, Currency, Region
from db.repositories.base import BaseRepository


class CountryRepository(BaseRepository):
    async def list_enabled(self) -> list[Country]:
        stmt = select(Country).where(Country.is_enabled.is_(True)).order_by(Country.name)
        return list((await self.db.scalars(stmt)).all())

    async def get_by_code(self, code: str) -> Country | None:
        return await self.db.get(Country, code.upper())


class RegionRepository(BaseRepository):
    async def list_by_country(self, country_code: str) -> list[Region]:
        stmt = (
            select(Region)
            .where(Region.country_code == country_code.upper(), Region.is_enabled.is_(True))
            .order_by(Region.name)
        )
        return list((await self.db.scalars(stmt)).all())

    async def get_by_id(self, region_id: str) -> Region | None:
        return await self.db.get(Region, region_id)


class CurrencyRepository(BaseRepository):
    async def list_enabled(self) -> list[Currency]:
        stmt = select(Currency).where(Currency.is_enabled.is_(True)).order_by(Currency.code)
        return list((await self.db.scalars(stmt)).all())

    async def get_by_code(self, code: str) -> Currency | None:
        return await self.db.get(Currency, code.upper())
