from dataclasses import dataclass

from core.platform_apps import BILLING_APP_SLUG
from domains.provisioning.schemas import (
    ProvisioningDraftReplace,
    ProvisioningFieldDefinition,
    ProvisioningResourceDefinition,
    ProvisioningTargetType,
    ProvisioningValidationIssue,
    ProvisioningValueType,
)


@dataclass(frozen=True)
class _Field:
    label: str
    value_type: ProvisioningValueType
    required: bool = True
    reference_namespace: str | None = None
    allowed_values: tuple[str, ...] | None = None
    unique: bool = False


@dataclass(frozen=True)
class _Resource:
    label: str
    description: str
    multiple: bool
    minimum_items: int
    fields: dict[str, _Field]


FINANCE_RESOURCES: dict[str, _Resource] = {
    "currency": _Resource(
        label="Currencies",
        description="Currencies created for every new finance workspace.",
        multiple=True,
        minimum_items=1,
        fields={
            "code": _Field("ISO code", "string"),
            "name": _Field("Name", "string"),
            "numericCode": _Field("Numeric code", "string", required=False),
            "minorUnit": _Field("Minor unit", "integer"),
            "symbol": _Field("Symbol", "string", required=False),
        },
    ),
    "workspace": _Resource(
        label="Workspace defaults",
        description="Locale and currency defaults for a finance workspace.",
        multiple=False,
        minimum_items=1,
        fields={
            "countryCode": _Field("Country", "reference", reference_namespace="country"),
            "baseCurrency": _Field("Base currency", "reference", reference_namespace="currency"),
            "defaultCurrency": _Field("Default currency", "reference", reference_namespace="currency"),
            "defaultLanguage": _Field("Default language", "reference", reference_namespace="language"),
        },
    ),
    "payment_mode": _Resource(
        label="Payment modes",
        description="Payment methods available on new workspaces.",
        multiple=True,
        minimum_items=1,
        fields={"name": _Field("Name", "string")},
    ),
    "payment_term": _Resource(
        label="Payment terms",
        description="Reusable due-date rules for invoices and estimates.",
        multiple=True,
        minimum_items=1,
        fields={
            "name": _Field("Name", "string"),
            "rule": _Field(
                "Rule",
                "string",
                allowed_values=("DUE_ON_RECEIPT", "NET_DAYS", "END_OF_MONTH", "END_OF_NEXT_MONTH"),
            ),
            "dueDays": _Field("Due days", "integer"),
        },
    ),
    "invoice_preference": _Resource(
        label="Invoice preferences",
        description="Default invoice behavior; tenant edits remain authoritative.",
        multiple=False,
        minimum_items=1,
        fields={
            "defaultTaxBehavior": _Field("Tax behavior", "string", allowed_values=("EXCLUSIVE", "INCLUSIVE")),
            "lateFeesEnabled": _Field("Late fees enabled", "boolean"),
            "lateFeeCalculationType": _Field("Late fee calculation", "string", allowed_values=("PERCENTAGE", "FIXED")),
            "lateFeePercent": _Field("Late fee percent", "decimal", required=False),
            "lateFeeAmount": _Field("Late fee amount", "integer", required=False),
            "lateFeeGraceDays": _Field("Grace days", "integer"),
            "lateFeeGenerateAsDraft": _Field("Generate as draft", "boolean"),
        },
    ),
    "tax_authority": _Resource(
        label="Tax authorities",
        description="Tax administrations available to newly created organizations.",
        multiple=True,
        minimum_items=1,
        fields={
            "name": _Field("Name", "string"),
            "description": _Field("Description", "string", required=False),
            "countryCode": _Field("Country", "reference", reference_namespace="country"),
        },
    ),
    "tax_rate": _Resource(
        label="Tax rates",
        description="Tax rates created for newly provisioned finance workspaces.",
        multiple=True,
        minimum_items=1,
        fields={
            "name": _Field("Name", "string"),
            "description": _Field("Description", "string", required=False),
            "taxType": _Field("Tax type", "string", required=False),
            "rate": _Field("Rate", "decimal"),
            "inclusive": _Field("Inclusive", "boolean"),
            "authority": _Field(
                "Tax authority",
                "reference",
                reference_namespace="tax_authority",
            ),
        },
    ),
}

ORGANIZATION_RESOURCES: dict[str, _Resource] = {
    "organization_profile": _Resource(
        label="Organization profile",
        description="Defaults for the global organization record.",
        multiple=False,
        minimum_items=0,
        fields={
            "countryCode": _Field("Country", "reference", reference_namespace="country"),
            "language": _Field("Language", "string"),
            "timezone": _Field("Timezone", "string"),
        },
    )
}

APPLICATION_RESOURCES: dict[str, dict[str, _Resource]] = {
    BILLING_APP_SLUG: {
        "document_preference": _Resource(
            label="Document preferences",
            description=(
                "Default customer note and terms per document type. Subscription-generated "
                "invoices inherit the invoice preference."
            ),
            multiple=True,
            minimum_items=0,
            fields={
                "documentType": _Field(
                    "Document type",
                    "string",
                    allowed_values=("invoice", "quote", "estimate", "credit_note"),
                    unique=True,
                ),
                "customerNote": _Field("Customer note", "string", required=False),
                "termsAndConditions": _Field("Terms and conditions", "string", required=False),
            },
        )
    }
}


def resource_registry(target_type: ProvisioningTargetType, target_key: str) -> dict[str, _Resource]:
    if target_type == "finance":
        return FINANCE_RESOURCES
    if target_type == "organization":
        return ORGANIZATION_RESOURCES
    return APPLICATION_RESOURCES.get(target_key, {})


def catalog_definitions(
    target_type: ProvisioningTargetType,
    target_key: str,
) -> list[ProvisioningResourceDefinition]:
    definitions: list[ProvisioningResourceDefinition] = []
    for resource_type, resource in resource_registry(target_type, target_key).items():
        definitions.append(
            ProvisioningResourceDefinition(
                resource_type=resource_type,
                label=resource.label,
                description=resource.description,
                multiple=resource.multiple,
                minimum_items=resource.minimum_items,
                maximum_items=None if resource.multiple else 1,
                fields=[
                    ProvisioningFieldDefinition(
                        key=key,
                        label=field.label,
                        value_type=field.value_type,
                        required=field.required,
                        reference_namespace=field.reference_namespace,
                        allowed_values=list(field.allowed_values) if field.allowed_values else None,
                    )
                    for key, field in resource.fields.items()
                ],
            )
        )
    return definitions


def validate_draft(
    target_type: ProvisioningTargetType,
    target_key: str,
    draft: ProvisioningDraftReplace,
) -> list[ProvisioningValidationIssue]:
    issues: list[ProvisioningValidationIssue] = []
    if target_type != "application" and draft.finance_dependency != "none":
        issues.append(
            ProvisioningValidationIssue(
                path="finance_dependency",
                code="invalid_target_contract",
                message="Only application manifests may declare an embedded finance dependency.",
            )
        )

    registry = resource_registry(target_type, target_key)
    counts: dict[str, int] = {}
    for index, resource in enumerate(draft.resources):
        path = f"resources.{index}"
        definition = registry.get(resource.resource_type)
        if definition is None:
            issues.append(
                ProvisioningValidationIssue(
                    path=f"{path}.resource_type",
                    code="unknown_resource_type",
                    message=f"Resource type '{resource.resource_type}' is not registered for this target.",
                )
            )
            continue

        counts[resource.resource_type] = counts.get(resource.resource_type, 0) + 1
        values = {property_.key: property_ for property_ in resource.properties}
        for key, field in definition.fields.items():
            property_ = values.get(key)
            if property_ is None:
                if field.required:
                    issues.append(
                        ProvisioningValidationIssue(
                            path=f"{path}.properties.{key}",
                            code="missing_property",
                            message=f"Property '{key}' is required.",
                        )
                    )
                continue
            if property_.value_type != field.value_type:
                issues.append(
                    ProvisioningValidationIssue(
                        path=f"{path}.properties.{key}.value_type",
                        code="invalid_property_type",
                        message=f"Property '{key}' must use value type '{field.value_type}'.",
                    )
                )
            if field.reference_namespace and property_.reference_namespace != field.reference_namespace:
                issues.append(
                    ProvisioningValidationIssue(
                        path=f"{path}.properties.{key}.reference_namespace",
                        code="invalid_reference_namespace",
                        message=f"Property '{key}' must reference '{field.reference_namespace}'.",
                    )
                )
            scalar = property_.string_value
            if field.allowed_values and scalar not in field.allowed_values:
                issues.append(
                    ProvisioningValidationIssue(
                        path=f"{path}.properties.{key}",
                        code="invalid_property_value",
                        message=f"Property '{key}' must be one of: {', '.join(field.allowed_values)}.",
                    )
                )
        for key in values.keys() - definition.fields.keys():
            issues.append(
                ProvisioningValidationIssue(
                    path=f"{path}.properties.{key}",
                    code="unknown_property",
                    message=f"Property '{key}' is not registered for resource type '{resource.resource_type}'.",
                )
            )

    for resource_type, count in counts.items():
        if count > 1 and not registry[resource_type].multiple:
            issues.append(
                ProvisioningValidationIssue(
                    path="resources",
                    code="resource_cardinality",
                    message=f"Resource type '{resource_type}' permits only one row.",
                )
            )
    for resource_type, definition in registry.items():
        count = counts.get(resource_type, 0)
        if count < definition.minimum_items:
            issues.append(
                ProvisioningValidationIssue(
                    path="resources",
                    code="resource_minimum",
                    message=f"Resource type '{resource_type}' requires at least {definition.minimum_items} row(s).",
                )
            )

    reference_namespaces = {
        field.reference_namespace
        for definition in registry.values()
        for field in definition.fields.values()
        if field.reference_namespace in registry
    }
    reference_targets = {
        resource_type: {resource.key for resource in draft.resources if resource.resource_type == resource_type}
        for resource_type in reference_namespaces
    }
    for index, resource in enumerate(draft.resources):
        for property_ in resource.properties:
            namespace = property_.reference_namespace
            if namespace in reference_targets and property_.reference_key not in reference_targets[namespace]:
                issues.append(
                    ProvisioningValidationIssue(
                        path=f"resources.{index}.properties.{property_.key}",
                        code="unresolved_reference",
                        message=f"Reference '{namespace}/{property_.reference_key}' does not exist in this draft.",
                    )
                )

    for resource_type, definition in registry.items():
        for field_key, field in definition.fields.items():
            if not field.unique:
                continue
            seen: set[tuple[object, ...]] = set()
            for index, resource in enumerate(draft.resources):
                if resource.resource_type != resource_type:
                    continue
                property_ = next(
                    (candidate for candidate in resource.properties if candidate.key == field_key),
                    None,
                )
                if property_ is None:
                    continue
                value = (
                    property_.value_type,
                    property_.string_value,
                    property_.integer_value,
                    property_.decimal_value,
                    property_.boolean_value,
                    property_.reference_namespace,
                    property_.reference_key,
                )
                if value in seen:
                    issues.append(
                        ProvisioningValidationIssue(
                            path=f"resources.{index}.properties.{field_key}",
                            code="duplicate_unique_property",
                            message=(
                                f"Property '{field_key}' must be unique within resource type '{resource_type}'."
                            ),
                        )
                    )
                else:
                    seen.add(value)
    return issues
