from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class MobileNumberCreate(BaseModel):
    number: str = Field(min_length=1, max_length=64, description="Phone number in E.164-compatible form.")
    type: Literal["mobile", "home", "work", "other"] = Field(default="mobile", description="Number category.")

    model_config = ConfigDict(extra="forbid")


class MobileNumberUpdate(BaseModel):
    type: Literal["mobile", "home", "work", "other"] | None = Field(default=None, description="Number category.")

    model_config = ConfigDict(extra="forbid")


class MobileNumberResponse(BaseModel):
    object: Literal["mobile_number"] = "mobile_number"
    id: str
    user_id: str
    number: str
    type: str
    is_primary: bool
    verification_status: str
    verification_id: str | None = None
    verified_at: int | None = None
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class MobileNumberDeleteResponse(BaseModel):
    object: Literal["mobile_number"] = "mobile_number"
    id: str
    deleted: bool = True


class MobileNumberVerificationCreate(BaseModel):
    channel: Literal["sms", "call", "whatsapp"] = Field(description="Verification delivery channel.")

    model_config = ConfigDict(extra="forbid")


class MobileNumberVerificationApprove(BaseModel):
    code: str = Field(min_length=1, max_length=32, description="Code received from the verification provider.")
    make_primary: bool = Field(
        default=False,
        alias="makePrimary",
        description="Make this number primary when approved.",
    )

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class MobileNumberVerificationResponse(BaseModel):
    object: Literal["mobile_number_verification"] = "mobile_number_verification"
    id: str
    mobile_number_id: str
    provider: str | None = None
    provider_sid: str | None = None
    channel: str | None = None
    status: str | None = None
    attempt_count: int = 0
    last_sent_at: int | None = None
    can_resend_at: int | None = None
    verified_at: int | None = None
    expires_at: int
    created_at: int
    updated_at: int


class MobileNumberMakePrimary(BaseModel):
    model_config = ConfigDict(extra="forbid")


def verification_metadata_send_count(metadata: dict[str, Any] | None) -> int:
    """Read only the safe resend counter from persisted verification metadata."""
    if not metadata:
        return 0
    value = metadata.get("send_count", 0)
    return value if isinstance(value, int) and value >= 0 else 0
