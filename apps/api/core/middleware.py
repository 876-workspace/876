"""HTTP request logging and request ID propagation middleware."""

import importlib
import importlib.util
import json
import time
from collections.abc import Awaitable, Callable
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.id import generate_id
from core.logging import bind_request_id, get_logger, reset_request_id

_sentry_sdk: Any | None = None
if importlib.util.find_spec("sentry_sdk") is not None:
    _sentry_sdk = importlib.import_module("sentry_sdk")

logger = get_logger(__name__)


_RAW_JSON_PROTOCOL_PATHS = {
    "/oauth/.well-known/openid-configuration",
    "/oauth/.well-known/jwks.json",
}


def _is_framework_health_or_protocol_path(path: str) -> bool:
    """Return paths whose JSON shape is defined outside the 876 API contract."""
    return (
        path in {"/health", "/openapi.json", "/docs", "/redoc"}
        or path in _RAW_JSON_PROTOCOL_PATHS
        or path.startswith("/docs/")
    )


def _is_json_response(response: Response) -> bool:
    content_type = response.headers.get("content-type", "")
    return "application/json" in content_type


def _is_envelope(payload: Any) -> bool:
    return isinstance(payload, dict) and "data" in payload and "error" in payload


def _error_message(error: Any) -> str:
    if isinstance(error, dict) and isinstance(error.get("message"), str):
        return str(error["message"])
    if isinstance(error, dict) and isinstance(error.get("error_description"), str):
        return str(error["error_description"])
    if isinstance(error, str):
        return error
    return "An error occurred."


def _error_code(error: Any, status_code: int) -> str:
    if isinstance(error, dict) and isinstance(error.get("code"), str):
        return str(error["code"])
    if isinstance(error, str):
        return error
    if status_code == 404:
        return "error/not-found"
    return "error/http"


def _envelope_payload(payload: Any, status_code: int) -> Any:
    if _is_envelope(payload):
        if payload["error"] is None:
            return {"data": payload["data"], "error": None}
        return {
            "data": None,
            "error": _client_safe_error(payload["error"], status_code),
        }

    if status_code < 400:
        return {"data": payload, "error": None}

    raw_error = payload.get("error") if isinstance(payload, dict) and "error" in payload else payload
    if isinstance(raw_error, dict):
        return {
            "data": None,
            "error": _client_safe_error(raw_error, status_code),
        }

    message_source = payload if isinstance(payload, dict) else raw_error
    return {
        "data": None,
        "error": {
            "code": _error_code(raw_error, status_code),
            "message": _error_message(message_source),
        },
    }


def _client_safe_error(error: Any, status_code: int) -> dict[str, Any]:
    """Normalize an error and remove server-only HTTP status metadata."""
    normalized = dict(error) if isinstance(error, dict) else {}
    for key in ("httpStatus", "http_status", "status", "status_code"):
        normalized.pop(key, None)
    normalized["code"] = _error_code(error, status_code)
    normalized["message"] = _error_message(error)
    return normalized


class APIEnvelopeMiddleware(BaseHTTPMiddleware):
    """Wrap API JSON responses in the canonical {data, error} envelope."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        if _is_framework_health_or_protocol_path(request.url.path):
            return response
        if response.status_code == 204 or not _is_json_response(response):
            return response

        body = b""
        async for chunk in response.body_iterator:  # type: ignore[attr-defined]
            body += chunk
        if not body:
            return response

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return Response(
                content=body,
                status_code=response.status_code,
                headers={key: value for key, value in response.headers.items() if key.lower() != "content-length"},
                media_type=response.media_type,
            )

        content = json.dumps(_envelope_payload(payload, response.status_code)).encode()
        return Response(
            content=content,
            status_code=response.status_code,
            headers={key: value for key, value in response.headers.items() if key.lower() != "content-length"},
            media_type="application/json",
        )


def _request_path(request: Request) -> str:
    """Return the request path for logging.

    ``request.url.path`` excludes the query string, so codes, tokens, and other
    sensitive values passed as query parameters are never written to logs.
    """
    return request.url.path


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log request lifecycle events and propagate x-request-id."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = request.headers.get("x-request-id") or generate_id("request")
        token = bind_request_id(request_id)
        if _sentry_sdk is not None:
            _sentry_sdk.set_tag("request_id", request_id)

        path = _request_path(request)
        logger.info("request_started", method=request.method, path=path)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000)
            logger.error(
                "request_error",
                method=request.method,
                path=path,
                duration_ms=duration_ms,
                exc_info=True,
            )
            reset_request_id(token)
            raise

        duration_ms = round((time.perf_counter() - start) * 1000)
        log_fields = {
            "method": request.method,
            "path": path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        }

        if response.status_code >= 500:
            logger.error("request_completed", **log_fields)
        elif response.status_code >= 400:
            logger.warning("request_completed", **log_fields)
        else:
            logger.info("request_completed", **log_fields)

        response.headers["x-request-id"] = request_id
        reset_request_id(token)
        return response
