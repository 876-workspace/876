from httpx import ASGITransport, AsyncClient

from main import create_app


async def test_health_returns_service_status() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "object": "health",
        "status": "ok",
        "service": "@876/api",
    }
