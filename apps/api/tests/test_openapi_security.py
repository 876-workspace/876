from httpx import ASGITransport, AsyncClient

from main import create_app


async def test_openapi_docs_are_available() -> None:
    transport = ASGITransport(app=create_app())

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    assert "/health" in response.json()["paths"]


async def test_health_route_is_documented() -> None:
    transport = ASGITransport(app=create_app())

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200

    health_path = response.json()["paths"]["/health"]["get"]
    assert health_path["summary"] == "Check API health"
    assert "response_model" not in health_path  # model is static in schema


async def test_data_routes_use_domain_docs_metadata() -> None:
    transport = ASGITransport(app=create_app())

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200

    schema = response.json()
    assert schema["paths"]["/users"]["get"]["summary"] == "List users"
    assert "Admin only" in schema["paths"]["/users"]["get"]["description"]
    assert schema["paths"]["/memberships"]["post"]["summary"] == "Create membership"
    assert "201" in schema["paths"]["/memberships"]["post"]["responses"]
    assert schema["paths"]["/apps/{app_id}"]["delete"]["summary"] == "Delete an app"
