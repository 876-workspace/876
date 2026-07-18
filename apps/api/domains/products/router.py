from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.id import generate_id
from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep
from core.timestamps import now_unix_seconds
from db.models import ApplicationModule, TaxCode
from db.repositories.apps import AppRepository
from db.repositories.prices import PriceRepository
from db.repositories.products import ProductRepository
from db.session import get_db
from domains.products.schemas import (
    PriceCreateRequest,
    PriceResponse,
    PriceUpdateRequest,
    ProductCreateRequest,
    ProductDeleteResponse,
    ProductModulesReplaceRequest,
    ProductResponse,
    ProductUpdateRequest,
)

from . import docs

logger = get_logger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])


def _serialize_product(row: object) -> ProductResponse:
    product = ProductResponse.model_validate(row)
    module_ids = [entitlement.module_id for entitlement in getattr(row, "module_entitlements", [])]
    app = getattr(row, "app", None)
    if app is None:
        return product.model_copy(update={"module_ids": module_ids})
    return product.model_copy(
        update={
            "app_slug": app.slug,
            "app_name": app.name,
            "app_logo_url": app.logo_url,
            "app_kind": app.app_kind,
            "module_ids": module_ids,
        }
    )


def _serialize_price(row: object) -> PriceResponse:
    return PriceResponse.model_validate(row)


async def _validate_product_modules(
    db: AsyncSession,
    *,
    app_id: str | None,
    module_ids: list[str],
) -> list[str]:
    unique_module_ids = list(dict.fromkeys(module_ids))
    if not unique_module_ids:
        return []
    if app_id is None:
        raise AppHTTPException(
            code="plan-module/missing-app",
            message="A plan must belong to an app before modules can be included.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    modules = list(
        (await db.scalars(select(ApplicationModule).where(ApplicationModule.id.in_(unique_module_ids)))).all()
    )
    if len(modules) != len(unique_module_ids):
        raise AppHTTPException(
            code="plan-module/not-found",
            message="One or more selected application modules do not exist.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    if any(module.app_id != app_id or module.status != "active" for module in modules):
        raise AppHTTPException(
            code="plan-module/app-mismatch",
            message="Every selected active module must belong to the same app as the plan.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    return unique_module_ids


@router.get(
    "",
    response_model=ListObject[ProductResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_PRODUCTS_SUMMARY,
    description=docs.LIST_PRODUCTS_DESCRIPTION,
    responses=docs.LIST_PRODUCTS_RESPONSES,
)
async def list_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    app_id: Annotated[str | None, Query(alias="appId")] = None,
    product_status: Annotated[str | None, Query(alias="status")] = None,
) -> ListObject[ProductResponse]:
    rows = await ProductRepository(db).list_all(app_id=app_id, status=product_status)
    return ListObject[ProductResponse](
        data=[_serialize_product(row) for row in rows],
        has_more=False,
        url="/products",
    )


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_PRODUCT_SUMMARY,
    description=docs.CREATE_PRODUCT_DESCRIPTION,
    responses=docs.CREATE_PRODUCT_RESPONSES,
)
async def create_product(
    body: ProductCreateRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductResponse:
    product_repo = ProductRepository(db)
    if await product_repo.get_by_slug(body.slug):
        raise AppHTTPException(
            code="product/duplicate-slug",
            message="A product with this slug already exists.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    if body.app_id:
        app = await AppRepository(db).get_by_id(body.app_id)
        if not app:
            raise AppHTTPException(
                code="app/not-found",
                message="App not found.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
        if app.app_kind != "product":
            raise AppHTTPException(
                code="product/app-kind-invalid",
                message="Products can only be scoped to product apps.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )

    if body.tax_code_id and not await db.get(TaxCode, body.tax_code_id):
        raise AppHTTPException(
            code="tax_code/not-found",
            message="Tax code not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    module_ids = await _validate_product_modules(
        db,
        app_id=body.app_id,
        module_ids=body.module_ids,
    )

    now = now_unix_seconds()
    product = await product_repo.create(
        id=generate_id("product"),
        slug=body.slug,
        name=body.name,
        description=body.description,
        app_id=body.app_id,
        lookup_key=body.lookup_key,
        tax_code_id=body.tax_code_id,
        metadata_=body.metadata,
        status="active",
        created_at=now,
        updated_at=now,
    )
    await PriceRepository(db).create(
        id=generate_id("price"),
        product_id=product.id,
        unit_amount=body.price.unit_amount,
        currency=body.price.currency,
        billing_interval=body.price.billing_interval,
        interval_count=body.price.interval_count,
        name=body.price.name,
        nickname=body.price.nickname,
        status="active",
        created_at=now,
        updated_at=now,
    )
    if module_ids:
        product = await product_repo.replace_modules(product.id, module_ids) or product
    await db.refresh(product, attribute_names=["prices", "module_entitlements"])
    logger.info("products.create", product_id=product.id, slug=product.slug, app_id=product.app_id)
    return _serialize_product(product)


@router.put(
    "/{product_id}/modules",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.REPLACE_PRODUCT_MODULES_SUMMARY,
    description=docs.REPLACE_PRODUCT_MODULES_DESCRIPTION,
    responses=docs.REPLACE_PRODUCT_MODULES_RESPONSES,
)
async def replace_product_modules(
    product_id: str,
    body: ProductModulesReplaceRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductResponse:
    product_repo = ProductRepository(db)
    product = await product_repo.get_by_id(product_id)
    if not product:
        raise AppHTTPException(
            code="product/not-found",
            message="No product exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    module_ids = await _validate_product_modules(
        db,
        app_id=product.app_id,
        module_ids=body.module_ids,
    )
    updated_product = await product_repo.replace_modules(product_id, module_ids)
    if not updated_product:
        raise AppHTTPException(
            code="product/not-found",
            message="No product exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    logger.info(
        "products.modules.replace",
        product_id=product_id,
        module_count=len(module_ids),
    )
    return _serialize_product(updated_product)


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve a product",
    description="Retrieves a product and its prices by its ID.",
)
async def retrieve_product(
    product_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductResponse:
    product = await ProductRepository(db).get_by_id(product_id)
    if not product:
        raise AppHTTPException(
            code="product/not-found",
            message="No product exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_product(product)


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_PRODUCT_SUMMARY,
    description=docs.UPDATE_PRODUCT_DESCRIPTION,
    responses=docs.UPDATE_PRODUCT_RESPONSES,
)
async def update_product(
    product_id: str,
    body: ProductUpdateRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductResponse:
    updates = body.model_dump(exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    if not updates:
        raise AppHTTPException(
            code="product/no-updates",
            message="Provide at least one field to update.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    if "slug" in updates:
        updates["slug"] = updates["slug"].strip()
        if not updates["slug"]:
            raise AppHTTPException(
                code="product/invalid-slug",
                message="Plan slug cannot be empty.",
                http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        existing_slug = await ProductRepository(db).get_by_slug(updates["slug"])
        if existing_slug and existing_slug.id != product_id:
            raise AppHTTPException(
                code="product/duplicate-slug",
                message="A product with this slug already exists.",
                http_status_code=status.HTTP_409_CONFLICT,
            )
    if updates.get("tax_code_id") and not await db.get(TaxCode, updates["tax_code_id"]):
        raise AppHTTPException(
            code="tax_code/not-found",
            message="Tax code not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    now = now_unix_seconds()
    if "active" in updates:
        updates["status"] = "active" if updates["active"] else "archived"
        updates["archived_at"] = None if updates["active"] else now
    updates["updated_at"] = now

    product = await ProductRepository(db).update(product_id, **updates)
    if not product:
        raise AppHTTPException(
            code="product/not-found",
            message="No product exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("products.update", product_id=product_id, fields=sorted(updates.keys()))
    return _serialize_product(product)


@router.delete(
    "/{product_id}",
    response_model=ProductDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.ARCHIVE_PRODUCT_SUMMARY,
    description=docs.ARCHIVE_PRODUCT_DESCRIPTION,
    responses=docs.ARCHIVE_PRODUCT_RESPONSES,
)
async def archive_product(
    product_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProductDeleteResponse:
    """Archives a product rather than deleting the row — organizations already
    subscribed to one of its prices keep their subscription item (the price FK
    is ``ON DELETE RESTRICT``, so a hard delete would fail loudly instead of
    silently orphaning subscribers).
    """
    product_repo = ProductRepository(db)
    product = await product_repo.get_by_id(product_id)
    if not product:
        raise AppHTTPException(
            code="product/not-found",
            message="No product exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    await product_repo.update(product_id, status="archived", updated_at=now_unix_seconds())
    logger.info("products.archive", product_id=product_id)
    return ProductDeleteResponse(id=product_id)


@router.post(
    "/{product_id}/prices",
    response_model=PriceResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_PRICE_SUMMARY,
    description=docs.CREATE_PRICE_DESCRIPTION,
    responses=docs.CREATE_PRICE_RESPONSES,
)
async def create_price(
    product_id: str,
    body: PriceCreateRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PriceResponse:
    product = await ProductRepository(db).get_by_id(product_id)
    if not product:
        raise AppHTTPException(
            code="product/not-found",
            message="No product exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    now = now_unix_seconds()
    price = await PriceRepository(db).create(
        id=generate_id("price"),
        product_id=product_id,
        unit_amount=body.unit_amount,
        currency=body.currency,
        billing_interval=body.billing_interval,
        interval_count=body.interval_count,
        name=body.name,
        nickname=body.nickname,
        status="active",
        created_at=now,
        updated_at=now,
    )
    logger.info("products.prices.create", product_id=product_id, price_id=price.id)
    return _serialize_price(price)


@router.get(
    "/{product_id}/prices/{price_id}",
    response_model=PriceResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_PRICE_SUMMARY,
    description=docs.RETRIEVE_PRICE_DESCRIPTION,
    responses=docs.RETRIEVE_PRICE_RESPONSES,
)
async def retrieve_price(
    product_id: str,
    price_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PriceResponse:
    price = await PriceRepository(db).get_by_id(price_id)
    if not price or price.product_id != product_id:
        raise AppHTTPException(
            code="price/not-found",
            message="No price exists with the provided identifier on this product.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_price(price)


@router.patch(
    "/{product_id}/prices/{price_id}",
    response_model=PriceResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_PRICE_SUMMARY,
    description=docs.UPDATE_PRICE_DESCRIPTION,
    responses=docs.UPDATE_PRICE_RESPONSES,
)
async def update_price(
    product_id: str,
    price_id: str,
    body: PriceUpdateRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PriceResponse:
    price = await PriceRepository(db).get_by_id(price_id)
    if not price or price.product_id != product_id:
        raise AppHTTPException(
            code="price/not-found",
            message="No price exists with the provided identifier on this product.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise AppHTTPException(
            code="price/no-updates",
            message="Provide at least one field to update.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )
    updates["updated_at"] = now_unix_seconds()

    updated_price = await PriceRepository(db).update(price_id, **updates)
    logger.info("products.prices.update", product_id=product_id, price_id=price_id, fields=sorted(updates.keys()))
    return _serialize_price(updated_price)


@router.delete(
    "/{product_id}/prices/{price_id}",
    response_model=PriceResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.ARCHIVE_PRICE_SUMMARY,
    description=docs.ARCHIVE_PRICE_DESCRIPTION,
    responses=docs.ARCHIVE_PRICE_RESPONSES,
)
async def archive_price(
    product_id: str,
    price_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PriceResponse:
    price = await PriceRepository(db).get_by_id(price_id)
    if not price or price.product_id != product_id:
        raise AppHTTPException(
            code="price/not-found",
            message="No price exists with the provided identifier on this product.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    updated_price = await PriceRepository(db).update(
        price_id,
        active=False,
        status="archived",
        updated_at=now_unix_seconds(),
    )
    logger.info("products.prices.archive", product_id=product_id, price_id=price_id)
    return _serialize_price(updated_price)
