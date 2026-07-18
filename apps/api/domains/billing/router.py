from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import App, BillingAccount, Price, Subscription, SubscriptionItem
from db.repositories.billing_accounts import BillingAccountRepository
from db.repositories.subscriptions import _LOAD_OPTIONS, SubscriptionRepository
from db.session import get_db
from domains.billing.schemas import (
    BillingAccountCreate,
    BillingAccountDeleteResponse,
    BillingAccountResponse,
    BillingAccountUpdate,
    BillingCustomerSyncDispatchResponse,
    BillingCustomerSyncReconcileResponse,
    FinanceProvisioningDispatchResponse,
    FinanceProvisioningReconcileRequest,
    FinanceProvisioningReconcileResponse,
    SubscriptionCreate,
    SubscriptionDeleteResponse,
    SubscriptionItemCreate,
    SubscriptionItemDeleteResponse,
    SubscriptionItemUpdate,
    SubscriptionUpdate,
)
from domains.organizations.router import _serialize_subscription
from domains.organizations.schemas import (
    SubscriptionItemResponse,
    SubscriptionResponse,
)
from services.billing_customer_dispatch import dispatch_billing_customer_sync_once
from services.billing_customer_sync import enqueue_reconcile_all
from services.finance_provisioning import reconcile_finance_connections
from services.finance_provisioning_dispatch import dispatch_finance_provisioning_once

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post(
    "/customer-sync/dispatch",
    response_model=BillingCustomerSyncDispatchResponse,
)
async def dispatch_billing_customer_sync(
    _admin: AdminDep,
) -> BillingCustomerSyncDispatchResponse:
    summary = await dispatch_billing_customer_sync_once()
    return BillingCustomerSyncDispatchResponse(
        claimed=summary.claimed,
        delivered=summary.delivered,
        failed=summary.failed,
        configured=summary.configured,
    )


@router.post(
    "/customer-sync/reconcile",
    response_model=BillingCustomerSyncReconcileResponse,
)
async def reconcile_billing_customer_sync(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> BillingCustomerSyncReconcileResponse:
    counts = await enqueue_reconcile_all(db, now_unix_seconds())
    await db.commit()
    return BillingCustomerSyncReconcileResponse(
        organizations=counts["organizations"],
        users=counts["users"],
    )


@router.post(
    "/finance-provisioning/reconcile",
    response_model=FinanceProvisioningReconcileResponse,
)
async def reconcile_finance_provisioning(
    body: FinanceProvisioningReconcileRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> FinanceProvisioningReconcileResponse:
    scanned, enqueued, next_cursor = await reconcile_finance_connections(
        db,
        app_id=body.app_id,
        limit=body.limit,
        starting_after=body.starting_after,
    )
    return FinanceProvisioningReconcileResponse(
        scanned=scanned,
        enqueued=enqueued,
        next_cursor=next_cursor,
    )


@router.post(
    "/finance-provisioning/dispatch",
    response_model=FinanceProvisioningDispatchResponse,
)
async def dispatch_finance_provisioning(
    _admin: AdminDep,
) -> FinanceProvisioningDispatchResponse:
    summary = await dispatch_finance_provisioning_once()
    return FinanceProvisioningDispatchResponse(
        claimed=summary.claimed,
        delivered=summary.delivered,
        failed=summary.failed,
        configured=summary.configured,
    )


# ── Billing Accounts ─────────────────────────────────────────────────────────
accounts_router = APIRouter(prefix="/accounts")


def _serialize_billing_account(row: BillingAccount) -> BillingAccountResponse:
    return BillingAccountResponse(
        id=row.id,
        organization_id=row.organization_id,
        name=row.name,
        email=row.email,
        invoice_email=row.invoice_email,
        currency=row.currency,
        tax_exempt=row.tax_exempt,
        balance=row.balance,
        default_payment_method_id=row.default_payment_method_id,
        invoice_settings=row.invoice_settings,
        preferred_locales=row.preferred_locales,
        address=row.address,
        shipping=row.shipping,
        metadata=row.metadata_,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _dump_billing_account(values: BillingAccountCreate | BillingAccountUpdate) -> dict[str, Any]:
    data = values.model_dump(exclude_unset=True)
    if "metadata" in data:
        data["metadata_"] = data.pop("metadata")
    return data


@accounts_router.get(
    "",
    response_model=ListObject[BillingAccountResponse],
    status_code=status.HTTP_200_OK,
)
async def list_billing_accounts(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    organization_id: Annotated[str | None, Query(alias="organization_id")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> ListObject[BillingAccountResponse]:
    rows = await BillingAccountRepository(db).list_all(
        organization_id=organization_id,
        limit=limit,
    )
    return ListObject[BillingAccountResponse](
        data=[_serialize_billing_account(row) for row in rows],
        has_more=False,
        url="/billing/accounts",
    )


@accounts_router.post(
    "",
    response_model=BillingAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_billing_account(
    body: BillingAccountCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> BillingAccountResponse:
    row = await BillingAccountRepository(db).create(**_dump_billing_account(body))
    return _serialize_billing_account(row)


@accounts_router.get(
    "/{account_id}",
    response_model=BillingAccountResponse,
    status_code=status.HTTP_200_OK,
)
async def get_billing_account(
    account_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> BillingAccountResponse:
    row = await BillingAccountRepository(db).get_by_id(account_id)
    if not row:
        raise AppHTTPException(
            code="billing_account/not-found",
            message="Billing account not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_billing_account(row)


@accounts_router.patch(
    "/{account_id}",
    response_model=BillingAccountResponse,
    status_code=status.HTTP_200_OK,
)
async def update_billing_account(
    account_id: str,
    body: BillingAccountUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> BillingAccountResponse:
    row = await BillingAccountRepository(db).update(
        account_id,
        **_dump_billing_account(body),
    )
    if not row:
        raise AppHTTPException(
            code="billing_account/not-found",
            message="Billing account not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_billing_account(row)


@accounts_router.delete(
    "/{account_id}",
    response_model=BillingAccountDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_billing_account(
    account_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> BillingAccountDeleteResponse:
    repo = BillingAccountRepository(db)
    row = await repo.get_by_id(account_id)
    if not row:
        raise AppHTTPException(
            code="billing_account/not-found",
            message="Billing account not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    await db.delete(row)
    await db.flush()
    return BillingAccountDeleteResponse(id=account_id)


router.include_router(accounts_router)

# ── Subscriptions ────────────────────────────────────────────────────────────
subscriptions_router = APIRouter(prefix="/subscriptions")


@subscriptions_router.post(
    "",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription(
    body: SubscriptionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionResponse:
    app = await db.get(App, body.app_id)
    if not app:
        raise AppHTTPException(
            code="app/not-found",
            message="App not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if app.app_kind != "product":
        raise AppHTTPException(
            code="subscription/app-kind-invalid",
            message="Subscriptions can only be created for product apps.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    if body.billing_account_id:
        account = await BillingAccountRepository(db).get_by_id(body.billing_account_id)
        if not account or account.organization_id != body.organization_id:
            raise AppHTTPException(
                code="billing_account/not-found",
                message="Billing account not found for this organization.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

    row = await SubscriptionRepository(db).provision(
        body.organization_id,
        body.app_id,
        body.price_id,
        status=body.status or "active",
    )
    updates = body.model_dump(
        exclude={"organization_id", "app_id", "price_id", "status"},
        exclude_none=True,
    )
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    if updates:
        updated_row = await SubscriptionRepository(db).update_by_id(row.id, **updates)
        if not updated_row:
            raise AppHTTPException(
                code="subscription/not-found",
                message="Subscription not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        row = updated_row

    return _serialize_subscription(row)


@subscriptions_router.get(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_200_OK,
)
async def get_subscription(
    subscription_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionResponse:
    stmt = select(Subscription).options(*_LOAD_OPTIONS).where(Subscription.id == subscription_id)
    row = (await db.scalars(stmt)).first()
    if not row:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_subscription(row)


@subscriptions_router.get(
    "",
    response_model=ListObject[SubscriptionResponse],
    status_code=status.HTTP_200_OK,
)
async def list_subscriptions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
    organization_id: Annotated[str | None, Query(alias="organization_id")] = None,
    app_id: Annotated[str | None, Query(alias="app_id")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> ListObject[SubscriptionResponse]:
    stmt = (
        select(Subscription)
        .join(App, App.id == Subscription.app_id)
        .options(*_LOAD_OPTIONS)
        .where(App.app_kind == "product")
    )
    if organization_id:
        stmt = stmt.where(Subscription.organization_id == organization_id)
    if app_id:
        stmt = stmt.where(Subscription.app_id == app_id)

    stmt = stmt.order_by(Subscription.created_at.desc()).limit(limit)
    rows = list((await db.scalars(stmt)).all())

    return ListObject[SubscriptionResponse](
        data=[_serialize_subscription(row) for row in rows],
        has_more=False,
        url="/billing/subscriptions",
    )


@subscriptions_router.patch(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_200_OK,
)
async def update_subscription(
    subscription_id: str,
    body: SubscriptionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionResponse:
    stmt = select(Subscription).options(*_LOAD_OPTIONS).where(Subscription.id == subscription_id)
    row = (await db.scalars(stmt)).first()
    if not row:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    if body.billing_account_id:
        account = await BillingAccountRepository(db).get_by_id(body.billing_account_id)
        if not account or account.organization_id != row.organization_id:
            raise AppHTTPException(
                code="billing_account/not-found",
                message="Billing account not found for this organization.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

    updates = body.model_dump(exclude={"price_id"}, exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    if not updates and body.price_id is None:
        raise AppHTTPException(
            code="subscription/update-required",
            message="Provide at least one field to update.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    repo = SubscriptionRepository(db)
    updated_row = await repo.update_by_id(row.id, **updates) if updates else row
    if body.price_id is not None:
        await repo.set_price(row.id, body.price_id)
        refreshed = (
            await db.scalars(select(Subscription).options(*_LOAD_OPTIONS).where(Subscription.id == row.id))
        ).first()
        if refreshed:
            updated_row = refreshed

    return _serialize_subscription(updated_row)


@subscriptions_router.delete(
    "/{subscription_id}",
    response_model=SubscriptionDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_subscription(
    subscription_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionDeleteResponse:
    if not await SubscriptionRepository(db).delete_by_id(subscription_id):
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return SubscriptionDeleteResponse(id=subscription_id)


def _serialize_subscription_item(row: Any) -> SubscriptionItemResponse:
    return SubscriptionItemResponse(
        id=row.id,
        price_id=row.price_id,
        product_id=row.price.product_id if row.price else None,
        product_slug=row.price.product.slug if row.price and row.price.product else None,
        product_name=row.price.product.name if row.price and row.price.product else None,
        quantity=row.quantity,
    )


async def _get_subscription_item(
    db: AsyncSession,
    subscription_id: str,
    item_id: str,
) -> SubscriptionItem | None:
    stmt = select(SubscriptionItem).where(
        SubscriptionItem.id == item_id,
        SubscriptionItem.subscription_id == subscription_id,
    )
    return (await db.scalars(stmt)).first()


@subscriptions_router.post(
    "/{subscription_id}/items",
    response_model=SubscriptionItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription_item(
    subscription_id: str,
    body: SubscriptionItemCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionItemResponse:
    subscription = await db.get(Subscription, subscription_id)
    if not subscription:
        raise AppHTTPException(
            code="subscription/not-found",
            message="Subscription not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    price = await db.get(Price, body.price_id)
    if not price:
        raise AppHTTPException(
            code="price/not-found",
            message="Price not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    now = now_unix_seconds()
    item = SubscriptionItem(
        id=generate_id("subscriptionItem"),
        subscription_id=subscription_id,
        price_id=body.price_id,
        quantity=body.quantity,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item, attribute_names=["price"])
    return _serialize_subscription_item(item)


@subscriptions_router.patch(
    "/{subscription_id}/items/{item_id}",
    response_model=SubscriptionItemResponse,
    status_code=status.HTTP_200_OK,
)
async def update_subscription_item(
    subscription_id: str,
    item_id: str,
    body: SubscriptionItemUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionItemResponse:
    item = await _get_subscription_item(db, subscription_id, item_id)
    if not item:
        raise AppHTTPException(
            code="subscription_item/not-found",
            message="Subscription item not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    if body.quantity is not None:
        item.quantity = body.quantity
    if body.price_id is not None:
        price = await db.get(Price, body.price_id)
        if not price:
            raise AppHTTPException(
                code="price/not-found",
                message="Price not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        item.price_id = body.price_id
    item.updated_at = now_unix_seconds()
    await db.flush()
    await db.refresh(item, attribute_names=["price"])
    return _serialize_subscription_item(item)


@subscriptions_router.delete(
    "/{subscription_id}/items/{item_id}",
    response_model=SubscriptionItemDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_subscription_item(
    subscription_id: str,
    item_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: AdminDep,
) -> SubscriptionItemDeleteResponse:
    item = await _get_subscription_item(db, subscription_id, item_id)
    if not item:
        raise AppHTTPException(
            code="subscription_item/not-found",
            message="Subscription item not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    await db.delete(item)
    await db.flush()
    return SubscriptionItemDeleteResponse(id=item_id)


router.include_router(subscriptions_router)
