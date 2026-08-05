"""Session-scoped views of a caller's own devices and sessions.

These are deliberately **not** the admin shapes. An account-security screen in
any 876 app shows a person where and on what they are signed in; it must not
hand the browser the fingerprint that identifies their device across accounts,
nor their IP addresses. Both are fraud-investigation data, and both belong to
the admin tier only — see `.claude/rules/sdk-conventions.md` on per-tier
serializers being an API concern rather than client-side filtering.
"""

from typing import Literal

from pydantic import BaseModel, Field


class MyDeviceResponse(BaseModel):
    object: Literal["my_device"] = Field(
        default="my_device",
        description="String representing the object's type. Always 'my_device'.",
    )
    id: str = Field(description="Opaque device id.")
    name: str = Field(description="A human label for the device, e.g. 'Samsung SM-S928B'.")
    device_type: str = Field(description="desktop | mobile | tablet | bot | other.")
    os_name: str | None = Field(default=None, description="Operating system family.")
    browser_name: str | None = Field(default=None, description="Browser name.")
    last_country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 of the last sign-in.")
    trusted: bool = Field(description="Whether the device has been marked trusted.")
    sign_in_count: int = Field(description="How many times this device has signed in.")
    first_seen_at: int = Field(description="Unix timestamp first seen.")
    last_seen_at: int = Field(description="Unix timestamp last seen.")
    is_current: bool = Field(default=False, description="Whether this is the device making the request.")


class MySessionResponse(BaseModel):
    object: Literal["my_session"] = Field(
        default="my_session",
        description="String representing the object's type. Always 'my_session'.",
    )
    id: str = Field(description="Opaque session id.")
    device_id: str | None = Field(default=None, description="Device this session was established from.")
    city: str | None = Field(default=None, description="City of the sign-in, when known.")
    country_code: str | None = Field(default=None, description="ISO 3166-1 alpha-2 of the sign-in.")
    created_at: int = Field(description="Unix timestamp the session started.")
    last_seen_at: int | None = Field(default=None, description="Unix timestamp of last activity.")
    expires_at: int = Field(description="Unix timestamp the session expires.")
    is_current: bool = Field(default=False, description="Whether this is the session making the request.")


class MySessionDeleted(BaseModel):
    object: Literal["my_session"] = Field(
        default="my_session",
        description="String representing the object's type. Always 'my_session'.",
    )
    id: str = Field(description="The revoked session id.")
    deleted: Literal[True] = Field(default=True, description="Always true.")
