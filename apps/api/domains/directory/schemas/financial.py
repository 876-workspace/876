from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .address import DirectoryAddressCreate, DirectoryAddressResponse, DirectoryAddressUpdate


class BankResponse(BaseModel):
    object: Literal["bank"] = Field(
        default="bank",
        description="String representing the object's type. Always 'bank'.",
    )
    id: str = Field(description="Unique identifier for the bank.")
    name: str = Field(description="Bank name.")
    short_name: str | None = Field(default=None, description="Bank short name.")
    bank_code: str = Field(description="BOJ ACH bank code.")
    swift_code: str | None = Field(default=None, description="SWIFT/BIC code.")
    logo_url: str | None = Field(default=None, description="Bank logo URL.")
    head_office: str | None = Field(default=None, description="Bank head office address.")
    website: str | None = Field(default=None, description="Bank website URL.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class BankCreate(BaseModel):
    name: str = Field(..., description="Bank name.", min_length=1)
    short_name: str | None = Field(default=None, description="Bank short name.")
    bank_code: str = Field(..., description="BOJ ACH bank code.", min_length=1)
    swift_code: str | None = Field(default=None, description="SWIFT/BIC code.")
    logo_url: str | None = Field(default=None, description="Bank logo URL.")
    head_office: str | None = Field(default=None, description="Bank head office address.")
    website: str | None = Field(default=None, description="Bank website URL.")


class BankUpdate(BaseModel):
    name: str | None = Field(default=None, description="Bank name.")
    short_name: str | None = Field(default=None, description="Bank short name.")
    bank_code: str | None = Field(default=None, description="BOJ ACH bank code.")
    swift_code: str | None = Field(default=None, description="SWIFT/BIC code.")
    logo_url: str | None = Field(default=None, description="Bank logo URL.")
    head_office: str | None = Field(default=None, description="Bank head office address.")
    website: str | None = Field(default=None, description="Bank website URL.")


class BankDeleteResponse(BaseModel):
    object: Literal["bank"] = "bank"
    id: str = Field(description="Unique identifier of the deleted bank.")
    deleted: bool = Field(default=True, description="Always true.")


class BankBranchResponse(BaseModel):
    object: Literal["bank_branch"] = Field(
        default="bank_branch",
        description="String representing the object's type. Always 'bank_branch'.",
    )
    id: str = Field(description="Unique identifier for the bank branch.")
    bank_id: str = Field(description="ID of the bank this branch belongs to.")
    name: str = Field(description="Branch name.")
    transit_number: str = Field(description="Branch transit number.")
    routing_number: str | None = Field(default=None, description="Routing number.")
    address_id: str = Field(description="Address identifier.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    operating_hours: str | None = Field(default=None, description="Operating hours.")
    address: DirectoryAddressResponse = Field(description="Nested directory address object.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class BankBranchCreate(BaseModel):
    name: str = Field(..., description="Branch name.", min_length=1)
    transit_number: str = Field(..., description="Branch transit number.", min_length=1)
    routing_number: str | None = Field(default=None, description="Routing number.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    operating_hours: str | None = Field(default=None, description="Operating hours.")
    address: DirectoryAddressCreate = Field(..., description="Physical address to create.")


class BankBranchUpdate(BaseModel):
    name: str | None = Field(default=None, description="Branch name.")
    transit_number: str | None = Field(default=None, description="Branch transit number.")
    routing_number: str | None = Field(default=None, description="Routing number.")
    contact_number: str | None = Field(default=None, description="Contact number.")
    operating_hours: str | None = Field(default=None, description="Operating hours.")
    address: DirectoryAddressUpdate | None = Field(default=None, description="Physical address to update.")


class BankBranchDeleteResponse(BaseModel):
    object: Literal["bank_branch"] = "bank_branch"
    id: str = Field(description="Unique identifier of the deleted bank branch.")
    deleted: bool = Field(default=True, description="Always true.")


class CreditUnionResponse(BaseModel):
    object: Literal["credit_union"] = Field(
        default="credit_union",
        description="Always 'credit_union'.",
    )
    id: str = Field(description="Unique identifier for the credit union.")
    name: str = Field(description="Credit union name.")
    short_name: str | None = Field(default=None, description="Credit union short name.")
    logo_url: str | None = Field(default=None, description="Credit union logo URL.")
    headquarters: str | None = Field(default=None, description="Credit union headquarters address.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class CreditUnionCreate(BaseModel):
    name: str = Field(..., description="Credit union name.", min_length=1)
    short_name: str | None = Field(default=None, description="Credit union short name.")
    logo_url: str | None = Field(default=None, description="Credit union logo URL.")
    headquarters: str | None = Field(default=None, description="Credit union headquarters address.")


class CreditUnionUpdate(BaseModel):
    name: str | None = Field(default=None, description="Credit union name.")
    short_name: str | None = Field(default=None, description="Credit union short name.")
    logo_url: str | None = Field(default=None, description="Credit union logo URL.")
    headquarters: str | None = Field(default=None, description="Credit union headquarters address.")


class CreditUnionDeleteResponse(BaseModel):
    object: Literal["credit_union"] = "credit_union"
    id: str = Field(description="Unique identifier of the deleted credit union.")
    deleted: bool = Field(default=True, description="Always true.")


class CreditUnionBranchResponse(BaseModel):
    object: Literal["credit_union_branch"] = Field(
        default="credit_union_branch",
        description="Always 'credit_union_branch'.",
    )
    id: str = Field(description="Unique identifier.")
    credit_union_id: str = Field(description="ID of the parent credit union.")
    name: str = Field(description="Branch name.")
    address_id: str = Field(description="Address identifier.")
    contact_number: str | None = Field(default=None, description="Contact phone number.")
    email: str | None = Field(default=None, description="Contact email address.")
    address: DirectoryAddressResponse = Field(description="Nested directory address object.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class CreditUnionBranchCreate(BaseModel):
    name: str = Field(..., description="Branch name.", min_length=1)
    contact_number: str | None = Field(default=None, description="Contact phone number.")
    email: str | None = Field(default=None, description="Contact email address.")
    address: DirectoryAddressCreate = Field(..., description="Physical address to create.")


class CreditUnionBranchUpdate(BaseModel):
    name: str | None = Field(default=None, description="Branch name.")
    contact_number: str | None = Field(default=None, description="Contact phone number.")
    email: str | None = Field(default=None, description="Contact email address.")
    address: DirectoryAddressUpdate | None = Field(default=None, description="Physical address to update.")


class CreditUnionBranchDeleteResponse(BaseModel):
    object: Literal["credit_union_branch"] = "credit_union_branch"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")


class BankAccountResponse(BaseModel):
    object: Literal["bank_account"] = Field(
        default="bank_account",
        description="Always 'bank_account'.",
    )
    id: str = Field(description="Unique identifier.")
    account_holder: str = Field(description="Name of the account holder.")
    bank_id: str = Field(description="ID of the bank.")
    branch_id: str | None = Field(default=None, description="ID of the bank branch.")
    account_number: str = Field(description="Account number.")
    account_type: str = Field(description="Account type (e.g. savings, checking).")
    currency: str = Field(description="ISO 4217 currency code.")
    created_at: int = Field(description="Creation time (Unix timestamp).")
    updated_at: int = Field(description="Last update time (Unix timestamp).")

    model_config = ConfigDict(from_attributes=True)


class BankAccountCreate(BaseModel):
    account_holder: str = Field(..., description="Name of the account holder.", min_length=1)
    bank_id: str = Field(..., description="ID of the bank.", min_length=1)
    branch_id: str | None = Field(default=None, description="ID of the bank branch.")
    account_number: str = Field(..., description="Account number.", min_length=1)
    account_type: str = Field(default="savings", description="Account type.")
    currency: str = Field(default="JMD", description="ISO 4217 currency code.", min_length=3, max_length=3)


class BankAccountUpdate(BaseModel):
    account_holder: str | None = Field(default=None, description="Name of the account holder.")
    bank_id: str | None = Field(default=None, description="ID of the bank.")
    branch_id: str | None = Field(default=None, description="ID of the bank branch.")
    account_number: str | None = Field(default=None, description="Account number.")
    account_type: str | None = Field(default=None, description="Account type.")
    currency: str | None = Field(default=None, description="ISO 4217 currency code.", min_length=3, max_length=3)


class BankAccountDeleteResponse(BaseModel):
    object: Literal["bank_account"] = "bank_account"
    id: str = Field(description="Unique identifier.")
    deleted: bool = Field(default=True, description="Always true.")
