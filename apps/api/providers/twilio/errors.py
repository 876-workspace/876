"""Central Twilio-to-platform error normalization with safe structured logs."""

from __future__ import annotations

import httpx
from fastapi import status

from core.errors import AppHTTPException
from core.logging import get_logger, get_request_id

from .types import twilio_error_details

logger = get_logger(__name__)

_CODE_MAP: dict[str, tuple[str, int, str]] = {
    "20429": ("communications/rate-limited", status.HTTP_429_TOO_MANY_REQUESTS, "Please wait and try again."),
    "60200": (
        "communications/verification-failed",
        status.HTTP_400_BAD_REQUEST,
        "The verification could not be completed.",
    ),
    "60202": (
        "communications/max-attempts-reached",
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Too many verification attempts.",
    ),
    "60203": ("communications/rate-limited", status.HTTP_429_TOO_MANY_REQUESTS, "Please wait and try again."),
    "60205": ("communications/verification-expired", status.HTTP_400_BAD_REQUEST, "The verification has expired."),
    "60212": ("communications/invalid-phone-number", status.HTTP_400_BAD_REQUEST, "Enter a valid phone number."),
}


def mask_phone_number(value: str | None) -> str | None:
    """Return a minimally useful, non-reversible display for a phone number."""
    if not value:
        return None
    digits = "".join(character for character in value if character.isdigit())
    if len(digits) <= 4:
        return "****"
    return f"+***{digits[-4:]}"


def not_configured() -> AppHTTPException:
    return AppHTTPException(
        code="communications/not-configured",
        message="Phone verification is not configured.",
        http_status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def channel_disabled(channel: str) -> AppHTTPException:
    return AppHTTPException(
        code="communications/channel-disabled",
        message=f"The {channel} verification channel is disabled.",
        http_status_code=status.HTTP_403_FORBIDDEN,
    )


def normalize_twilio_error(exc: httpx.HTTPStatusError, *, context: dict[str, object] | None = None) -> AppHTTPException:
    try:
        payload = exc.response.json()
    except ValueError:
        payload = {}
    provider_code, resource_sid, upstream_message = twilio_error_details(payload)
    mapped = _CODE_MAP.get(provider_code)
    if mapped is None:
        if exc.response.status_code == status.HTTP_NOT_FOUND:
            mapped = (
                "communications/verification-failed",
                status.HTTP_400_BAD_REQUEST,
                "The verification was not found.",
            )
        elif exc.response.status_code == status.HTTP_TOO_MANY_REQUESTS:
            mapped = ("communications/rate-limited", status.HTTP_429_TOO_MANY_REQUESTS, "Please wait and try again.")
        else:
            mapped = (
                "communications/provider-unavailable",
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "The communications provider is temporarily unavailable.",
            )
    mapped_code, http_status, message = mapped
    safe_context = context or {}
    logger.warning(
        "twilio.error_normalized",
        upstream_code=provider_code or None,
        upstream_status=exc.response.status_code,
        resource_sid=resource_sid,
        correlation_id=get_request_id() or None,
        mapped_code=mapped_code,
        # The upstream text is provider-controlled and Twilio validation messages
        # echo request parameters, including the full destination number — logging
        # it verbatim defeats the masked `to` context sitting beside it. Length is
        # enough to tell a truncated payload from an empty one.
        upstream_message_length=len(upstream_message) if upstream_message else 0,
        **safe_context,
    )
    return AppHTTPException(code=mapped_code, message=message, http_status_code=http_status)


def provider_unavailable(exc: httpx.HTTPError, *, context: dict[str, object] | None = None) -> AppHTTPException:
    logger.warning(
        "twilio.request_error",
        correlation_id=get_request_id() or None,
        error_type=type(exc).__name__,
        **(context or {}),
    )
    return AppHTTPException(
        code="communications/provider-unavailable",
        message="The communications provider is temporarily unavailable.",
        http_status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
    )
