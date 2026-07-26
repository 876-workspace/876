"""Serialization matrix — URL only when public AND ready."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from core.config import Settings
from domains.files.serialization import public_asset_url, serialize_file

SETTINGS = Settings(r2_assets_base_url="https://cdn.example.test/")


def row(**overrides: object) -> SimpleNamespace:
    base = {
        "id": "file_1",
        "owner_type": "organization",
        "owner_id": "org_1",
        "source_app_id": "app_1",
        "purpose": "organization_logo",
        "category": "attachment",
        "audience": "public",
        "status": "ready",
        "original_name": "a.png",
        "content_type": "image/png",
        "size_bytes": 10,
        "version_id": "ver_1",
        "object_key": "organizations/org_1/branding/file_1/ver_1",
        "created_at": 1,
        "updated_at": 2,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.mark.parametrize(
    ("audience", "status", "expect_url"),
    [
        ("public", "ready", True),
        ("public", "pending", False),
        ("public", "uploaded", False),
        ("public", "failed", False),
        ("public", "deleted", False),
        ("private", "ready", False),
        ("organization", "ready", False),
        ("app", "ready", False),
        ("private", "pending", False),
        ("organization", "failed", False),
        ("app", "deleted", False),
    ],
)
def test_url_matrix(audience: str, status: str, expect_url: bool) -> None:
    payload = serialize_file(row(audience=audience, status=status), SETTINGS)  # type: ignore[arg-type]
    if expect_url:
        assert payload.url == (
            "https://cdn.example.test/organizations/org_1/branding/file_1/ver_1"
        )
    else:
        assert payload.url is None


@pytest.mark.parametrize(
    "category",
    ["library", "attachment", "system"],
)
def test_categories_pass_through(category: str) -> None:
    payload = serialize_file(row(category=category, audience="private", status="ready"), SETTINGS)  # type: ignore[arg-type]
    assert payload.category == category
    assert payload.url is None


def test_public_asset_url_no_double_slash() -> None:
    r = row()
    settings = Settings(r2_assets_base_url="https://cdn.example.test///")
    assert public_asset_url(settings, r).startswith("https://cdn.example.test/")
    assert "//organizations" not in public_asset_url(settings, r).replace("https://", "")


def test_all_fields_round_trip() -> None:
    payload = serialize_file(row(), SETTINGS)  # type: ignore[arg-type]
    assert payload.model_dump() == {
        "object": "file",
        "id": "file_1",
        "owner_type": "organization",
        "owner_id": "org_1",
        "source_app_id": "app_1",
        "purpose": "organization_logo",
        "category": "attachment",
        "audience": "public",
        "status": "ready",
        "original_name": "a.png",
        "content_type": "image/png",
        "size_bytes": 10,
        "version_id": "ver_1",
        "url": "https://cdn.example.test/organizations/org_1/branding/file_1/ver_1",
        "created_at": 1,
        "updated_at": 2,
    }
