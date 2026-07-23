from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUESTS = Counter(
    "billing_api_http_requests_total",
    "Billing API HTTP requests.",
    ("method", "route", "status"),
)
REQUEST_DURATION = Histogram(
    "billing_api_http_request_duration_seconds",
    "Billing API HTTP request duration.",
    ("method", "route"),
)
WRITER_REJECTIONS = Counter(
    "billing_api_writer_rejections_total",
    "Mutations rejected because FastAPI does not own the writer lease.",
)
SERVICE_INFO = Gauge(
    "billing_api_info",
    "Static Billing API deployment information.",
    ("environment", "writer"),
)


def configure_service_metrics(*, environment: str, writer: str) -> None:
    SERVICE_INFO.labels(environment=environment, writer=writer).set(1)


def metrics_response() -> Response:
    return Response(generate_latest(), headers={"content-type": CONTENT_TYPE_LATEST})


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        started_at = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            route = request.scope.get("route")
            route_path = getattr(route, "path", "unmatched")
            method = request.method
            REQUESTS.labels(method=method, route=route_path, status=str(status_code)).inc()
            REQUEST_DURATION.labels(method=method, route=route_path).observe(time.perf_counter() - started_at)
