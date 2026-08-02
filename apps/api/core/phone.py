"""Shared phone-number primitives.

Neutral home for E.164 normalization and the cached provider lookup, so the
mobile-number domain and the communications domain can both use them without
importing each other. `domains/communications` already depends on
`domains/mobile_numbers`; putting either of these in a domain module makes that
a cycle the moment the other side needs it.
"""

from __future__ import annotations

import re

from fastapi import status

from core.errors import AppHTTPException

_E164 = re.compile(r"^\+[1-9][0-9]{7,14}$")


def invalid_phone() -> AppHTTPException:
    return AppHTTPException(
        code="communications/invalid-phone-number",
        message="Enter a valid international phone number.",
        http_status_code=status.HTTP_400_BAD_REQUEST,
    )


def normalize_phone_number(value: str) -> str:
    """Normalize the same international E.164-compatible inputs as `@876/core`.

    This is the free, synchronous, offline path. It stays authoritative for
    input-time feedback and for normalization on write; Twilio Lookup is the
    authoritative validity check at submission time, and wins where they differ.
    """
    stripped = value.strip()
    if not stripped.startswith("+") or not re.fullmatch(r"\+?[\d\s().-]+", stripped):
        raise invalid_phone()

    digits = re.sub(r"\D", "", stripped)
    normalized = f"+{digits}"
    if not _E164.fullmatch(normalized):
        raise invalid_phone()

    return normalized
