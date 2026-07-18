from httpx import ASGITransport, AsyncClient

from main import create_app


async def test_request_id_is_generated_and_returned() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-request-id"].startswith("req_")


async def test_request_id_header_is_preserved() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health", headers={"x-request-id": "req_test"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "req_test"
