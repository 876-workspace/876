"""Idempotent plan-module entitlement seeds and subscription backfills."""

from sqlalchemy import func, select
from sqlalchemy import text as sa_text

from core.id import generate_id
from core.logging import get_logger
from core.modules import PLATFORM_MODULES
from core.platform_apps import BILLING_APP_SLUG
from core.timestamps import now_unix_seconds
from db.migrate import ensure_plan_features_cutover
from db.models import (
    App,
    ApplicationModule,
    Base,
    Feature,
    Membership,
    PlanModule,
    Price,
    Product,
    User,
)
from db.repositories.subscriptions import SubscriptionRepository
from db.session import AsyncSessionLocal

logger = get_logger(__name__)

BILLING_INTERNAL_PLAN_SLUG = "876-billing-internal"
BILLING_INTERNAL_OWNER_EMAIL = "raheemdevs@gmail.com"


async def ensure_plan_module_tables(engine: object) -> None:
    """Create module entitlement tables before products are ORM-loaded."""
    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(
            lambda connection: Base.metadata.create_all(
                connection,
                tables=[
                    Base.metadata.tables["application_modules"],
                    Base.metadata.tables["plan_modules"],
                ],
                checkfirst=True,
            )
        )
        await conn.execute(
            sa_text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_application_modules_app_feature "
                "ON application_modules (app_id, feature_id) WHERE feature_id IS NOT NULL"
            )
        )


async def seed_platform_plan_modules(engine: object) -> None:
    """Seed the module catalog and plan access, then retire legacy grants."""
    await ensure_plan_module_tables(engine)

    async with AsyncSessionLocal() as session:
        now = now_unix_seconds()
        apps_by_slug = {app.slug: app for app in (await session.scalars(select(App))).all()}
        features_by_slug = {feature.slug: feature for feature in (await session.scalars(select(Feature))).all()}
        products_by_slug = {product.slug: product for product in (await session.scalars(select(Product))).all()}
        for definition in PLATFORM_MODULES:
            app = apps_by_slug.get(definition.app_slug)
            if app is None:
                continue
            module = await session.scalar(
                select(ApplicationModule).where(
                    ApplicationModule.app_id == app.id,
                    ApplicationModule.key == definition.key,
                )
            )
            feature = features_by_slug.get(definition.feature_slug) if definition.feature_slug else None
            created = module is None
            if module is None:
                module = ApplicationModule(
                    id=generate_id("applicationModule"),
                    app_id=app.id,
                    key=definition.key,
                    name=definition.name,
                    description=definition.description,
                    feature_id=feature.id if feature else None,
                    status="active",
                    position=definition.position,
                    created_at=now,
                    updated_at=now,
                )
                session.add(module)
                await session.flush()
            # Default plan grants are bootstrap data. Once a module exists,
            # Console owns its plan assignments and startup must not restore a
            # grant that an administrator deliberately removed.
            for plan_slug in definition.included_plan_slugs if created else ():
                product = products_by_slug.get(plan_slug)
                if product is None:
                    continue
                existing = await session.scalar(
                    select(PlanModule).where(
                        PlanModule.product_id == product.id,
                        PlanModule.module_id == module.id,
                    )
                )
                if existing is None:
                    session.add(
                        PlanModule(
                            id=generate_id("planModule"),
                            product_id=product.id,
                            module_id=module.id,
                            created_at=now,
                            updated_at=now,
                        )
                    )

        await session.commit()

    async with engine.begin() as conn:  # type: ignore[attr-defined]
        await conn.run_sync(ensure_plan_features_cutover)


async def backfill_billing_plan_assignments(_engine: object) -> None:
    """Put every existing unplanned Billing subscription on the internal plan.

    Existing plan items are retained. The platform owner's organization is
    explicitly assigned to the internal plan even if it previously referenced
    another plan, matching the operational ownership requirement.
    """
    async with AsyncSessionLocal() as session:
        billing_app = (await session.scalars(select(App).where(App.slug == BILLING_APP_SLUG))).first()
        internal_product = (
            await session.scalars(select(Product).where(Product.slug == BILLING_INTERNAL_PLAN_SLUG))
        ).first()
        if billing_app is None or internal_product is None:
            logger.error("plans.billing_internal_missing")
            return

        internal_price = (
            await session.scalars(
                select(Price)
                .where(
                    Price.product_id == internal_product.id,
                    Price.active.is_(True),
                )
                .order_by(Price.created_at.asc())
            )
        ).first()
        if internal_price is None:
            logger.error("plans.billing_internal_price_missing")
            return

        subscriptions = SubscriptionRepository(session)
        existing = await subscriptions.list_by_app(billing_app.id)
        for subscription in existing:
            if not subscription.items:
                await subscriptions.set_price(subscription.id, internal_price.id)

        owner_org_id = await session.scalar(
            select(Membership.organization_id)
            .join(User, User.id == Membership.user_id)
            .where(
                func.lower(User.email) == BILLING_INTERNAL_OWNER_EMAIL,
                Membership.status == "active",
            )
            .order_by(
                (Membership.role == "owner").desc(),
                Membership.created_at.asc(),
            )
            .limit(1)
        )
        if owner_org_id:
            owner_subscription = await subscriptions.get(owner_org_id, billing_app.id)
            if owner_subscription is None:
                await subscriptions.provision(
                    owner_org_id,
                    billing_app.id,
                    internal_price.id,
                )
            elif not any(item.price_id == internal_price.id for item in owner_subscription.items):
                await subscriptions.set_price(owner_subscription.id, internal_price.id)

        await session.commit()
        logger.info(
            "plans.billing_assignments_backfilled",
            app_id=billing_app.id,
            plan_id=internal_product.id,
            subscription_count=len(existing),
            owner_org_id=owner_org_id,
        )
