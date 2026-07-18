from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AddressResponse(BaseModel):
    object: Literal["address"] = "address"
    id: str
    user_id: str | None = None
    organization_id: str | None = None
    type: Literal["billing", "shipping", "home", "work", "other"]
    label: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    region_id: str | None = None
    country_code: str | None = None
    postal_code: str | None = None
    is_default: bool = False
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class AddressCreate(BaseModel):
    user_id: str | None = Field(default=None, alias="userId")
    organization_id: str | None = Field(default=None, alias="organizationId")
    type: Literal["billing", "shipping", "home", "work", "other"] = Field(
        default="other",
        description="Address type.",
    )
    label: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    region_id: str | None = Field(default=None, alias="regionId")
    country_code: str | None = Field(default=None, alias="countryCode")
    postal_code: str | None = Field(default=None, alias="postalCode")
    is_default: bool = Field(default=False, alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)


class AddressUpdate(BaseModel):
    type: Literal["billing", "shipping", "home", "work", "other"] | None = None
    label: str | None = None
    line1: str | None = None
    line2: str | None = None
    city: str | None = None
    region_id: str | None = None
    country_code: str | None = None
    postal_code: str | None = None
    is_default: bool | None = None

    model_config = ConfigDict(populate_by_name=True)


class AddressDeleteResponse(BaseModel):
    object: Literal["address"] = "address"
    id: str
    deleted: bool = True
