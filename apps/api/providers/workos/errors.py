from __future__ import annotations

import httpx

from core.errors import AppHTTPException
from core.logging import get_logger

logger = get_logger(__name__)

_WORKOS_CODE_MAP: dict[str, tuple[str, int]] = {
    "email_address_conflict": ("auth/email-already-exists", 409),
    "email_verification_required": ("auth/email-not-verified", 401),
    "invalid_credentials": ("auth/invalid-credentials", 401),
    "password_reset_required": ("auth/invalid-credentials", 401),
    "account_selection_required": ("auth/oauth-failed", 400),
    "organization_not_found": ("auth/oauth-failed", 404),
    "membership_not_found": ("auth/oauth-failed", 404),
    "user_not_found": ("auth/oauth-failed", 404),
    "user_creation_error": ("auth/registration-failed", 400),
    "external_id_already_used": ("organization/provider-conflict", 409),
}

_SAFE_MESSAGE_BY_CODE = {
    "auth/email-already-exists": "An account with this email already exists. Sign in to continue.",
    "auth/invalid-credentials": "The sign-in information you entered is incorrect.",
    "auth/registration-failed": "We couldn't create your account. Please try again.",
    "organization/provider-conflict": "We couldn't complete organization setup. Please try again.",
}


def normalize_workos_error(exc: httpx.HTTPStatusError) -> AppHTTPException:
    try:
        body = exc.response.json()
    except Exception:
        body = {}

    code = body.get("code") or body.get("error") or ""
    mapped_code, http_status = _WORKOS_CODE_MAP.get(code, ("auth/oauth-failed", exc.response.status_code or 502))
    message = _SAFE_MESSAGE_BY_CODE.get(mapped_code, "Authentication provider error.")
    upstream_message = body.get("message") or body.get("error_description")

    logger.warning(
        "workos.error_normalized",
        upstream_code=code,
        upstream_status=exc.response.status_code,
        mapped_code=mapped_code,
        http_status=http_status,
        upstream_message=upstream_message,
    )

    return AppHTTPException(
        code=mapped_code,
        message=message,
        http_status_code=http_status,
    )
