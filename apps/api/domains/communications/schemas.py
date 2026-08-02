from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PhoneLookupCreate(BaseModel):
    number: str = Field(min_length=1, max_length=64)
    include_line_type: bool = Field(default=False, alias="includeLineType")
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class PhoneLookupResponse(BaseModel):
    object: Literal["phone_lookup"] = "phone_lookup"
    valid: bool
    e164: str | None = None
    national_format: str | None = None
    country_code: str | None = None
    carrier_name: str | None = None
    line_type: str | None = None
    mobile_country_code: str | None = None
    mobile_network_code: str | None = None
    line_type_requested: bool
    created_at: int


class MessageCreate(BaseModel):
    to_number: str = Field(alias="toNumber", min_length=1, max_length=64)
    channel: Literal["sms", "whatsapp"]
    template_key: str = Field(alias="templateKey", min_length=1, max_length=100)
    idempotency_key: str = Field(alias="idempotencyKey", min_length=1, max_length=255)
    user_id: str | None = Field(default=None, alias="userId")
    organization_id: str | None = Field(default=None, alias="organizationId")
    app_id: str | None = Field(default=None, alias="appId")
    client_reference: str | None = Field(default=None, alias="clientReference", max_length=255)
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class MessageResponse(BaseModel):
    object: Literal["communication_message"] = "communication_message"
    id: str
    provider: str
    provider_sid: str | None = None
    channel: str
    direction: str
    status: str
    to_number: str
    from_number: str | None = None
    messaging_service_sid: str | None = None
    content_sid: str | None = None
    template_key: str | None = None
    body_preview: str | None = None
    body_hash: str
    user_id: str | None = None
    organization_id: str | None = None
    app_id: str | None = None
    client_reference: str | None = None
    idempotency_key: str
    provider_error_code: str | None = None
    sent_at: int | None = None
    delivered_at: int | None = None
    read_at: int | None = None
    failed_at: int | None = None
    created_at: int
    updated_at: int
    model_config = ConfigDict(from_attributes=True)


class CallCreate(BaseModel):
    to_number: str = Field(alias="toNumber", min_length=1, max_length=64)
    template_key: str = Field(alias="templateKey", min_length=1, max_length=100)
    idempotency_key: str = Field(alias="idempotencyKey", min_length=1, max_length=255)
    user_id: str | None = Field(default=None, alias="userId")
    organization_id: str | None = Field(default=None, alias="organizationId")
    app_id: str | None = Field(default=None, alias="appId")
    client_reference: str | None = Field(default=None, alias="clientReference", max_length=255)
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class CallResponse(BaseModel):
    object: Literal["communication_call"] = "communication_call"
    id: str
    provider: str
    provider_sid: str | None = None
    direction: str
    status: str
    to_number: str
    from_number: str | None = None
    template_key: str
    user_id: str | None = None
    organization_id: str | None = None
    app_id: str | None = None
    client_reference: str | None = None
    idempotency_key: str
    duration_seconds: int | None = None
    provider_error_code: str | None = None
    started_at: int | None = None
    answered_at: int | None = None
    completed_at: int | None = None
    created_at: int
    updated_at: int
    model_config = ConfigDict(from_attributes=True)
