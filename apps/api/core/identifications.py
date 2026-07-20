"""Identification type registry: sensitive verified identifiers on user accounts.

Per `.claude/rules/customer-architecture.md`, sensitive identifiers (Jamaican
TRN first; passport / driver's license later) are **identity data** owned by
the core API on the user's account — never by an app datastore. This module
is the single source of truth for which types exist, how their raw values are
normalized and validated, and which app(s) may request full disclosure of a
value. Disclosure enforcement (the entitlement check plus the active
org→app subscription check) lives in `domains/users/router.py`; this module
only supplies the registry and the pure value helpers.

Never store, log, or serialize a raw (unmasked) identification value anywhere
except the dedicated disclosure response — see
`mask_identification_value` and the `/disclose` route.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from core.platform_apps import COURIERS_APP_SLUG


@dataclass(frozen=True)
class IdentificationTypeConfig:
    """Registry entry for one identification type."""

    label: str
    country_code: str | None
    pattern: str
    disclosure_app_slugs: frozenset[str]


IDENTIFICATION_TYPES: dict[str, IdentificationTypeConfig] = {
    "trn": IdentificationTypeConfig(
        label="Taxpayer Registration Number",
        country_code="JM",
        pattern=r"^\d{9}$",  # normalized: digits only
        disclosure_app_slugs=frozenset({COURIERS_APP_SLUG}),
    ),
    "passport": IdentificationTypeConfig(
        label="Passport Number",
        country_code=None,
        pattern=r"^[A-Z0-9]{6,12}$",  # normalized: uppercased, alnum
        disclosure_app_slugs=frozenset({COURIERS_APP_SLUG}),
    ),
    "drivers_license": IdentificationTypeConfig(
        label="Driver's License Number",
        country_code=None,
        pattern=r"^[A-Z0-9]{5,20}$",  # normalized: uppercased, alnum
        disclosure_app_slugs=frozenset({COURIERS_APP_SLUG}),
    ),
}


def normalize_identification_value(identification_type: str, raw_value: str) -> str:
    """Normalizes a raw identification value for storage and pattern matching.

    Every type strips whitespace and dashes first. TRN then keeps digits only;
    every other (currently known) type uppercases the remainder. Unknown types
    fall back to the whitespace/dash strip only — callers must still validate
    the type against `IDENTIFICATION_TYPES` before trusting the result.
    """
    stripped = re.sub(r"[\s-]", "", raw_value)
    if identification_type == "trn":
        return re.sub(r"\D", "", stripped)
    return stripped.upper()


def is_valid_identification_value(identification_type: str, normalized_value: str) -> bool:
    """Validates an already-normalized value against its type's pattern.

    Returns `False` for an unknown type — callers should have already
    resolved the type against `IDENTIFICATION_TYPES` and returned a
    dedicated "unknown type" error before reaching value validation.
    """
    config = IDENTIFICATION_TYPES.get(identification_type)
    if config is None:
        return False
    return re.fullmatch(config.pattern, normalized_value) is not None


def mask_identification_value(value: str) -> str:
    """Masks all but the last 3 characters of a value with `•`.

    Masks the entire value when it is 3 characters or shorter. This is the
    ONLY form of an identification value allowed to appear in list/retrieve
    responses, logs, or any surface other than the dedicated disclosure
    response.
    """
    if len(value) <= 3:
        return "•" * len(value)
    return "•" * (len(value) - 3) + value[-3:]
