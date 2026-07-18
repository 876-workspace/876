"""
Session cookie sealing/unsealing for the 876 platform.

The session cookie is an HMAC-SHA256-signed JSON payload. It carries the
minimum data needed by Next.js proxy.ts to make routing decisions without
a round-trip to the API on every request:
  - userId, email, accessToken, exp

The Python API sets this cookie on every auth-completing response (login,
register, callback, verify-email, magic-otp-verify). The Next.js apps read
it from the browser's Cookie header and validate the HMAC locally using the
shared SESSION_COOKIE_SECRET.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any


def account_identity(
    user_data: dict[str, Any],
    *,
    realm: str = "consumer",
    org_id: str | None = None,
    cross_realm: bool = False,
) -> dict[str, Any]:
    """Lightweight, token-free identity fields for one account.

    Shared by the active-account snapshot (top-level cookie fields) and each
    entry in the multi-account ``accounts`` list, so the chooser can display
    every signed-in account and ``switch_active`` can promote any of them.

    ``cross_realm`` is the per-user realm-gate exception, surfaced as
    ``crossRealm`` so the app proxies/guards can let an owner/super-admin into
    any realm. Carried on every account entry so switching accounts preserves it.
    """
    result: dict[str, Any] = {
        "userId": user_data.get("id") or user_data.get("userId") or "",
        "email": user_data.get("email", ""),
        "firstName": user_data.get("firstName") or user_data.get("first_name"),
        "lastName": user_data.get("lastName") or user_data.get("last_name"),
        "emailVerified": user_data.get("emailVerified") or user_data.get("email_verified", False),
        "avatar": user_data.get("avatar"),
        "username": user_data.get("username"),
        "realm": realm,
    }
    if org_id:
        result["orgId"] = org_id
    if cross_realm:
        result["crossRealm"] = True
    return result


def account_entry(
    user_data: dict[str, Any],
    session_id: str,
    *,
    realm: str = "consumer",
    org_id: str | None = None,
    cross_realm: bool = False,
) -> dict[str, Any]:
    """One entry in the multi-account ``accounts`` list — identity + its sid."""
    return {
        **account_identity(user_data, realm=realm, org_id=org_id, cross_realm=cross_realm),
        "sid": session_id,
    }


def merge_accounts(existing: list[dict[str, Any]] | None, new_entry: dict[str, Any]) -> list[dict[str, Any]]:
    """Add ``new_entry`` to the signed-in account set, de-duped by ``userId``.

    Re-authenticating an account already in the set replaces its stale entry
    (and sid) rather than appending a duplicate. Order is preserved with the
    freshly-authenticated account last.
    """
    user_id = new_entry.get("userId")
    kept = [a for a in (existing or []) if a.get("userId") != user_id]
    return [*kept, new_entry]


def select_account(accounts: list[dict[str, Any]] | None, sid: str) -> dict[str, Any] | None:
    """Return the account entry whose ``sid`` matches, or None when absent.

    The caller MUST use this to confirm a switch target belongs to the cookie's
    own account set — never trust a sid supplied by the client directly.
    """
    for account in accounts or []:
        if account.get("sid") == sid:
            return account
    return None


def seal_session(
    user_data: dict[str, Any],
    access_token: str | None,
    secret: str,
    ttl_seconds: int = 60 * 60 * 24 * 400,
    session_id: str | None = None,
    accounts: list[dict[str, Any]] | None = None,
    realm: str = "consumer",
    org_id: str | None = None,
    cross_realm: bool = False,
) -> str:
    """Return a signed, base64-encoded session cookie value.

    The active account's identity stays at the top level (unchanged contract,
    so existing proxy/session readers keep working). When ``session_id`` and
    ``accounts`` are provided, the cookie additionally carries the active
    session id (``sid``) and the full signed-in account set for multi-account
    switching.
    """
    payload_dict: dict[str, Any] = {
        **account_identity(user_data, realm=realm, org_id=org_id, cross_realm=cross_realm),
        "accessToken": access_token,
        "exp": int(time.time()) + ttl_seconds,
    }
    if session_id is not None:
        payload_dict["sid"] = session_id
    if accounts is not None:
        payload_dict["accounts"] = accounts
    payload = json.dumps(payload_dict, separators=(",", ":"))
    sig = _sign(payload, secret)
    # Unpadded base64url — avoids a trailing '=' in the cookie value, which some
    # cookie parsers/middleware mishandle.
    raw = base64.urlsafe_b64encode(f"{payload}.{sig}".encode()).decode()
    return raw.rstrip("=")


def unseal_session(cookie_value: str, secret: str) -> dict[str, Any] | None:
    """Verify the signature and return the session payload, or None on failure."""
    try:
        # Restore base64 padding stripped by seal_session.
        padded = cookie_value + "=" * (-len(cookie_value) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode()).decode()
        # Split on last dot to separate payload from signature
        last_dot = decoded.rfind(".")
        if last_dot == -1:
            return None
        payload_str = decoded[:last_dot]
        sig = decoded[last_dot + 1 :]

        expected = _sign(payload_str, secret)
        if not hmac.compare_digest(sig, expected):
            return None

        payload = json.loads(payload_str)
        if not isinstance(payload, dict):
            return None
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def _sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
