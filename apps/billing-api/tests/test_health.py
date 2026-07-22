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
    }


async def test_request_id_is_preserved() -> None:
    app = create_app(Settings(environment="test"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health", headers={"x-request-id": "req_test"})

    assert response.headers["x-request-id"] == "req_test"
