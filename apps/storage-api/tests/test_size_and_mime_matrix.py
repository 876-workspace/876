"""Exhaustive size + MIME HTTP matrix against organization.primaryLogo."""

from __future__ import annotations

import pytest

from tests.conftest import StorageHarness
from tests.test_storage_api import open_upload

MAX = 5 * 1024 * 1024


@pytest.mark.parametrize(
    ("size", "status", "code"),
    [
        (1, 201, None),
        (2, 201, None),
        (1024, 201, None),
        (MAX - 1, 201, None),
        (MAX, 201, None),
        (0, 413, "storage/file-too-large"),
        (-1, 413, "storage/file-too-large"),
        (MAX + 1, 413, "storage/file-too-large"),
        (MAX + 1000, 413, "storage/file-too-large"),
    ],
)
def test_size_matrix(
    storage_harness: StorageHarness,
    size: int,
    status: int,
    code: str | None,
) -> None:
    # Unique content_type not needed; fixed ids mean only one 201 per harness.
    # Use a fresh harness implicitly via fixture per test invocation (yes).
    response = open_upload(storage_harness, {"size_bytes": size})
    assert response.status_code == status
    if code:
        assert response.json()["error"]["code"] == code
        assert storage_harness.provider.create_upload_calls == []
    else:
        assert response.json()["headers"]["Content-Length"] == str(size)


@pytest.mark.parametrize(
    ("content_type", "status", "code"),
    [
        ("image/png", 201, None),
        ("image/jpeg", 201, None),
        ("image/webp", 201, None),
        ("image/svg+xml", 415, "storage/mime-not-allowed"),
        ("image/gif", 415, "storage/mime-not-allowed"),
        ("image/bmp", 415, "storage/mime-not-allowed"),
        ("image/tiff", 415, "storage/mime-not-allowed"),
        ("application/pdf", 415, "storage/mime-not-allowed"),
        ("text/html", 415, "storage/mime-not-allowed"),
        ("application/javascript", 415, "storage/mime-not-allowed"),
        ("video/mp4", 415, "storage/mime-not-allowed"),
        ("audio/mpeg", 415, "storage/mime-not-allowed"),
        ("application/octet-stream", 415, "storage/mime-not-allowed"),
        ("image/png ", 415, "storage/mime-not-allowed"),
        (" image/png", 415, "storage/mime-not-allowed"),
        ("IMAGE/PNG", 415, "storage/mime-not-allowed"),
        ("image/PNG", 415, "storage/mime-not-allowed"),
        ("image/jpg", 415, "storage/mime-not-allowed"),
    ],
)
def test_mime_matrix(
    storage_harness: StorageHarness,
    content_type: str,
    status: int,
    code: str | None,
) -> None:
    response = open_upload(storage_harness, {"content_type": content_type})
    assert response.status_code == status
    if code:
        assert response.json()["error"]["code"] == code
    else:
        assert response.json()["headers"]["Content-Type"] == content_type


@pytest.mark.parametrize(
    "route_key",
    [
        "organization.logo",
        "organization.primary_logo",
        "org.primaryLogo",
        "user.avatar",
        "payment.receipt",
        "",
        "library.doc",
        "Organization.primaryLogo",
    ],
)
def test_unknown_routes(storage_harness: StorageHarness, route_key: str) -> None:
    if route_key == "":
        # empty may fail pydantic or route-not-found
        response = open_upload(storage_harness, {"route_key": route_key})
        assert response.status_code in {400, 404}
        return
    response = open_upload(storage_harness, {"route_key": route_key})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/route-not-found"
