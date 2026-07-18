from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .address import DirectoryAddressCreate, DirectoryAddressResponse, DirectoryAddressUpdate


class UniversityResponse(BaseModel):
    object: Literal["university"] = Field(
        default="university",
        description="Always 'university'.",
    )
    id: str = Field(description="Unique identifier.")
    name: str = Field(description="University name.")
    acronym: str | None = Field(default=None, description="University acronym.")
    logo_url: str | None = Field(default=None, description="Logo URL.")
    website: str | None = Field(default=None, description="Website URL.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class UniversityCreate(BaseModel):
    name: str = Field(..., description="University name.", min_length=1)
    acronym: str | None = Field(default=None, description="University acronym.")
    logo_url: str | None = Field(default=None, description="Logo URL.")
    website: str | None = Field(default=None, description="Website URL.")


class UniversityUpdate(BaseModel):
    name: str | None = Field(default=None, description="University name.")
    acronym: str | None = Field(default=None, description="University acronym.")
    logo_url: str | None = Field(default=None, description="Logo URL.")
    website: str | None = Field(default=None, description="Website URL.")


class UniversityDeleteResponse(BaseModel):
    object: Literal["university"] = "university"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")


class UniversityCampusResponse(BaseModel):
    object: Literal["university_campus"] = Field(
        default="university_campus",
        description="Always 'university_campus'.",
    )
    id: str = Field(description="Unique identifier.")
    university_id: str = Field(description="ID of the parent university.")
    name: str = Field(description="Campus name.")
    is_main_campus: bool = Field(description="Whether this is the main campus.")
    address_id: str = Field(description="Address identifier.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    email: str | None = Field(default=None, description="Contact email.")
    address: DirectoryAddressResponse = Field(description="Nested directory address object.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class UniversityCampusCreate(BaseModel):
    name: str = Field(..., description="Campus name.", min_length=1)
    is_main_campus: bool = Field(default=False, description="Whether this is the main campus.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    email: str | None = Field(default=None, description="Contact email.")
    address: DirectoryAddressCreate = Field(..., description="Physical address to create.")


class UniversityCampusUpdate(BaseModel):
    name: str | None = Field(default=None, description="Campus name.")
    is_main_campus: bool | None = Field(default=None, description="Whether this is the main campus.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    email: str | None = Field(default=None, description="Contact email.")
    address: DirectoryAddressUpdate | None = Field(default=None, description="Physical address to update.")


class UniversityCampusDeleteResponse(BaseModel):
    object: Literal["university_campus"] = "university_campus"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")


class SecondarySchoolResponse(BaseModel):
    object: Literal["secondary_school"] = Field(
        default="secondary_school",
        description="Always 'secondary_school'.",
    )
    id: str = Field(description="Unique identifier.")
    name: str = Field(description="School name.")
    principal: str | None = Field(default=None, description="Principal name.")
    school_type: str | None = Field(default=None, description="School type.")
    logo_url: str | None = Field(default=None, description="Logo URL.")
    address_id: str = Field(description="Address identifier.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    email: str | None = Field(default=None, description="Contact email.")
    address: DirectoryAddressResponse = Field(description="Nested directory address object.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class SecondarySchoolCreate(BaseModel):
    name: str = Field(..., description="School name.", min_length=1)
    principal: str | None = Field(default=None, description="Principal name.")
    school_type: str | None = Field(default=None, description="School type.")
    logo_url: str | None = Field(default=None, description="Logo URL.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    email: str | None = Field(default=None, description="Contact email.")
    address: DirectoryAddressCreate = Field(..., description="Physical address to create.")


class SecondarySchoolUpdate(BaseModel):
    name: str | None = Field(default=None, description="School name.")
    principal: str | None = Field(default=None, description="Principal name.")
    school_type: str | None = Field(default=None, description="School type.")
    logo_url: str | None = Field(default=None, description="Logo URL.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    email: str | None = Field(default=None, description="Contact email.")
    address: DirectoryAddressUpdate | None = Field(default=None, description="Physical address to update.")


class SecondarySchoolDeleteResponse(BaseModel):
    object: Literal["secondary_school"] = "secondary_school"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")
