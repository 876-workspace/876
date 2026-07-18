"""Username normalization, format validation, and availability checks.

Single source of truth for the username rules, shared by every path that sets a
username (admin create/update, session bootstrap) and by the availability
endpoint. A username is available only when it passes all three gates:

1. format  — 3-32 chars, lowercase ``a-z0-9._-``, no leading/trailing/repeated
   separator (ASCII-only, which also defeats homograph look-alike attacks);
2. reserved — not on the admin-managed reserved list (system, support, routing,
   legal/brand terms);
3. taken    — not already held by another user (including soft-deleted rows,
   since ``users.username`` is unique across all rows).
"""

from __future__ import annotations

import re

from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from db.repositories.reserved_usernames import ReservedUsernameRepository
from db.repositories.users import UserRepository

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 32

# Start and end on an alphanumeric; separators (. _ -) only allowed inside.
_USERNAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$")

_FORMAT_MESSAGE = (
    f"Username must be {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} characters and use only "
    "letters, numbers, and . _ - (not starting or ending with a separator)."
)


def normalize_username(value: str) -> str:
    """Lenient normalization for *derived* usernames (from email prefixes).

    Coerces arbitrary input into a valid handle by replacing disallowed
    characters; never raises. Use for backfill/derivation, not for validating
    a username a user explicitly chose — that should be rejected, not silently
    rewritten (see :func:`validate_username_format`).
    """
    username = value.lower().strip()
    username = re.sub(r"[^a-z0-9._-]", "-", username)
    username = re.sub(r"[-_.]{2,}", "-", username).strip("-_.")
    return username[:USERNAME_MAX_LENGTH] or "user"


def validate_username_format(value: str) -> str:
    """Strictly validate a user-chosen username. Returns it normalized to
    lowercase, or raises ``user/invalid-username``."""
    candidate = value.strip().lower()
    if not (USERNAME_MIN_LENGTH <= len(candidate) <= USERNAME_MAX_LENGTH) or not _USERNAME_RE.match(candidate):
        raise AppHTTPException(
            code="user/invalid-username",
            message=_FORMAT_MESSAGE,
            http_status_code=400,
        )
    return candidate


async def evaluate_username(
    db: AsyncSession,
    username: str,
    *,
    exclude_user_id: str | None = None,
) -> tuple[bool, str, str]:
    """Non-raising availability check. Returns ``(available, code, reason)``
    where ``code`` is one of ``available``/``invalid``/``reserved``/``taken``."""
    try:
        candidate = validate_username_format(username)
    except AppHTTPException as exc:
        return (False, "invalid", exc.app_message)

    if await ReservedUsernameRepository(db).is_reserved(candidate):
        return (False, "reserved", "This username is reserved and cannot be used.")

    existing = await UserRepository(db).get_by_username(candidate, include_deleted=True)
    if existing and existing.id != exclude_user_id:
        return (False, "taken", "This username is already taken.")

    return (True, "available", "Username is available.")


async def assert_username_available(
    db: AsyncSession,
    username: str,
    *,
    exclude_user_id: str | None = None,
) -> str:
    """Validate a user-chosen username end-to-end, returning the normalized
    value or raising the matching client-safe error."""
    available, code, reason = await evaluate_username(db, username, exclude_user_id=exclude_user_id)
    if available:
        return username.strip().lower()
    if code == "invalid":
        raise AppHTTPException(code="user/invalid-username", message=reason, http_status_code=400)
    # Collapse reserved → generic so the reserved list is not leaked to end users.
    raise AppHTTPException(
        code="user/username-unavailable",
        message="This username is not available.",
        http_status_code=409,
    )
