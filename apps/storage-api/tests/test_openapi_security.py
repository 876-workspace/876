"""OpenAPI security scheme must gate the v1 surface."""

from __future__ import annotations

from tests.conftest import StorageHarness


def test_openapi_registers_internal_key_security_scheme(storage_harness: StorageHarness) -> None:
    schema = storage_harness.client.get("/openapi.json").json()

    schemes = schema["components"]["securitySchemes"]
    assert schemes["internalKey"] == {
        "type": "apiKey",
        "in": "header",
        "name": "x-internal-key",
    }


def test_every_v1_operation_requires_internal_key(storage_harness: StorageHarness) -> None:
    schema = storage_harness.client.get("/openapi.json").json()
    v1_ops = 0

    for path, operations in schema["paths"].items():
        if not path.startswith("/v1/"):
            continue
        for method, operation in operations.items():
            if method.startswith("x-") or not isinstance(operation, dict):
                continue
            v1_ops += 1
            assert operation.get("security") == [{"internalKey": []}], f"{method.upper()} {path}"

    assert v1_ops >= 5


def test_openapi_tags_include_files_and_uploads(storage_harness: StorageHarness) -> None:
    schema = storage_harness.client.get("/openapi.json").json()
    tag_names = {tag["name"] for tag in schema.get("tags", [])}
    assert "Files" in tag_names
    assert "Uploads" in tag_names


def test_upload_openapi_documents_size_and_verification_status_codes(
    storage_harness: StorageHarness,
) -> None:
    """Starlette renamed 413/422 constants; numeric codes must stay client-stable."""
    schema = storage_harness.client.get("/openapi.json").json()
    create_responses = schema["paths"]["/v1/uploads"]["post"]["responses"]
    complete_responses = schema["paths"]["/v1/uploads/{session_id}/complete"]["post"]["responses"]

    assert "413" in create_responses
    assert "415" in create_responses
    assert "422" in complete_responses
    assert "409" in complete_responses
    assert "410" in complete_responses
