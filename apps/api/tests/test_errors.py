from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from core.security import require_api_key
from main import create_app


@pytest.mark.asyncio
async def test_validation_error_envelope() -> None:
    app = create_app()
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # POST to /apps with invalid payload to trigger RequestValidationError
        resp = await client.post("/apps", json={"name": 1234})

    assert resp.status_code == 422
    data = resp.json()
    assert data["data"] is None
    assert "error" in data
    assert data["error"]["code"] == "validation/invalid-request"
    assert data["error"]["message"] == "The request body or parameters failed validation."
    assert "details" in data["error"]

    # Verify input / ctx / url keys are dropped from each validation error
    details = data["error"]["details"]
    assert len(details) > 0
    for err in details:
        assert "input" not in err
        assert "ctx" not in err
        assert "url" not in err
        assert "loc" in err
        assert "msg" in err
        assert "type" in err


@pytest.mark.asyncio
async def test_starlette_http_exception_404() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/nonexistent-path-abc")

    assert resp.status_code == 404
    data = resp.json()
    assert data == {
        "data": None,
        "error": {
            "code": "error/not-found",
            "message": "Not Found",
        }
    }


@pytest.mark.asyncio
async def test_starlette_http_exception_405() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.post("/geo/countries")

    assert resp.status_code == 405
    data = resp.json()
    assert data == {
        "data": None,
        "error": {
            "code": "error/http",
            "message": "Method Not Allowed",
        }
    }


@pytest.mark.asyncio
async def test_country_not_found_app_http_exception(monkeypatch: pytest.MonkeyPatch) -> None:
    from db.repositories.geo import CountryRepository

    async def mock_get_by_code(self: Any, country_code: str) -> Any:
        return None

    monkeypatch.setattr(CountryRepository, "get_by_code", mock_get_by_code)

    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/geo/countries/XX/regions")

    assert resp.status_code == 404
    data = resp.json()
    assert data == {
        "data": None,
        "error": {
            "code": "country/not-found",
            "message": "Country not found.",
        }
    }
