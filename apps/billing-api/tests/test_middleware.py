from httpx import ASGITransport, AsyncClient

from core.config import Settings
from core.middleware import envelope_payload
from main import create_app


def test_envelopes_success_payload() -> None:
    resource = {"object": "customer", "id": "cus_123"}
    assert envelope_payload(resource, 200) == {"data": resource, "error": None}


def test_strips_server_status_from_error() -> None:
    assert envelope_payload(
        {
            "error": {
                "code": "billing/forbidden",
                "message": "Forbidden.",
                "httpStatus": 403,
            }
        },
        403,
    ) == {
        "data": None,
        "error": {"code": "billing/forbidden", "message": "Forbidden."},
    }


def test_normalizes_string_error() -> None:
    assert envelope_payload({"error": "billing/unavailable"}, 503) == {
        "data": None,
        "error": {
            "code": "billing/unavailable",
            "message": "billing/unavailable",
        },
    }


async def test_http_success_is_enveloped() -> None:
    app = create_app(Settings(environment="test"))

    @app.get("/api/v1/example")
    async def example() -> dict[str, str]:
        return {"object": "example"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/example")

    assert response.json() == {
        "data": {"object": "example"},
        "error": None,
    }


async def test_http_not_found_is_client_safe() -> None:
    app = create_app(Settings(environment="test"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/missing")

    assert response.status_code == 404
    assert response.json() == {
        "data": None,
        "error": {"code": "error/not-found", "message": "Not Found"},
    }


async def test_mutation_is_rejected_when_fastapi_is_not_the_writer() -> None:
    app = create_app(Settings(environment="test", billing_writer="none"))

    @app.post("/api/v1/example")
    async def example() -> dict[str, str]:
        return {"object": "example"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/api/v1/example")

    assert response.status_code == 503
    assert response.headers["x-billing-writer"] == "none"
    assert response.json() == {
        "data": None,
        "error": {
            "code": "billing/writer-inactive",
            "message": "The Billing API is not the active writer.",
        },
    }


async def test_mutation_is_allowed_when_fastapi_is_the_writer() -> None:
    app = create_app(Settings(environment="test", billing_writer="fastapi"))

    @app.post("/api/v1/example")
    async def example() -> dict[str, str]:
        return {"object": "example"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/api/v1/example")

    assert response.status_code == 200
    assert response.headers["x-billing-writer"] == "fastapi"
