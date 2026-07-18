from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CurrencyResponse(BaseModel):
    object: Literal["currency"] = Field(default="currency", description="Always 'currency'.")
    code: str = Field(description="ISO 4217 currency code.", examples=["JMD", "USD"])
    name: str = Field(description="Currency display name.", examples=["Jamaican Dollar"])
    symbol: str = Field(description="Currency symbol.", examples=["J$"])
    decimal_places: int = Field(description="Number of decimal places.", examples=[2])

    model_config = ConfigDict(from_attributes=True)


class CountryResponse(BaseModel):
    object: Literal["country"] = Field(default="country", description="Always 'country'.")
    code: str = Field(description="ISO 3166-1 alpha-2 country code.", examples=["JM"])
    name: str = Field(description="Country display name.", examples=["Jamaica"])
    phone_prefix: str | None = Field(default=None, description="International dialing prefix.", examples=["+1-876"])
    default_currency_code: str | None = Field(
        default=None, description="Default ISO 4217 currency code for this country.", examples=["JMD"]
    )

    model_config = ConfigDict(from_attributes=True)


class RegionResponse(BaseModel):
    object: Literal["region"] = Field(default="region", description="Always 'region'.")
    id: str = Field(description="Unique identifier for the region.")
    country_code: str = Field(description="ISO 3166-1 alpha-2 country code.", examples=["JM"])
    code: str = Field(description="Region code.", examples=["JM-01"])
    name: str = Field(description="Region display name.", examples=["Kingston"])
    type: str = Field(description="Region type.", examples=["parish", "state", "province"])

    model_config = ConfigDict(from_attributes=True)
