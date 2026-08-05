from typing import Literal

from pydantic import BaseModel, ConfigDict


class AuthAttemptResponse(BaseModel):
    object: Literal["auth_attempt"] = "auth_attempt"
    id: str
    event: str
    outcome: str
    failure_code: str | None = None
    identifier: str | None = None
    user_id: str | None = None
    app_id: str | None = None
    session_id: str | None = None
    realm: str | None = None
    device_id: str | None = None
    device_fingerprint: str | None = None
    ip_address: str | None = None
    ip_country_code: str | None = None
    ip_region_code: str | None = None
    ip_region: str | None = None
    ip_city: str | None = None
    ip_postal_code: str | None = None
    ip_timezone: str | None = None
    ip_latitude: str | None = None
    ip_longitude: str | None = None
    ip_asn: str | None = None
    ip_as_organization: str | None = None
    user_agent: str | None = None
    device_type: str | None = None
    device_brand: str | None = None
    device_model: str | None = None
    os_name: str | None = None
    os_version: str | None = None
    browser_name: str | None = None
    browser_version: str | None = None
    is_bot: bool
    context_trusted: bool
    risk_score: int | None = None
    risk_reasons: list[str] | None = None
    request_id: str | None = None
    created_at: int

    model_config = ConfigDict(from_attributes=True)


class SummaryItem(BaseModel):
    value: str
    count: int


class AuthAttemptSummaryResponse(BaseModel):
    object: Literal["auth_attempt_summary"] = "auth_attempt_summary"
    window: Literal["24h", "7d", "30d"]
    total: int
    outcomes: dict[str, int]
    top_countries: list[SummaryItem]
    top_failure_codes: list[SummaryItem]
    top_failure_ips: list[SummaryItem]
