import time
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.id import generate_request_id
from core.logging import bind_request_id, get_logger, reset_request_id

logger = get_logger(__name__)


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
        except Exception as exc:
            logger.error(
                "request_error",
                method=request.method,
                path=request.url.path,
                duration_ms=round((time.perf_counter() - started_at) * 1000),
                error_type=type(exc).__name__,
            )
            reset_request_id(token)
            raise

        fields = {
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round((time.perf_counter() - started_at) * 1000),
        }
        if response.status_code >= 500:
            logger.error("request_completed", **fields)
        elif response.status_code >= 400:
            logger.warning("request_completed", **fields)
        else:
            logger.info("request_completed", **fields)

        response.headers["x-request-id"] = request_id
        reset_request_id(token)
        return response
