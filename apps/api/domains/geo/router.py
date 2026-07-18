from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.repositories.geo import CountryRepository, CurrencyRepository, RegionRepository
from db.session import get_db
from domains.geo.docs import (
    LIST_COUNTRIES_DESCRIPTION,
    LIST_COUNTRIES_RESPONSES,
    LIST_COUNTRIES_SUMMARY,
    LIST_CURRENCIES_DESCRIPTION,
    LIST_CURRENCIES_RESPONSES,
    LIST_CURRENCIES_SUMMARY,
    LIST_REGIONS_DESCRIPTION,
    LIST_REGIONS_RESPONSES,
    LIST_REGIONS_SUMMARY,
)
from domains.geo.schemas import CountryResponse, CurrencyResponse, RegionResponse

router = APIRouter(prefix="/geo", tags=["Geo"])


@router.get(
    "/currencies",
    response_model=list[CurrencyResponse],
    status_code=status.HTTP_200_OK,
    summary=LIST_CURRENCIES_SUMMARY,
    description=LIST_CURRENCIES_DESCRIPTION,
    responses=LIST_CURRENCIES_RESPONSES,
)
async def list_currencies(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CurrencyResponse]:
    rows = await CurrencyRepository(db).list_enabled()
    return [CurrencyResponse.model_validate(r) for r in rows]


@router.get(
    "/countries",
    response_model=list[CountryResponse],
    status_code=status.HTTP_200_OK,
    summary=LIST_COUNTRIES_SUMMARY,
    description=LIST_COUNTRIES_DESCRIPTION,
    responses=LIST_COUNTRIES_RESPONSES,
)
async def list_countries(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CountryResponse]:
    rows = await CountryRepository(db).list_enabled()
    return [CountryResponse.model_validate(r) for r in rows]


@router.get(
    "/countries/{country_code}/regions",
    response_model=list[RegionResponse],
    status_code=status.HTTP_200_OK,
    summary=LIST_REGIONS_SUMMARY,
    description=LIST_REGIONS_DESCRIPTION,
    responses=LIST_REGIONS_RESPONSES,
)
async def list_regions(
    country_code: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[RegionResponse]:
    country = await CountryRepository(db).get_by_code(country_code)
    if not country:
        raise AppHTTPException(
            code="country/not-found",
            message="Country not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    rows = await RegionRepository(db).list_by_country(country_code)
    return [RegionResponse.model_validate(r) for r in rows]
