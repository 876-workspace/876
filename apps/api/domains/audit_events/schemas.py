from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AuditEventCreate(BaseModel):
    event: str = Field(min_length=1, max_length=120, description="Machine-readable event name.")
    source: str = Field(default="client", min_length=1, max_length=40, description="Telemetry source.")
    app_name: str = Field(min_length=1, max_length=80, description="Application that emitted the event.")
    user_id: str | None = Field(default=None, max_length=120, description="Canonical user ID, when known.")
    path: str | None = Field(default=None, max_length=500, description="Page path, if relevant.")
    search: str | None = Field(default=None, max_length=500, description="URL search string, if relevant.")
    referrer: str | None = Field(default=None, max_length=1000, description="Document referrer, if present.")
    title: str | None = Field(default=None, max_length=300, description="Document title, if present.")
    request_id: str | None = Field(default=None, max_length=120, description="Request ID for correlation.")
    session_id: str | None = Field(default=None, max_length=120, description="Browser/session correlation ID.")
    distinct_id: str | None = Field(default=None, max_length=120, description="Analytics distinct ID, when known.")
    properties: dict[str, Any] = Field(default_factory=dict, description="Sanitized event context.")

    model_config = ConfigDict(extra="forbid")

    @field_validator("event", "source", "app_name")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return value.strip()

    @field_validator("user_id", "path", "search", "referrer", "title", "request_id", "session_id", "distinct_id")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class AuditEventResponse(BaseModel):
    object: Literal["audit_event"] = "audit_event"
    id: str
    event: str
    source: str
    app_name: str
    app_id: str | None = None
    user_id: str | None = None
    path: str | None = None
    search: str | None = None
    referrer: str | None = None
    title: str | None = None
    request_id: str | None = None
    session_id: str | None = None
    distinct_id: str | None = None
    properties: dict[str, Any]
    created_at: int

    model_config = ConfigDict(from_attributes=True)
