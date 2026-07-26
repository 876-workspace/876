"""OpenAPI contracts for file operations."""

from __future__ import annotations

from tests.conftest import StorageHarness


def test_file_routes_document_404(storage_harness: StorageHarness) -> None:
    schema = storage_harness.client.get("/openapi.json").json()
    paths = schema["paths"]

    retrieve = paths["/v1/files/{file_id}"]["get"]["responses"]
    delete = paths["/v1/files/{file_id}"]["delete"]["responses"]
    read_url = paths["/v1/files/{file_id}/read-url"]["post"]["responses"]

    assert "404" in retrieve
    assert "404" in delete
    assert "404" in read_url
    assert "502" in read_url


def test_file_operations_require_internal_key_security(
    storage_harness: StorageHarness,
) -> None:
    schema = storage_harness.client.get("/openapi.json").json()
    for path, method in (
        ("/v1/files/{file_id}", "get"),
        ("/v1/files/{file_id}", "delete"),
        ("/v1/files/{file_id}/read-url", "post"),
    ):
        op = schema["paths"][path][method]
        assert op["security"] == [{"internalKey": []}]


def test_upload_create_documents_400_404_413_415_502(
    storage_harness: StorageHarness,
) -> None:
    responses = storage_harness.client.get("/openapi.json").json()["paths"]["/v1/uploads"][
        "post"
    ]["responses"]
    for code in ("400", "404", "413", "415", "502"):
        assert code in responses, code


def test_openapi_info_identifies_storage_service(storage_harness: StorageHarness) -> None:
    info = storage_harness.client.get("/openapi.json").json()["info"]
    assert "Storage" in info["title"]
    assert info["version"] == "1.0.0"
