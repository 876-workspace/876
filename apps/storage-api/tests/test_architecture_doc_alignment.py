"""Guardrail: implemented classification vocabulary matches architecture rules."""

from __future__ import annotations

from pathlib import Path

from domains.files.schemas import FileResponse
from domains.uploads.routes import UPLOAD_ROUTES

RULE_PATHS = (
    Path("/workspaces/876/.grok/rules/storage-architecture.md"),
    Path("/workspaces/876/.claude/rules/storage-architecture.md"),
    Path("/workspaces/876/.agents/rules/storage-architecture.md"),
)


def test_rule_files_use_category_and_audience_not_visibility_delivery() -> None:
    for path in RULE_PATHS:
        if not path.exists():
            continue
        text = path.read_text()
        assert "`category`" in text or "category" in text, path
        assert "`audience`" in text or "audience" in text, path
        # Retired terms must not be the live axis names in the rule body tables.
        assert "| `managed` |" not in text, path
        assert "| `visibility` |" not in text, path
        assert "Axis 2 — `delivery`" not in text, path


def test_file_response_enum_matches_architecture_axes() -> None:
    category = FileResponse.model_fields["category"].annotation
    audience = FileResponse.model_fields["audience"].annotation
    # Literal unions are represented as typing.Literal[...]
    assert "library" in str(category)
    assert "attachment" in str(category)
    assert "system" in str(category)
    assert "private" in str(audience)
    assert "organization" in str(audience)
    assert "app" in str(audience)
    assert "public" in str(audience)
    assert "managed" not in str(category)
    assert "visibility" not in FileResponse.model_fields


def test_primary_logo_matches_architecture_example() -> None:
    route = UPLOAD_ROUTES["organization.primaryLogo"]
    assert route.category == "attachment"
    assert route.audience == "public"
    assert route.purpose == "organization_logo"
