from __future__ import annotations

import json

import httpx

from domains.billing.generated_routes import ROUTES
from scripts.check_cutover import check_cutover


def _transport(*, writer: str = "fastapi", ready: bool = True) -> httpx.MockTransport:
    paths: dict[str, dict[str, dict[str, str]]] = {}
    for route in ROUTES:
        paths.setdefault(route.path, {})[route.method.lower()] = {"summary": "Billing operation"}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "ok"})
        if request.url.path == "/ready":
            return httpx.Response(
                200 if ready else 503,
                json={"status": "ready" if ready else "not_ready", "writer": writer},
            )
        if request.url.path == "/openapi.json":
            return httpx.Response(200, content=json.dumps({"paths": paths}))
        return httpx.Response(404)

    return httpx.MockTransport(handler)


async def test_cutover_check_accepts_ready_matching_deployment() -> None:
    report = await check_cutover("https://billing.test", transport=_transport())

    assert report.valid is True
    assert report.writer == "fastapi"
    assert report.routes == 109
    assert report.operations == 187
    assert report.failures == ()


async def test_cutover_check_fails_closed_on_writer_or_readiness_mismatch() -> None:
    report = await check_cutover(
        "https://billing.test",
        transport=_transport(writer="none", ready=False),
    )

    assert report.valid is False
    assert report.failures == ("readiness_check_failed", "writer_lease_mismatch")
