import re
from dataclasses import dataclass

from pydantic import JsonValue

from domains.onboarding.schemas import (
    OnboardingCatalogResponse,
    OnboardingCondition,
    OnboardingFieldDefinition,
    OnboardingFieldType,
    OnboardingOption,
    OnboardingSectionDefinition,
    OnboardingTargetType,
    OnboardingValidationIssue,
)

CATALOG_REVISION = 1


@dataclass(frozen=True)
class _Field:
    key: str
    label: str
    field_type: OnboardingFieldType = "string"
    description: str | None = None
    required: bool = False
    sensitive: bool = False
    placeholder: str | None = None
    pattern: str | None = None
    min_items: int | None = None
    required_when_key: str | None = None
    required_when_value: JsonValue = None
    options: tuple[tuple[str, str], ...] = ()
    item_fields: tuple["_Field", ...] = ()


@dataclass(frozen=True)
class _Section:
    key: str
    title: str
    description: str
    fields: tuple[_Field, ...]


ENTITY_TYPES = (
    ("limited_company", "Limited-liability organization"),
    ("partnership", "Partnership"),
    ("sole_proprietorship", "Sole proprietor"),
    ("non_profit", "Non-profit organization"),
    ("trust", "Trust"),
    ("statutory_body", "Statutory body"),
    ("government", "Government entity"),
    ("overseas_company", "Overseas organization"),
    ("other", "Other"),
)

EMPLOYEE_COUNT_RANGE_OPTIONS = (
    ("1", "1"),
    ("2-10", "2–10"),
    ("11-50", "11–50"),
    ("51-200", "51–200"),
    ("201+", "201+"),
)

CORE_ORGANIZATION_SECTIONS: tuple[_Section, ...] = (
    _Section(
        "business_profile",
        "Business profile",
        "Basic details used to tailor 876 products for the organization.",
        (
            _Field(
                "business_category",
                "Business category",
                "select",
                required=True,
                options=(
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
                ),
            ),
            _Field(
                "employee_count_range",
                "Number of employees",
                "select",
                options=EMPLOYEE_COUNT_RANGE_OPTIONS,
            ),
        ),
    ),
)

COURIERS_APPLICATION_SECTIONS: tuple[_Section, ...] = (
    _Section(
        "workspace",
        "Workspace setup",
        "Details used to create the organization's courier workspace.",
        (
            _Field(
                "platform_name",
                "Platform name",
                required=True,
                placeholder="Rocket Express",
                description="Shown to your customers across the courier platform.",
            ),
            _Field(
                "mailbox_prefix",
                "Mailbox prefix",
                placeholder="RE",
                description="Optional code shown before every mailbox number.",
                pattern=r"^[A-Za-z0-9]{1,6}$",
            ),
        ),
    ),
)

APPLICATION_CATALOGS: dict[str, tuple[_Section, ...]] = {
    "876-couriers": COURIERS_APPLICATION_SECTIONS,
}

JM_ORGANIZATION_SECTIONS: tuple[_Section, ...] = (
    _Section(
        "identity",
        "Legal identity",
        "The registered identity and legal form of the organization.",
        (
            _Field("legal_name", "Registered legal name", required=True),
            _Field("trade_name", "Trade or business name"),
            _Field("entity_type", "Type of organization", "select", required=True, options=ENTITY_TYPES),
            _Field(
                "company_type",
                "Organization type",
                "select",
                options=(("private", "Private"), ("public", "Public")),
            ),
            _Field("country_of_incorporation", "Country of incorporation", required=True, placeholder="JM"),
            _Field("incorporation_date", "Date of incorporation or registration", "date"),
        ),
    ),
    _Section(
        "registrations",
        "Government registrations",
        "Identifiers issued through the Companies Office, TAJ, NIS, NHT, and HEART/NSTA Trust.",
        (
            _Field("coj_registration_number", "Companies Office registration number", required=True),
            _Field(
                "trn",
                "Taxpayer Registration Number (TRN)",
                required=True,
                sensitive=True,
                placeholder="000-000-000",
                pattern=r"^\d{3}-?\d{3}-?\d{3}$",
            ),
            _Field("income_tax_number", "Income tax number", sensitive=True),
            _Field("nis_number", "NIS employer number", sensitive=True),
            _Field("gct_registered", "Registered for GCT", "boolean"),
            _Field(
                "gct_number",
                "GCT registration number",
                sensitive=True,
                required_when_key="gct_registered",
                required_when_value=True,
            ),
            _Field("nht_employer_number", "NHT employer number", sensitive=True),
            _Field("heart_employer_number", "HEART/NSTA employer number", sensitive=True),
            _Field("tcc_number", "Tax Compliance Certificate number", sensitive=True),
            _Field("tcc_expiry_date", "TCC expiry date", "date"),
        ),
    ),
    _Section(
        "registered_office",
        "Registered office",
        "The Jamaican registered office and mailing address recorded for the organization.",
        (
            _Field("registered_address_line1", "Street address", required=True),
            _Field("registered_address_line2", "Address line 2"),
            _Field("registered_city", "Town or city", required=True),
            _Field("registered_parish", "Parish", required=True),
            _Field("registered_postal_code", "Postal zone"),
            _Field("mailing_address", "Mailing address", "text"),
        ),
    ),
    _Section(
        "contact",
        "Business contact",
        "Primary organization contact information used across 876 products.",
        (
            _Field("primary_phone", "Telephone number", "phone", required=True),
            _Field("primary_email", "Email address", "email", required=True),
            _Field("website_url", "Website", "url"),
            _Field("primary_contact_name", "Primary contact name", required=True),
            _Field("primary_contact_title", "Primary contact title"),
        ),
    ),
    _Section(
        "operations",
        "Operations and tax profile",
        "Information used to configure reporting periods, payroll readiness, and relevant product defaults.",
        (
            _Field("nature_of_business", "Nature of business", "text", required=True),
            _Field("industry", "Industry", required=True),
            _Field("business_start_date", "Business start date", "date"),
            _Field("accounting_year_end", "Accounting year end", "date"),
            _Field("first_employee_date", "Date first employee started", "date"),
            _Field("usual_tax_collectorate", "Usual tax collectorate"),
            _Field(
                "employee_count_range",
                "Number of employees",
                "select",
                options=EMPLOYEE_COUNT_RANGE_OPTIONS,
            ),
        ),
    ),
    _Section(
        "leadership",
        "Directors, officers, and beneficial owners",
        "Repeatable legal-party records required for Jamaican organization administration.",
        (
            _Field(
                "directors",
                "Directors or senior officers",
                "collection",
                required=True,
                sensitive=True,
                min_items=1,
                item_fields=(
                    _Field("first_name", "First name", required=True),
                    _Field("last_name", "Last name", required=True),
                    _Field("title", "Office or title", required=True),
                    _Field("individual_trn", "Individual TRN", sensitive=True, pattern=r"^\d{3}-?\d{3}-?\d{3}$"),
                    _Field("responsibility_start_date", "Responsibility commenced", "date"),
                ),
            ),
            _Field(
                "beneficial_owners",
                "Beneficial owners",
                "collection",
                required=True,
                sensitive=True,
                min_items=1,
                item_fields=(
                    _Field("first_name", "First name", required=True),
                    _Field("last_name", "Last name", required=True),
                    _Field("date_of_birth", "Date of birth", "date", sensitive=True),
                    _Field("nationality", "Nationality", required=True),
                    _Field("occupation", "Occupation"),
                    _Field("address", "Residential address", "text", required=True, sensitive=True),
                    _Field(
                        "identification_type",
                        "Identification type",
                        "select",
                        required=True,
                        sensitive=True,
                        options=(
                            ("trn", "TRN"),
                            ("voter_id", "Voter ID"),
                            ("passport", "Passport"),
                            ("drivers_licence", "Driver’s licence"),
                        ),
                    ),
                    _Field("identification_number", "Identification number", required=True, sensitive=True),
                    _Field(
                        "ownership_or_control",
                        "Ownership or control basis",
                        "multiselect",
                        required=True,
                        options=(
                            ("owns_25_50", "Owns 25–50%"),
                            ("owns_51_75", "Owns 51–75%"),
                            ("owns_76_100", "Owns 76–100%"),
                            ("policy_control", "Determines organization policy"),
                            ("director_control", "Appoints or removes directors"),
                            ("management_control", "Controls management"),
                        ),
                    ),
                ),
            ),
        ),
    ),
    _Section(
        "locations",
        "Branches and operating locations",
        "Every office, branch, store, warehouse, or other operating site that products may use.",
        (
            _Field(
                "locations",
                "Locations",
                "collection",
                required=True,
                min_items=1,
                item_fields=(
                    _Field("name", "Location name", required=True),
                    _Field("code", "Internal code"),
                    _Field(
                        "type",
                        "Location type",
                        "select",
                        required=True,
                        options=(
                            ("headquarters", "Headquarters"),
                            ("branch", "Branch"),
                            ("office", "Office"),
                            ("store", "Store"),
                            ("warehouse", "Warehouse"),
                            ("remote", "Remote"),
                            ("other", "Other"),
                        ),
                    ),
                    _Field("is_primary", "Primary location", "boolean"),
                    _Field("line1", "Street address", required=True),
                    _Field("line2", "Address line 2"),
                    _Field("city", "Town or city", required=True),
                    _Field("parish", "Parish", required=True),
                    _Field("postal_code", "Postal zone"),
                    _Field("phone", "Telephone", "phone"),
                    _Field("email", "Email", "email"),
                ),
            ),
        ),
    ),
    _Section(
        "survey",
        "Product onboarding survey",
        "Non-legal context used to tailor app onboarding without blocking account creation.",
        (
            _Field("implementation_goal", "What should 876 help you accomplish first?", "text"),
            _Field(
                "products_of_interest",
                "Products of interest",
                "multiselect",
                options=(("billing", "876 Billing"), ("couriers", "876 Couriers")),
            ),
            _Field("expected_monthly_transactions", "Expected monthly transactions", "integer"),
            _Field("migration_source", "System you are migrating from"),
        ),
    ),
)

JM_ORGANIZATION_CATALOG_REVISIONS: dict[int, tuple[_Section, ...]] = {
    1: JM_ORGANIZATION_SECTIONS,
}


def _serialize_field(field: _Field) -> OnboardingFieldDefinition:
    return OnboardingFieldDefinition(
        key=field.key,
        label=field.label,
        description=field.description,
        field_type=field.field_type,
        required=field.required,
        sensitive=field.sensitive,
        placeholder=field.placeholder,
        pattern=field.pattern,
        min_items=field.min_items,
        required_when=(
            OnboardingCondition(
                field_key=field.required_when_key,
                equals=field.required_when_value,
            )
            if field.required_when_key is not None
            else None
        ),
        options=[OnboardingOption(value=value, label=label) for value, label in field.options],
        item_fields=[_serialize_field(item) for item in field.item_fields],
    )


def organization_catalog(
    country_code: str,
    *,
    catalog_revision: int | None = None,
) -> OnboardingCatalogResponse:
    normalized = country_code.upper()
    if normalized != "JM":
        raise ValueError(f"No organization onboarding catalog is registered for {normalized}.")
    revision = CATALOG_REVISION if catalog_revision is None else catalog_revision
    sections = JM_ORGANIZATION_CATALOG_REVISIONS.get(revision)
    if sections is None:
        raise ValueError(f"No organization onboarding catalog revision {revision} is registered for {normalized}.")

    return OnboardingCatalogResponse(
        target_type="organization",
        target_key="global",
        country_code=normalized,
        catalog_revision=revision,
        sections=[
            OnboardingSectionDefinition(
                key=section.key,
                title=section.title,
                description=section.description,
                position=position,
                fields=[_serialize_field(field) for field in section.fields],
            )
            for position, section in enumerate(sections)
        ],
    )


def onboarding_catalog(
    target_type: OnboardingTargetType,
    target_key: str,
    country_code: str,
    *,
    catalog_revision: int | None = None,
) -> OnboardingCatalogResponse:
    if target_type == "organization" and target_key == "global":
        return organization_catalog(country_code, catalog_revision=catalog_revision)

    sections: tuple[_Section, ...] | None
    if target_type == "organization" and target_key == "core":
        sections = CORE_ORGANIZATION_SECTIONS
    elif target_type == "application":
        sections = APPLICATION_CATALOGS.get(target_key)
        if sections is None:
            raise ValueError(f"No onboarding catalog is registered for application/{target_key}.")
    else:
        raise ValueError(f"No onboarding catalog is registered for {target_type}/{target_key}.")

    normalized = country_code.upper()
    if re.fullmatch(r"[A-Z]{2}", normalized) is None:
        raise ValueError("Country code must be a two-letter code.")
    revision = CATALOG_REVISION if catalog_revision is None else catalog_revision
    if revision != 1:
        raise ValueError(f"No onboarding catalog revision {revision} is registered for {target_type}/{target_key}.")

    return OnboardingCatalogResponse(
        target_type=target_type,
        target_key=target_key,
        country_code=normalized,
        catalog_revision=revision,
        sections=[
            OnboardingSectionDefinition(
                key=section.key,
                title=section.title,
                description=section.description,
                position=position,
                fields=[_serialize_field(field) for field in section.fields],
            )
            for position, section in enumerate(sections)
        ],
    )


def _missing(value: JsonValue) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _validate_field(
    field: OnboardingFieldDefinition,
    value: JsonValue,
    path: str,
) -> list[OnboardingValidationIssue]:
    issues: list[OnboardingValidationIssue] = []
    if _missing(value):
        if field.required:
            issues.append(OnboardingValidationIssue(path=path, code="required", message=f"{field.label} is required."))
        return issues

    if field.field_type == "boolean" and not isinstance(value, bool):
        issues.append(
            OnboardingValidationIssue(path=path, code="invalid_type", message=f"{field.label} must be true or false.")
        )
    elif field.field_type == "integer" and (not isinstance(value, int) or isinstance(value, bool)):
        issues.append(
            OnboardingValidationIssue(path=path, code="invalid_type", message=f"{field.label} must be a whole number.")
        )
    elif field.field_type in {"multiselect", "collection"} and not isinstance(value, list):
        issues.append(
            OnboardingValidationIssue(path=path, code="invalid_type", message=f"{field.label} must be a list.")
        )
    elif field.field_type not in {"boolean", "integer", "multiselect", "collection"} and not isinstance(value, str):
        issues.append(OnboardingValidationIssue(path=path, code="invalid_type", message=f"{field.label} must be text."))

    if field.pattern and isinstance(value, str) and re.fullmatch(field.pattern, value) is None:
        issues.append(
            OnboardingValidationIssue(path=path, code="invalid_format", message=f"{field.label} has an invalid format.")
        )

    allowed = {option.value for option in field.options}
    if field.field_type == "select" and isinstance(value, str) and allowed and value not in allowed:
        issues.append(
            OnboardingValidationIssue(
                path=path, code="invalid_option", message=f"{field.label} contains an unsupported option."
            )
        )
    if field.field_type == "multiselect" and isinstance(value, list):
        invalid = [item for item in value if not isinstance(item, str) or item not in allowed]
        if invalid:
            issues.append(
                OnboardingValidationIssue(
                    path=path, code="invalid_option", message=f"{field.label} contains an unsupported option."
                )
            )
    if field.field_type == "collection" and isinstance(value, list):
        if field.min_items is not None and len(value) < field.min_items:
            issues.append(
                OnboardingValidationIssue(
                    path=path,
                    code="minimum_items",
                    message=f"{field.label} requires at least {field.min_items} item(s).",
                )
            )
        for index, item in enumerate(value):
            if not isinstance(item, dict):
                issues.append(
                    OnboardingValidationIssue(
                        path=f"{path}.{index}", code="invalid_type", message="Collection items must be objects."
                    )
                )
                continue
            for item_field in field.item_fields:
                issues.extend(_validate_field(item_field, item.get(item_field.key), f"{path}.{index}.{item_field.key}"))
            known = {item_field.key for item_field in field.item_fields}
            for unknown in item.keys() - known:
                issues.append(
                    OnboardingValidationIssue(
                        path=f"{path}.{index}.{unknown}", code="unknown_field", message=f"Unknown field '{unknown}'."
                    )
                )
    return issues


def validate_onboarding_answers(
    catalog: OnboardingCatalogResponse,
    answers: dict[str, JsonValue],
) -> list[OnboardingValidationIssue]:
    issues: list[OnboardingValidationIssue] = []
    fields = {field.key: field for section in catalog.sections for field in section.fields}
    for key, field in fields.items():
        condition = field.required_when
        required = field.required or (condition is not None and answers.get(condition.field_key) == condition.equals)
        effective_field = field.model_copy(update={"required": required})
        issues.extend(_validate_field(effective_field, answers.get(key), f"answers.{key}"))
    for unknown in answers.keys() - fields.keys():
        issues.append(
            OnboardingValidationIssue(
                path=f"answers.{unknown}", code="unknown_field", message=f"Unknown field '{unknown}'."
            )
        )
    return issues
