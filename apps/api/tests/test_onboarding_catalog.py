from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from domains.onboarding.router import submit_session
from services.onboarding_catalog import onboarding_catalog, organization_catalog, validate_onboarding_answers


def test_jamaica_catalog_covers_legal_parties_and_locations() -> None:
    catalog = organization_catalog("jm")
    fields = {field.key: field for section in catalog.sections for field in section.fields}

    assert catalog.schema_version == 1
    assert catalog.country_code == "JM"
    assert fields["trn"].sensitive is True
    assert fields["directors"].field_type == "collection"
    assert fields["beneficial_owners"].min_items == 1
    assert fields["locations"].field_type == "collection"
    assert fields["company_type"].label == "Organization type"
    assert (
        dict((option.value, option.label) for option in fields["entity_type"].options)["limited_company"]
        == "Limited-liability organization"
    )
    assert (
        dict((option.value, option.label) for option in fields["beneficial_owners"].item_fields[-1].options)[
            "policy_control"
        ]
        == "Determines organization policy"
    )


def test_core_organization_catalog_is_country_agnostic() -> None:
    jamaica_catalog = onboarding_catalog("organization", "core", "jm")
    us_catalog = onboarding_catalog("organization", "core", "us")
    section = jamaica_catalog.sections[0]
    fields = {field.key: field for field in section.fields}

    assert jamaica_catalog.country_code == "JM"
    assert us_catalog.country_code == "US"
    assert section.key == "business_profile"
    assert section.position == 0
    assert fields["business_category"].field_type == "select"
    assert fields["business_category"].required is True
    assert [(option.value, option.label) for option in fields["business_category"].options] == [
        ("retail", "Retail"),
        ("food_service", "Food service"),
        ("logistics", "Logistics and delivery"),
        ("professional_services", "Professional services"),
        ("health", "Health and wellness"),
        ("education", "Education"),
        ("technology", "Technology"),
        ("manufacturing", "Manufacturing"),
        ("construction", "Construction"),
        ("finance", "Financial services"),
        ("tourism", "Tourism and hospitality"),
        ("agriculture", "Agriculture"),
        ("other", "Other"),
    ]
    assert fields["employee_count_range"].required is False


def test_couriers_application_catalog_describes_workspace_setup() -> None:
    catalog = onboarding_catalog("application", "876-couriers", "us")
    section = catalog.sections[0]
    fields = {field.key: field for field in section.fields}

    assert catalog.target_key == "876-couriers"
    assert catalog.country_code == "US"
    assert section.key == "workspace"
    assert section.position == 0
    assert fields["platform_name"].label == "Platform name"
    assert fields["platform_name"].placeholder == "Rocket Express"
    assert fields["platform_name"].description == "Shown to your customers across the courier platform."
    assert fields["platform_name"].required is True
    assert fields["mailbox_prefix"].required is False
    assert fields["mailbox_prefix"].pattern == r"^[A-Za-z0-9]{1,6}$"


def test_unknown_application_catalog_raises_value_error() -> None:
    with pytest.raises(
        ValueError,
        match=r"^No onboarding catalog is registered for application/unknown-app\.$",
    ):
        onboarding_catalog("application", "unknown-app", "JM")


def test_required_organization_answers_are_catalog_driven() -> None:
    issues = validate_onboarding_answers(organization_catalog("JM"), {})

    paths = {issue.path for issue in issues}
    assert "answers.legal_name" in paths
    assert "answers.coj_registration_number" in paths
    assert "answers.trn" in paths
    assert "answers.directors" in paths
    assert "answers.beneficial_owners" in paths
    assert "answers.locations" in paths


def test_trn_and_collection_item_shapes_are_validated() -> None:
    catalog = organization_catalog("JM")
    answers = {
        "trn": "invalid",
        "directors": [{"first_name": "Ada", "unknown": "value"}],
    }

    issues = validate_onboarding_answers(catalog, answers)
    issue_pairs = {(issue.path, issue.code) for issue in issues}

    assert ("answers.trn", "invalid_format") in issue_pairs
    assert ("answers.directors.0.last_name", "required") in issue_pairs
    assert ("answers.directors.0.title", "required") in issue_pairs
    assert ("answers.directors.0.unknown", "unknown_field") in issue_pairs


def test_catalog_rejects_unknown_top_level_answers() -> None:
    issues = validate_onboarding_answers(
        organization_catalog("JM"),
        {"database_column": "must not leak into the form"},
    )

    assert any(issue.path == "answers.database_column" and issue.code == "unknown_field" for issue in issues)


def test_gct_number_is_required_only_for_registered_organizations() -> None:
    catalog = organization_catalog("JM")

    not_registered = validate_onboarding_answers(catalog, {"gct_registered": False})
    registered = validate_onboarding_answers(catalog, {"gct_registered": True})

    assert not any(issue.path == "answers.gct_number" for issue in not_registered)
    assert any(issue.path == "answers.gct_number" and issue.code == "required" for issue in registered)


def test_application_answers_use_required_and_pattern_validation() -> None:
    catalog = onboarding_catalog("application", "876-couriers", "JM")

    missing_name = validate_onboarding_answers(catalog, {})
    valid_prefix = validate_onboarding_answers(catalog, {"platform_name": "Rocket Express", "mailbox_prefix": "ABC12"})
    long_prefix = validate_onboarding_answers(
        catalog, {"platform_name": "Rocket Express", "mailbox_prefix": "toolong7"}
    )
    invalid_prefix = validate_onboarding_answers(
        catalog,
        {"platform_name": "Rocket Express", "mailbox_prefix": "bad-char!"},
    )

    assert any(issue.path == "answers.platform_name" and issue.code == "required" for issue in missing_name)
    assert valid_prefix == []
    assert any(issue.path == "answers.mailbox_prefix" and issue.code == "invalid_format" for issue in long_prefix)
    assert any(issue.path == "answers.mailbox_prefix" and issue.code == "invalid_format" for issue in invalid_prefix)


def test_core_business_category_rejects_unknown_options() -> None:
    catalog = onboarding_catalog("organization", "core", "JM")
    issues = validate_onboarding_answers(catalog, {"business_category": "unknown"})

    assert any(issue.path == "answers.business_category" and issue.code == "invalid_option" for issue in issues)


async def test_submit_uses_the_saved_session_catalog_revision_after_a_bump(monkeypatch) -> None:
    saved = SimpleNamespace(
        id="obs_saved",
        organization_id="org_1",
        target_type="organization",
        target_key="global",
        country_code="JM",
        schema_version=1,
        catalog_revision=1,
        status="draft",
        answers=[],
        submitted_at=None,
        completed_at=None,
        created_at=1,
        updated_at=1,
    )
    repository = SimpleNamespace(
        retrieve_existing_for_update=AsyncMock(return_value=saved),
        submit=AsyncMock(return_value=saved),
    )
    db = SimpleNamespace(get=AsyncMock(return_value=object()))
    monkeypatch.setattr("domains.onboarding.router.OnboardingRepository", lambda _db: repository)
    monkeypatch.setattr("domains.onboarding.router.validate_onboarding_answers", Mock(return_value=[]))
    monkeypatch.setattr("services.onboarding_catalog.CATALOG_REVISION", 2)

    response = await submit_session(
        "org_1",
        "organization",
        "global",
        db,
        True,
        "JM",
    )

    assert response.catalog_revision == 1
    repository.retrieve_existing_for_update.assert_awaited_once_with(
        "org_1",
        "organization",
        "global",
        country_code="JM",
        schema_version=1,
    )
