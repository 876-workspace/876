"""Fixed-window rate limiting for credential-guessing auth endpoints.

All browser traffic reaches the API through each app's server-side auth
bridge, so the client IP the API sees is the Next.js server — per-IP limits
would throttle every user at once. Limits are therefore keyed on the
credential target itself (identifier, email, or token), which is also the
value an attacker must hold constant while brute-forcing.

The window state is in-process memory: it resets on restart and is not
shared across workers. That is an accepted baseline — each worker still
caps the attempt rate, and the protected secrets (passwords, OTP codes,
reset tokens) need far more attempts than any per-worker budget allows.
"""

from __future__ import annotations

import hashlib
import time

from fastapi import status

from core.errors import AppHTTPException
from core.logging import get_logger

logger = get_logger(__name__)

# (scope, hashed key) -> (window start, attempts in window)
_windows: dict[tuple[str, str], tuple[int, int]] = {}

# Prune expired windows once the table grows past this, so a scan across many
# distinct keys cannot grow memory without bound.
_MAX_ENTRIES = 10_000


def enforce_rate_limit(
    scope: str,
    key: str,
    *,
    max_attempts: int,
    window_seconds: int,
) -> None:
    """Count one attempt for ``key`` in ``scope``; raise 429 over the limit.

    ``key`` is hashed before storage so raw identifiers and tokens never sit
    in process memory longer than the call.
    """
    now = int(time.time())
    bucket = (scope, hashlib.sha256(key.encode("utf-8")).hexdigest())

    started, count = _windows.get(bucket, (now, 0))
    if now - started >= window_seconds:
        started, count = now, 0
    count += 1
    _windows[bucket] = (started, count)

    if len(_windows) > _MAX_ENTRIES:
        _prune(now)

    if count > max_attempts:
        logger.warning(
            "auth.rate_limited",
            scope=scope,
            key_fp=bucket[1][:12],
            attempts=count,
            window_seconds=window_seconds,
        )
        raise AppHTTPException(
            code="auth/rate-limited",
            message="Too many attempts. Please wait a moment and try again.",
            http_status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


def _prune(now: int) -> None:
    expired = [
        bucket
        for bucket, (started, _) in _windows.items()
        # Any window older than the longest limit in use is stale.
        if now - started >= 3600
    ]
    for bucket in expired:
        del _windows[bucket]


def reset_rate_limits() -> None:
    """Clear all window state (test isolation only)."""
    _windows.clear()
