"""projects.attachment upload route policy — server-fixed classification."""

from __future__ import annotations

import sqlite3
from typing import Any

import pytest

from core.errors import AppHTTPException
from domains.uploads.router import _validate_upload
from domains.uploads.routes import UPLOAD_ROUTES
from domains.uploads.schemas import UploadCreate
from tests.conftest import StorageHarness
from tests.test_storage_api import AUTH_HEADERS, open_upload

MAX_BYTES = 25 * 1024 * 1024

ALLOWED_TYPES = (
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
)

PROJECTS_UPLOAD: dict[str, Any] = {
    "route_key": "projects.attachment",
    "owner_type": "organization",
    "owner_id": "org_123",
    "actor_user_id": "user_456",
    "source_app_id": "876-projects",
    "file_name": "spec.pdf",
    "content_type": "application/pdf",
    "size_bytes": 1024,
}

EXPECTED_OBJECT_KEY = "organizations/org_123/projects/file_01TESTFILE/ver_01TESTVERSION"


def open_projects_upload(harness: StorageHarness, overrides: dict[str, Any] | None = None) -> Any:
    body = {**PROJECTS_UPLOAD, **(overrides or {})}
    return harness.client.post("/v1/uploads", headers=AUTH_HEADERS, json=body)


def make_projects_body(**overrides: object) -> UploadCreate:
    data = {**PROJECTS_UPLOAD, **overrides}
    return UploadCreate.model_validate(data)


def test_route_resolves_by_key_with_fixed_classification() -> None:
    route = UPLOAD_ROUTES["projects.attachment"]

    assert route.key == "projects.attachment"
    assert route.purpose == "projects_attachment"
    assert route.owner_type == "organization"
    assert route.max_size_bytes == MAX_BYTES
    assert route.category == "attachment"
    assert route.audience == "organization"
    assert route.key_template == "organizations/{owner_id}/projects/{file_id}/{version_id}"


def test_route_allows_documents_images_and_zip_without_svg() -> None:
    route = UPLOAD_ROUTES["projects.attachment"]

    assert route.allowed_content_types == ALLOWED_TYPES
    assert "image/svg+xml" not in route.allowed_content_types


def test_key_template_uses_only_server_placeholders() -> None:
    route = UPLOAD_ROUTES["projects.attachment"]
    rendered = route.key_template.format(
        owner_id="org_123",
        file_id="file_abc",
        version_id="ver_xyz",
    )

    assert rendered == "organizations/org_123/projects/file_abc/ver_xyz"
    assert "{file_name}" not in route.key_template
    assert "{original_name}" not in route.key_template


@pytest.mark.parametrize("content_type", list(ALLOWED_TYPES))
def test_validate_upload_accepts_allowlisted_mime(content_type: str) -> None:
    route = _validate_upload(make_projects_body(content_type=content_type))

    assert route.key == "projects.attachment"
    assert content_type in route.allowed_content_types


@pytest.mark.parametrize(
    "content_type",
    [
        "image/svg+xml",
        "text/html",
        "application/javascript",
        "video/mp4",
        "IMAGE/PNG",
    ],
)
def test_validate_upload_rejects_forbidden_mime(content_type: str) -> None:
    with pytest.raises(AppHTTPException) as exc:
        _validate_upload(make_projects_body(content_type=content_type))

    assert exc.value.app_code == "storage/mime-not-allowed"


@pytest.mark.parametrize("size_bytes", [MAX_BYTES + 1, 100 * 1024 * 1024, 0])
def test_validate_upload_rejects_oversized_or_empty(size_bytes: int) -> None:
    with pytest.raises(AppHTTPException) as exc:
        _validate_upload(make_projects_body(size_bytes=size_bytes))

    assert exc.value.app_code == "storage/file-too-large"


def test_validate_upload_accepts_exact_max_size() -> None:
    route = _validate_upload(make_projects_body(size_bytes=MAX_BYTES))

    assert route.max_size_bytes == MAX_BYTES


def test_http_route_resolves_by_key(storage_harness: StorageHarness) -> None:
    response = open_projects_upload(storage_harness)

    assert response.status_code == 201
    assert response.json()["file_id"] == "file_01TESTFILE"


def test_http_svg_is_rejected(storage_harness: StorageHarness) -> None:
    response = open_projects_upload(storage_harness, {"content_type": "image/svg+xml"})

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "storage/mime-not-allowed"
    assert storage_harness.provider.create_upload_calls == []


def test_http_oversized_declared_file_is_rejected(storage_harness: StorageHarness) -> None:
    response = open_projects_upload(storage_harness, {"size_bytes": MAX_BYTES + 1})

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "storage/file-too-large"
    assert storage_harness.provider.create_upload_calls == []


def test_http_object_key_matches_template_without_client_filename(
    storage_harness: StorageHarness,
) -> None:
    response = open_projects_upload(storage_harness, {"file_name": "../../../evil.pdf"})

    assert response.status_code == 201
    with sqlite3.connect(storage_harness.database_path) as connection:
        original_name, object_key = connection.execute(
            "SELECT original_name, object_key FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert original_name == "../../../evil.pdf"
    assert object_key == EXPECTED_OBJECT_KEY
    assert "evil" not in object_key


def test_http_category_and_audience_are_fixed(storage_harness: StorageHarness) -> None:
    assert open_projects_upload(storage_harness).status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        row = connection.execute(
            "SELECT category, audience, purpose, bucket, object_key FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert row == ("attachment", "organization", "projects_attachment", "files-test", EXPECTED_OBJECT_KEY)


def test_http_category_audience_cannot_be_overridden(storage_harness: StorageHarness) -> None:
    body = {**PROJECTS_UPLOAD, "category": "library", "audience": "public"}
    response = storage_harness.client.post("/v1/uploads", headers=AUTH_HEADERS, json=body)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"
    assert storage_harness.provider.create_upload_calls == []


def test_http_wrong_owner_type_is_rejected(storage_harness: StorageHarness) -> None:
    response = open_projects_upload(storage_harness, {"owner_type": "user"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-owner"


def test_http_unknown_projects_like_route_is_not_found(storage_harness: StorageHarness) -> None:
    response = open_upload(storage_harness, {"route_key": "projects.attachments"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/route-not-found"
