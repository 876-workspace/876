import json
import time
from collections.abc import Awaitable, Callable
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from core.id import generate_request_id
from core.logging import bind_request_id, get_logger, reset_request_id
from core.metrics import WRITER_REJECTIONS

logger = get_logger(__name__)
_raw_paths = {"/docs", "/health", "/metrics", "/openapi.json", "/ready", "/redoc"}
_unsafe_methods = {"DELETE", "PATCH", "POST", "PUT"}


class BillingWriterMiddleware(BaseHTTPMiddleware):
    """Allows mutations only while this service owns the Billing write lease."""

    def __init__(self, app: Any, *, writer: str) -> None:
        super().__init__(app)
        self.writer = writer

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        is_api_request = request.url.path == "/api/v1" or request.url.path.startswith("/api/v1/")
        if is_api_request and request.method in _unsafe_methods and self.writer != "fastapi":
            WRITER_REJECTIONS.inc()
            response: Response = JSONResponse(
                status_code=503,
                content={
                    "data": None,
                    "error": {
                        "code": "billing/writer-inactive",
                        "message": "The Billing API is not the active writer.",
                    },
                },
            )
        else:
            response = await call_next(request)
        response.headers["x-billing-writer"] = self.writer
        return response


def _error_code(error: Any, status_code: int) -> str:
    if isinstance(error, dict) and isinstance(error.get("code"), str):
        return str(error["code"])
    if isinstance(error, str):
        return error
    return "error/not-found" if status_code == 404 else "error/http"


def _error_message(error: Any) -> str:
    if isinstance(error, dict) and isinstance(error.get("message"), str):
        return str(error["message"])
    if isinstance(error, dict) and isinstance(error.get("error_description"), str):
        return str(error["error_description"])
    if isinstance(error, str):
        return error
    return "An error occurred."


def _client_error(error: Any, status_code: int) -> dict[str, Any]:
    normalized = dict(error) if isinstance(error, dict) else {}
    for key in ("httpStatus", "http_status", "status", "status_code"):
        normalized.pop(key, None)
    normalized["code"] = _error_code(error, status_code)
    normalized["message"] = _error_message(error)
    return normalized


def envelope_payload(payload: Any, status_code: int) -> Any:
    if isinstance(payload, dict) and "data" in payload and "error" in payload:
        if payload["error"] is None:
            return {"data": payload["data"], "error": None}
        return {"data": None, "error": _client_error(payload["error"], status_code)}
    if status_code < 400:
        return {"data": payload, "error": None}

    raw_error = payload.get("error") if isinstance(payload, dict) else payload
    return {"data": None, "error": _client_error(raw_error, status_code)}


class APIEnvelopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        if request.url.path in _raw_paths or response.status_code == 204:
            return response
        if "application/json" not in response.headers.get("content-type", ""):
            return response

        body = b""
        async for chunk in response.body_iterator:  # type: ignore[attr-defined]
            body += chunk
        if not body:
            return response

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            headers = {key: value for key, value in response.headers.items() if key.lower() != "content-length"}
            return Response(
                body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
            )

        content = json.dumps(envelope_payload(payload, response.status_code)).encode()
        headers = {key: value for key, value in response.headers.items() if key.lower() != "content-length"}
        return Response(content, status_code=response.status_code, headers=headers, media_type="application/json")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = request.headers.get("x-request-id") or generate_request_id()
        token = bind_request_id(request_id)
        started_at = time.perf_counter()
        logger.info("request_started", method=request.method, path=request.url.path)
        try:
            response = await call_next(request)
        except Exception:
            logger.error(
                "request_error",
                method=request.method,
                path=request.url.path,
                duration_ms=round((time.perf_counter() - started_at) * 1000),
                exc_info=True,
            )
            reset_request_id(token)
            raise

        log_fields = {
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round((time.perf_counter() - started_at) * 1000),
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
