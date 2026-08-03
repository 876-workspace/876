"""Architecture invariants from storage-architecture.md — must not regress."""

from __future__ import annotations

import inspect
import sqlite3
from string import Formatter

import pytest

from domains.files import schemas as file_schemas
from domains.uploads import schemas as upload_schemas
from domains.uploads.routes import UPLOAD_ROUTES
from tests.conftest import StorageHarness
from tests.test_storage_api import AUTH_HEADERS, OBJECT_KEY, make_uploaded_object, open_upload


def test_upload_create_schema_forbids_client_classification_fields() -> None:
    fields = set(upload_schemas.UploadCreate.model_fields)
    forbidden = {
        "category",
        "audience",
        "bucket",
        "object_key",
        "provider",
        "purpose",
        "visibility",
        "delivery",
        "version_id",
        "file_id",
    }
    assert fields.isdisjoint(forbidden)
    assert upload_schemas.UploadCreate.model_config.get("extra") == "forbid"


def test_file_response_has_no_visibility_or_delivery_fields() -> None:
    fields = set(file_schemas.FileResponse.model_fields)
    assert "visibility" not in fields
    assert "delivery" not in fields
    assert "bucket" not in fields
    assert "object_key" not in fields
    assert "category" in fields
    assert "audience" in fields


def test_read_url_request_forbids_public_flag() -> None:
    assert file_schemas.ReadUrlRequest.model_config.get("extra") == "forbid"
    assert "public" not in file_schemas.ReadUrlRequest.model_fields


def test_primary_logo_is_not_library_browsable() -> None:
    route = UPLOAD_ROUTES["organization.primaryLogo"]
    assert route.category == "attachment"
    assert route.audience == "public"


@pytest.mark.parametrize(
    ("route_key", "purpose", "owner_type", "key_template"),
    [
        (
            "app.logo",
            "app_logo",
            "platform",
            "apps/{owner_id}/branding/{file_id}/{version_id}",
        ),
        (
            "user.avatar",
            "user_avatar",
            "user",
            "users/{owner_id}/avatar/{file_id}/{version_id}",
        ),
    ],
)
def test_new_public_image_routes_match_the_declared_policy(
    route_key: str,
    purpose: str,
    owner_type: str,
    key_template: str,
) -> None:
    route = UPLOAD_ROUTES[route_key]

    assert route.key == route_key
    assert route.purpose == purpose
    assert route.owner_type == owner_type
    assert route.allowed_content_types == ("image/png", "image/jpeg", "image/webp")
    assert route.max_size_bytes == 5 * 1024 * 1024
    assert route.category == "attachment"
    assert route.audience == "public"
    assert route.key_template == key_template


def test_every_upload_route_preserves_storage_architecture_invariants() -> None:
    server_generated_key_fields = {"owner_id", "file_id", "version_id"}

    for catalog_key, route in UPLOAD_ROUTES.items():
        template_fields = {
            field_name
            for _, field_name, _, _ in Formatter().parse(route.key_template)
            if field_name is not None
        }

        assert route.key == catalog_key
        assert route.category == "attachment"
        assert "image/svg+xml" not in route.allowed_content_types
        assert template_fields <= server_generated_key_fields
        assert {"file_id", "version_id"} <= template_fields


@pytest.mark.parametrize(
    ("route_key", "owner_type", "owner_id"),
    [
        ("app.logo", "platform", "app_123"),
        ("user.avatar", "user", "user_123"),
    ],
)
def test_new_public_image_routes_reject_svg(
    storage_harness: StorageHarness,
    route_key: str,
    owner_type: str,
    owner_id: str,
) -> None:
    response = open_upload(
        storage_harness,
        {
            "route_key": route_key,
            "owner_type": owner_type,
            "owner_id": owner_id,
            "content_type": "image/svg+xml",
        },
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "storage/mime-not-allowed"
    assert storage_harness.provider.create_upload_calls == []


@pytest.mark.parametrize(
    ("route_key", "owner_type", "owner_id"),
    [
        ("app.logo", "platform", "app_123"),
        ("user.avatar", "user", "user_123"),
    ],
)
def test_new_public_image_routes_reject_oversize_files(
    storage_harness: StorageHarness,
    route_key: str,
    owner_type: str,
    owner_id: str,
) -> None:
    response = open_upload(
        storage_harness,
        {
            "route_key": route_key,
            "owner_type": owner_type,
            "owner_id": owner_id,
            "size_bytes": 5 * 1024 * 1024 + 1,
        },
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "storage/file-too-large"
    assert storage_harness.provider.create_upload_calls == []


def test_app_logo_platform_owner_upload_is_admitted_and_serialized(
    storage_harness: StorageHarness,
) -> None:
    opened = open_upload(
        storage_harness,
        {
            "route_key": "app.logo",
            "owner_type": "platform",
            "owner_id": "app_123",
        },
    )
    assert opened.status_code == 201

    object_key = "apps/app_123/branding/file_01TESTFILE/ver_01TESTVERSION"
    storage_harness.provider.objects[("assets-test", object_key)] = ("image/png", 84_213)
    completed = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert completed.status_code == 200
    assert completed.json()["owner_type"] == "platform"
    assert completed.json()["owner_id"] == "app_123"
    assert completed.json()["purpose"] == "app_logo"
    assert completed.json()["category"] == "attachment"
    assert completed.json()["audience"] == "public"
    assert completed.json()["url"] == f"https://assets.example.test/{object_key}"

    with sqlite3.connect(storage_harness.database_path) as connection:
        platform_quota_count = connection.execute(
            "SELECT COUNT(*) FROM storage_quotas WHERE subject_type = ? AND subject_id = ?",
            ("platform", "app_123"),
        ).fetchone()[0]
    assert platform_quota_count == 0


def test_object_key_never_includes_client_filename(storage_harness: StorageHarness) -> None:
    response = open_upload(
        storage_harness,
        {"file_name": "Customer Invoice #42 (final).PNG"},
    )
    assert response.status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        object_key, original_name = connection.execute(
            "SELECT object_key, original_name FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert original_name == "Customer Invoice #42 (final).PNG"
    assert "Invoice" not in object_key
    assert "final" not in object_key
    assert object_key == OBJECT_KEY
    assert object_key.startswith("organizations/org_123/branding/")


def test_public_assets_use_assets_bucket_not_files_bucket(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        bucket, audience = connection.execute(
            "SELECT bucket, audience FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert audience == "public"
    assert bucket == "assets-test"
    assert bucket != "files-test"


def test_completion_never_trusts_browser_claim_without_head(
    storage_harness: StorageHarness,
) -> None:
    assert open_upload(storage_harness).status_code == 201
    # No object placed in the fake provider.

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "storage/upload-incomplete"
    assert len(storage_harness.provider.head_calls) == 1


def test_size_mismatch_deletes_object_before_marking_ready(
    storage_harness: StorageHarness,
) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness, size_bytes=1)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 422
    assert storage_harness.provider.delete_calls
    assert ("assets-test", OBJECT_KEY) not in storage_harness.provider.objects
    with sqlite3.connect(storage_harness.database_path) as connection:
        status = connection.execute(
            "SELECT status FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()[0]
    assert status == "failed"


def test_soft_delete_does_not_remove_bytes_inline(storage_harness: StorageHarness) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)
    assert (
        storage_harness.client.post(
            "/v1/uploads/upl_01TESTSESSION/complete",
            headers=AUTH_HEADERS,
            json={},
        ).status_code
        == 200
    )
    storage_harness.provider.objects[("assets-test", OBJECT_KEY)] = ("image/png", 84_213)

    deleted = storage_harness.client.delete("/v1/files/file_01TESTFILE", headers=AUTH_HEADERS)

    assert deleted.status_code == 200
    assert storage_harness.provider.delete_calls == []
    assert ("assets-test", OBJECT_KEY) in storage_harness.provider.objects


def test_upload_complete_schema_is_empty_forbid() -> None:
    assert set(upload_schemas.UploadComplete.model_fields) == set()
    assert upload_schemas.UploadComplete.model_config.get("extra") == "forbid"


def test_file_schemas_source_does_not_mention_visibility() -> None:
    source = inspect.getsource(file_schemas)
    assert "visibility" not in source
    assert "delivery" not in source
