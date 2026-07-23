from httpx import ASGITransport, AsyncClient

from core.config import Settings
from main import create_app


async def test_health_returns_raw_service_status() -> None:
    app = create_app(Settings(environment="test"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "object": "health",
        "status": "ok",
        "service": "@876/billing-api",
    }
    assert response.headers["x-request-id"].startswith("req_")


async def test_readiness_reports_missing_database_engine() -> None:
    app = create_app(Settings(environment="test"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {
        "object": "readiness",
        "status": "not_ready",
        "service": "@876/billing-api",
        "migration": "unavailable",
        "writer": "none",
    }


async def test_request_id_is_preserved() -> None:
    app = create_app(Settings(environment="test"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health", headers={"x-request-id": "req_test"})

    assert response.headers["x-request-id"] == "req_test"


async def test_metrics_expose_bounded_route_labels_and_writer_state() -> None:
    app = create_app(Settings(environment="test", billing_writer="none"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        await client.get("/health")
        response = await client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert 'billing_api_info{environment="test",writer="none"} 1.0' in response.text
    assert 'billing_api_http_requests_total{method="GET",route="/health",status="200"}' in response.text
