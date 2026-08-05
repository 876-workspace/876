from typing import Literal

from pydantic import BaseModel, ConfigDict


class SessionResponse(BaseModel):
    object: Literal["session"] = "session"
    id: str
    user_id: str
    app_id: str | None = None
    expires_at: int
    ip_address: str | None = None
    user_agent: str | None = None
    device_id: str | None = None
    ip_country_code: str | None = None
    ip_region: str | None = None
    ip_city: str | None = None
    ip_asn: str | None = None
    ip_as_organization: str | None = None
    last_seen_at: int | None = None
    revoked_at: int | None = None
    revoked_by: str | None = None
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class SessionDeleted(BaseModel):
    object: Literal["session"] = "session"
    id: str
    deleted: Literal[True] = True


class UserSessionsDeleted(BaseModel):
    object: Literal["session_list"] = "session_list"
    user_id: str
    deleted: Literal[True] = True
    revoked_count: int
