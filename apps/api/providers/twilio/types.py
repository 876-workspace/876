"""Twilio-owned response and request shapes kept out of provider-neutral code."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TwilioVerification(BaseModel):
    model_config = ConfigDict(extra="allow")

    sid: str
    status: str
    to: str
    channel: str | None = None
    valid: bool = False
    date_created: str | None = None


class TwilioLookup(BaseModel):
    model_config = ConfigDict(extra="allow")

    phone_number: str
    national_format: str | None = None
    country_code: str | None = None
    valid: bool | None = None
    line_type_intelligence: TwilioLineTypeIntelligence | None = None


class TwilioLineTypeIntelligence(BaseModel):
    model_config = ConfigDict(extra="allow")

    carrier_name: str | None = None
    type: str | None = None
    mobile_country_code: str | None = None
    mobile_network_code: str | None = None


def verification_create_form(*, to_number: str, channel: str) -> dict[str, str]:
    return {"To": to_number, "Channel": channel}


def verification_check_form(*, to_number: str, code: str) -> dict[str, str]:
    return {"To": to_number, "Code": code}


def message_create_form(
    *,
    to_number: str,
    messaging_service_sid: str,
    body: str | None,
    content_sid: str | None,
    status_callback: str | None,
) -> dict[str, str]:
    form = {"To": to_number, "MessagingServiceSid": messaging_service_sid}
    if body is not None:
        form["Body"] = body
    if content_sid is not None:
        form["ContentSid"] = content_sid
    if status_callback is not None:
        form["StatusCallback"] = status_callback
    return form


class TwilioMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    sid: str
    status: str
    to: str
    from_: str | None = Field(default=None, alias="from")


def twilio_error_details(payload: object) -> tuple[str, str | None, str | None]:
    """Extract only safe error metadata from a Twilio error response."""
    if not isinstance(payload, dict):
        return "", None, None
    code = str(payload.get("code") or "")
    resource_sid = payload.get("more_info") or payload.get("sid")
    message = payload.get("message")
    return code, str(resource_sid) if resource_sid else None, str(message) if message else None
