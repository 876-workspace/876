"""File serialization rules — URL only for ready public assets."""

from __future__ import annotations

from types import SimpleNamespace

from core.config import Settings
from domains.files.serialization import public_asset_url, serialize_file


def make_file_row(**overrides: object) -> SimpleNamespace:
    base = {
        "id": "file_01ABC",
        "owner_type": "organization",
        "owner_id": "org_123",
        "source_app_id": "876-couriers",
        "purpose": "organization_logo",
        "category": "attachment",
        "audience": "public",
        "status": "ready",
        "original_name": "logo.png",
        "content_type": "image/png",
        "size_bytes": 100,
        "version_id": "ver_01ABC",
        "object_key": "organizations/org_123/branding/file_01ABC/ver_01ABC",
        "created_at": 1_000,
        "updated_at": 2_000,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_public_asset_url_strips_trailing_slash_from_base() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test/")
    row = make_file_row()

    assert public_asset_url(settings, row) == (
        "https://assets.example.test/organizations/org_123/branding/file_01ABC/ver_01ABC"
    )


def test_serialize_ready_public_file_includes_stable_url() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test")
    row = make_file_row(status="ready", audience="public")

    payload = serialize_file(row, settings)  # type: ignore[arg-type]

    assert payload.object == "file"
    assert payload.url == ("https://assets.example.test/organizations/org_123/branding/file_01ABC/ver_01ABC")
    assert payload.status == "ready"
    assert payload.audience == "public"
    assert payload.category == "attachment"


def test_serialize_pending_public_file_has_null_url() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test")
    row = make_file_row(status="pending", audience="public")

    payload = serialize_file(row, settings)  # type: ignore[arg-type]

    assert payload.url is None
    assert payload.status == "pending"


def test_serialize_ready_private_file_has_null_url() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test")
    row = make_file_row(status="ready", audience="private")

    payload = serialize_file(row, settings)  # type: ignore[arg-type]

    assert payload.url is None
    assert payload.audience == "private"


def test_serialize_ready_organization_file_has_null_url() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test")
    row = make_file_row(status="ready", audience="organization")

    payload = serialize_file(row, settings)  # type: ignore[arg-type]

    assert payload.url is None


def test_serialize_ready_app_audience_file_has_null_url() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test")
    row = make_file_row(status="ready", audience="app")

    payload = serialize_file(row, settings)  # type: ignore[arg-type]

    assert payload.url is None


def test_serialize_failed_public_file_has_null_url() -> None:
    settings = Settings(r2_assets_base_url="https://assets.example.test")
    row = make_file_row(status="failed", audience="public")

    payload = serialize_file(row, settings)  # type: ignore[arg-type]

    assert payload.url is None
