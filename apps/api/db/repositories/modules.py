from typing import cast

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import ApplicationModule


class ModuleRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_app(
        self,
        app_id: str,
        *,
        include_archived: bool = False,
    ) -> list[ApplicationModule]:
        statement = (
            select(ApplicationModule)
            .where(ApplicationModule.app_id == app_id)
            .options(selectinload(ApplicationModule.feature))
            .order_by(
                ApplicationModule.position.asc(),
                func.lower(ApplicationModule.name).asc(),
                ApplicationModule.id.asc(),
            )
        )
        if not include_archived:
            statement = statement.where(ApplicationModule.status == "active")
        return list((await self.db.scalars(statement)).all())

    async def retrieve(self, module_id: str) -> ApplicationModule | None:
        return cast(
            ApplicationModule | None,
            await self.db.scalar(
                select(ApplicationModule)
                .where(ApplicationModule.id == module_id)
                .options(selectinload(ApplicationModule.feature))
            ),
        )

    async def retrieve_by_key(self, app_id: str, key: str) -> ApplicationModule | None:
        return cast(
            ApplicationModule | None,
            await self.db.scalar(
                select(ApplicationModule).where(
                    ApplicationModule.app_id == app_id,
                    ApplicationModule.key == key,
                )
            ),
        )

    async def retrieve_by_feature(self, app_id: str, feature_id: str) -> ApplicationModule | None:
        return cast(
            ApplicationModule | None,
            await self.db.scalar(
                select(ApplicationModule).where(
                    ApplicationModule.app_id == app_id,
                    ApplicationModule.feature_id == feature_id,
                )
            ),
        )

    async def create(self, **values: object) -> ApplicationModule:
        row = ApplicationModule(**values)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def list_entitled(
        self,
        organization_id: str,
        app_id: str,
    ) -> list[ApplicationModule]:
        from db.models import PlanModule, Price, Product, Subscription, SubscriptionItem

        statement = (
            select(ApplicationModule)
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
            )
            .options(selectinload(ApplicationModule.feature))
            .distinct()
            .order_by(ApplicationModule.position.asc(), ApplicationModule.id.asc())
        )
        return list((await self.db.scalars(statement)).all())
