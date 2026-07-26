"""Upload route catalog invariants — classification is server-fixed."""

from __future__ import annotations

from domains.uploads.routes import UPLOAD_ROUTES, UploadRoute


def test_primary_logo_route_is_attachment_public_and_org_owned() -> None:
    route = UPLOAD_ROUTES["organization.primaryLogo"]

    assert isinstance(route, UploadRoute)
    assert route.key == "organization.primaryLogo"
    assert route.purpose == "organization_logo"
    assert route.owner_type == "organization"
    assert route.category == "attachment"
    assert route.audience == "public"
    assert route.max_size_bytes == 5 * 1024 * 1024
    assert route.allowed_content_types == ("image/png", "image/jpeg", "image/webp")
    assert route.key_template == "organizations/{owner_id}/branding/{file_id}/{version_id}"


def test_primary_logo_route_does_not_accept_svg() -> None:
    route = UPLOAD_ROUTES["organization.primaryLogo"]

    assert "image/svg+xml" not in route.allowed_content_types
    assert "image/gif" not in route.allowed_content_types
    assert "application/pdf" not in route.allowed_content_types


def test_object_key_template_contains_only_server_placeholders() -> None:
    route = UPLOAD_ROUTES["organization.primaryLogo"]
    rendered = route.key_template.format(
        owner_id="org_123",
        file_id="file_abc",
        version_id="ver_xyz",
    )

    assert rendered == "organizations/org_123/branding/file_abc/ver_xyz"
    assert "{file_name}" not in route.key_template
    assert "{original_name}" not in route.key_template
    assert "email" not in route.key_template.lower()


def test_upload_routes_catalog_keys_match_route_key_fields() -> None:
    for catalog_key, route in UPLOAD_ROUTES.items():
        assert catalog_key == route.key
        assert route.category in {"library", "attachment", "system"}
        assert route.audience in {"private", "organization", "app", "public"}
        assert route.owner_type in {"organization", "user", "platform"}
        assert route.max_size_bytes > 0
        assert len(route.allowed_content_types) > 0
        assert "{file_id}" in route.key_template
        assert "{version_id}" in route.key_template


def test_attachment_is_the_default_category_for_primary_logo() -> None:
    """Architecture: attachment is the default; library requires explicit opt-in."""
    route = UPLOAD_ROUTES["organization.primaryLogo"]

    assert route.category != "library"
    assert route.category == "attachment"
