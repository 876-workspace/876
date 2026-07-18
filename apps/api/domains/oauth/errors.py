from __future__ import annotations

from fastapi.responses import JSONResponse

OAUTH_ERROR_CODES: dict[str, str] = {
    "provider/access-denied": "access_denied",
    "provider/consumer-account-required": "access_denied",
    "provider/code-expired": "invalid_grant",
    "provider/code-not-found": "invalid_grant",
    "provider/code-used": "invalid_grant",
    "provider/invalid-code-verifier": "invalid_grant",
    "provider/consent-required": "consent_required",
    "provider/invalid-client": "invalid_client",
    "provider/invalid-client-secret": "invalid_client",
    "provider/invalid-redirect-uri": "invalid_redirect_uri",
    "provider/invalid-scope": "invalid_scope",
    "provider/login-required": "login_required",
    "provider/token-expired": "invalid_token",
    "provider/token-invalid": "invalid_token",
    "provider/unauthorized-client": "unauthorized_client",
    "provider/unsupported-grant-type": "unsupported_grant_type",
    "provider/unsupported-response-type": "unsupported_response_type",
    "provider/internal-error": "server_error",
}


def to_oauth_error_code(code: str) -> str:
    return OAUTH_ERROR_CODES.get(code, "invalid_request")


def make_oauth_error(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": to_oauth_error_code(code),
            "error_description": message,
        },
    )
