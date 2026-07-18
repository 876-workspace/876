from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DirectoryAddressResponse(BaseModel):
    object: Literal["directory_address"] = Field(
        default="directory_address",
        description="String representing the object's type. Always 'directory_address'.",
    )
    id: str = Field(description="Unique identifier for the directory address.")
    line1: str = Field(description="First line of physical address.")
    line2: str | None = Field(default=None, description="Second line of physical address.")
    city: str = Field(description="City or town.")
    state: str = Field(description="Parish or state.")
    postal_code: str | None = Field(default=None, description="Postal or ZIP code.")
    country: str = Field(description="ISO 3166-1 alpha-2 country code.")
    latitude: float = Field(description="WGS 84 latitude coordinate.")
    longitude: float = Field(description="WGS 84 longitude coordinate.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class DirectoryAddressCreate(BaseModel):
    line1: str = Field(..., description="First line of physical address.", min_length=1)
    line2: str | None = Field(default=None, description="Second line of physical address.")
    city: str = Field(..., description="City or town.", min_length=1)
    state: str = Field(..., description="Parish or state.", min_length=1)
    postal_code: str | None = Field(default=None, description="Postal or ZIP code.")
    country: str = Field(default="JM", description="ISO 3166-1 alpha-2 country code.", min_length=2, max_length=2)
    latitude: float = Field(..., description="WGS 84 latitude coordinate.", ge=-90.0, le=90.0)
    longitude: float = Field(..., description="WGS 84 longitude coordinate.", ge=-180.0, le=180.0)


class DirectoryAddressUpdate(BaseModel):
    line1: str | None = Field(default=None, description="First line of physical address.")
    line2: str | None = Field(default=None, description="Second line of physical address.")
    city: str | None = Field(default=None, description="City or town.")
    state: str | None = Field(default=None, description="Parish or state.")
    postal_code: str | None = Field(default=None, description="Postal or ZIP code.")
    country: str | None = Field(
        default=None,
        description="ISO 3166-1 alpha-2 country code.",
        min_length=2,
        max_length=2,
    )
    latitude: float | None = Field(default=None, description="WGS 84 latitude coordinate.", ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, description="WGS 84 longitude coordinate.", ge=-180.0, le=180.0)
