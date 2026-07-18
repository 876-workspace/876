from dataclasses import replace

import pytest
from pydantic import ValidationError

from core.platform_apps import BILLING_APP_SLUG, COURIERS_APP_SLUG
from domains.provisioning.schemas import (
    ProvisioningDraftReplace,
    ProvisioningNoteCreate,
    ProvisioningPropertyInput,
)
from services.provisioning_catalog import FINANCE_RESOURCES, catalog_definitions, validate_draft
from services.provisioning_seeds import FINANCE_BOOTSTRAP_RESOURCES


def test_provisioning_property_requires_exact_typed_value() -> None:
    value = ProvisioningPropertyInput(
        key="defaultCurrency",
        value_type="reference",
        reference_namespace="currency",
        reference_key="JMD",
    )

    assert value.reference_key == "JMD"

    with pytest.raises(ValidationError):
        ProvisioningPropertyInput(
            key="defaultCurrency",
            value_type="reference",
            string_value="JMD",
            reference_namespace="currency",
            reference_key="JMD",
        )


def test_provisioning_profile_rejects_duplicate_resource_keys() -> None:
    resource = {
        "resource_type": "workspace",
        "key": "default",
        "position": 0,
        "properties": [],
    }

    with pytest.raises(ValidationError, match="type/key pairs must be unique"):
        ProvisioningDraftReplace(
            finance_dependency="none",
            finance_scopes=[],
            resources=[resource, {**resource, "position": 1}],
            steps=[],
        )


def test_provisioning_note_rejects_blank_body() -> None:
    with pytest.raises(ValidationError, match="cannot be blank"):
        ProvisioningNoteCreate(body="   ")


def test_embedded_finance_dependency_requires_unique_scopes() -> None:
    profile = ProvisioningDraftReplace(
        finance_dependency="embedded",
        finance_scopes=["billing.customers.read", "billing.invoices.write"],
    )

    assert profile.finance_scopes == ["billing.customers.read", "billing.invoices.write"]

    with pytest.raises(ValidationError, match="at least one scope"):
        ProvisioningDraftReplace(finance_dependency="embedded", finance_scopes=[])

    with pytest.raises(ValidationError, match="must be unique"):
        ProvisioningDraftReplace(
            finance_dependency="embedded",
            finance_scopes=["billing.customers.read", "billing.customers.read"],
        )


def test_manifest_protocol_rejects_any_version_other_than_one() -> None:
    with pytest.raises(ValidationError, match="Input should be 1"):
        ProvisioningDraftReplace(manifest_version=4)  # type: ignore[arg-type]


def test_non_finance_app_cannot_request_finance_scopes() -> None:
    with pytest.raises(ValidationError, match="cannot request finance scopes"):
        ProvisioningDraftReplace(
            finance_dependency="none",
            finance_scopes=["billing.customers.read"],
        )


@pytest.mark.parametrize("scope", ["billing", "Billing.customers.read", "billing_customers.read"])
def test_finance_scopes_require_lowercase_dotted_segments(scope: str) -> None:
    with pytest.raises(ValidationError, match="lowercase dotted identifier"):
        ProvisioningDraftReplace(
            finance_dependency="embedded",
            finance_scopes=[scope],
        )


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("integer_value", 2**63, "signed 64-bit"),
        ("decimal_value", "1.123456789", "8 fractional digits"),
        ("decimal_value", "10000000000000000", "16 integer digits"),
    ],
)
def test_provisioning_property_rejects_database_overflow(field: str, value: object, message: str) -> None:
    with pytest.raises(ValidationError, match=message):
        ProvisioningPropertyInput(
            key="value",
            value_type="integer" if field == "integer_value" else "decimal",
            **{field: value},
        )


def test_finance_catalog_allows_variable_length_currency_rows() -> None:
    def currency(code: str, position: int) -> dict[str, object]:
        return {
            "resource_type": "currency",
            "key": code,
            "position": position,
            "properties": [
                {"key": "code", "value_type": "string", "string_value": code},
                {"key": "name", "value_type": "string", "string_value": code},
                {"key": "minorUnit", "value_type": "integer", "integer_value": 2},
            ],
        }

    draft = ProvisioningDraftReplace.model_validate({"resources": [*FINANCE_BOOTSTRAP_RESOURCES, currency("USD", 130)]})

    assert validate_draft("finance", "shared", draft) == []


def test_catalog_rejects_database_fields_not_registered_for_forms() -> None:
    draft = ProvisioningDraftReplace(
        resources=[
            {
                "resource_type": "payment_mode",
                "key": "cash",
                "position": 0,
                "properties": [
                    {"key": "name", "value_type": "string", "string_value": "Cash"},
                    {"key": "tenant_id", "value_type": "string", "string_value": "internal"},
                ],
            }
        ]
    )

    issues = validate_draft("finance", "shared", draft)

    assert ("unknown_property", "resources.0.properties.tenant_id") in [(issue.code, issue.path) for issue in issues]


def test_finance_catalog_rejects_missing_manifest_references() -> None:
    draft = ProvisioningDraftReplace.model_validate(
        {
            "resources": [
                resource
                for resource in FINANCE_BOOTSTRAP_RESOURCES
                if not (resource["resource_type"] == "currency" and resource["key"] == "JMD")
            ]
        }
    )

    issues = validate_draft("finance", "shared", draft)

    assert any(
        issue.code == "unresolved_reference" and issue.path.endswith("properties.baseCurrency") for issue in issues
    )


def test_billing_application_catalog_declares_document_specific_preferences() -> None:
    definitions = catalog_definitions("application", BILLING_APP_SLUG)

    assert len(definitions) == 1
    definition = definitions[0]
    assert definition.resource_type == "document_preference"
    assert definition.multiple is True
    fields = {field.key: field for field in definition.fields}
    assert fields["documentType"].allowed_values == ["invoice", "quote", "estimate", "credit_note"]
    assert fields["customerNote"].required is False
    assert fields["termsAndConditions"].required is False


def test_catalog_rejects_duplicate_values_for_fields_marked_unique() -> None:
    preference = {
        "resource_type": "document_preference",
        "key": "invoice-defaults",
        "position": 0,
        "properties": [
            {"key": "documentType", "value_type": "string", "string_value": "invoice"},
        ],
    }
    draft = ProvisioningDraftReplace.model_validate(
        {"resources": [preference, {**preference, "key": "invoice-copy", "position": 1}]}
    )

    issues = validate_draft("application", BILLING_APP_SLUG, draft)

    assert any(
        issue.code == "duplicate_unique_property"
        and issue.path == "resources.1.properties.documentType"
        for issue in issues
    )


def test_unique_field_validation_is_generic_across_resource_types(monkeypatch) -> None:
    name_field = FINANCE_RESOURCES["payment_mode"].fields["name"]
    monkeypatch.setitem(
        FINANCE_RESOURCES["payment_mode"].fields,
        "name",
        replace(name_field, unique=True),
    )
    draft = ProvisioningDraftReplace.model_validate(
        {
            "resources": [
                {
                    "resource_type": "payment_mode",
                    "key": key,
                    "position": position,
                    "properties": [
                        {"key": "name", "value_type": "string", "string_value": "Cash"}
                    ],
                }
                for position, key in enumerate(("cash", "cash-copy"))
            ]
        }
    )

    issues = validate_draft("finance", "shared", draft)

    assert any(
        issue.code == "duplicate_unique_property"
        and issue.path == "resources.1.properties.name"
        for issue in issues
    )


def test_courier_application_catalog_stays_empty_until_its_shape_is_known() -> None:
    assert catalog_definitions("application", COURIERS_APP_SLUG) == []
