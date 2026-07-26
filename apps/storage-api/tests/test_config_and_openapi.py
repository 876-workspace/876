"""Settings helpers and OpenAPI contract surface."""

from __future__ import annotations

from core.config import Settings
from tests.conftest import StorageHarness


def test_cors_origins_parses_and_strips_whitespace() -> None:
    settings = Settings(cors_allowed_origins=" https://a.example ,https://b.example, ")

    assert settings.cors_origins == ["https://a.example", "https://b.example"]


def test_cors_origins_empty_string_is_empty_list() -> None:
    settings = Settings(cors_allowed_origins="")

    assert settings.cors_origins == []


def test_is_production_property() -> None:
    assert Settings(environment="production").is_production is True
    assert Settings(environment="test").is_production is False
    assert Settings(environment="development").is_production is False


def test_openapi_documents_upload_and_file_routes(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/v1/uploads" in paths
    assert "post" in paths["/v1/uploads"]
    assert "/v1/uploads/{session_id}/complete" in paths
    assert "/v1/files/{file_id}" in paths
    assert "get" in paths["/v1/files/{file_id}"]
    assert "delete" in paths["/v1/files/{file_id}"]
    assert "/v1/files/{file_id}/read-url" in paths


def test_openapi_does_not_document_health_routes(storage_harness: StorageHarness) -> None:
    paths = storage_harness.client.get("/openapi.json").json()["paths"]

    assert "/health" not in paths
    assert "/ready" not in paths


def test_validation_error_shape_is_storage_invalid_request(
    storage_harness: StorageHarness,
) -> None:
    response = storage_harness.client.post(
        "/v1/uploads",
        headers={"x-internal-key": "storage-test-key"},
        json={"not": "valid"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "storage/invalid-request",
            "message": "The request body or parameters failed validation.",
        }
    }
    assert storage_harness.provider.create_upload_calls == []
