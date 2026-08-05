from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DeviceResponse(BaseModel):
    object: Literal["device"] = "device"
    id: str
    user_id: str
    fingerprint: str
    confidence: str
    device_type: str
    device_brand: str | None = None
    device_model: str | None = None
    os_name: str | None = None
    os_version: str | None = None
    browser_name: str | None = None
    browser_version: str | None = None
    is_bot: bool
    label: str | None = None
    trusted: bool
    trusted_at: int | None = None
    trusted_by: str | None = None
    blocked_at: int | None = None
    blocked_by: str | None = None
    block_reason: str | None = None
    first_seen_at: int
    last_seen_at: int
    last_ip: str | None = None
    last_country_code: str | None = None
    sign_in_count: int
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class DeviceUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    trusted: bool | None = None
    blocked: bool | None = None
    block_reason: str | None = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class DeviceUserResponse(BaseModel):
    object: Literal["device_user"] = "device_user"
    user_id: str
    device_id: str
    first_seen_at: int
    last_seen_at: int
    sign_in_count: int
