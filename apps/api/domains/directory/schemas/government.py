from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .address import DirectoryAddressCreate, DirectoryAddressResponse, DirectoryAddressUpdate


class MinistryResponse(BaseModel):
    object: Literal["ministry"] = Field(
        default="ministry",
        description="Always 'ministry'.",
    )
    id: str = Field(description="Unique identifier.")
    name: str = Field(description="Ministry name.")
    portfolio: str | None = Field(default=None, description="Portfolio managed.")
    minister: str | None = Field(default=None, description="Current minister name.")
    website: str | None = Field(default=None, description="Ministry website URL.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class MinistryCreate(BaseModel):
    name: str = Field(..., description="Ministry name.", min_length=1)
    portfolio: str | None = Field(default=None, description="Portfolio managed.")
    minister: str | None = Field(default=None, description="Current minister name.")
    website: str | None = Field(default=None, description="Ministry website URL.")


class MinistryUpdate(BaseModel):
    name: str | None = Field(default=None, description="Ministry name.")
    portfolio: str | None = Field(default=None, description="Portfolio managed.")
    minister: str | None = Field(default=None, description="Current minister name.")
    website: str | None = Field(default=None, description="Ministry website URL.")


class MinistryDeleteResponse(BaseModel):
    object: Literal["ministry"] = "ministry"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")


class MinistryDepartmentResponse(BaseModel):
    object: Literal["ministry_department"] = Field(
        default="ministry_department",
        description="Always 'ministry_department'.",
    )
    id: str = Field(description="Unique identifier.")
    ministry_id: str = Field(description="ID of the parent ministry.")
    name: str = Field(description="Department name.")
    description: str | None = Field(default=None, description="Department description.")
    address_id: str = Field(description="Address identifier.")
    contact_email: str | None = Field(default=None, description="Contact email.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    address: DirectoryAddressResponse = Field(description="Nested directory address object.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class MinistryDepartmentCreate(BaseModel):
    name: str = Field(..., description="Department name.", min_length=1)
    description: str | None = Field(default=None, description="Department description.")
    contact_email: str | None = Field(default=None, description="Contact email.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    address: DirectoryAddressCreate = Field(..., description="Physical address to create.")


class MinistryDepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, description="Department name.")
    description: str | None = Field(default=None, description="Department description.")
    contact_email: str | None = Field(default=None, description="Contact email.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    address: DirectoryAddressUpdate | None = Field(default=None, description="Physical address to update.")


class MinistryDepartmentDeleteResponse(BaseModel):
    object: Literal["ministry_department"] = "ministry_department"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")
