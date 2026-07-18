from typing import Literal

from pydantic import BaseModel, Field, JsonValue

OnboardingTargetType = Literal["organization", "application"]
OnboardingFieldType = Literal[
    "string",
    "text",
    "email",
    "phone",
    "url",
    "date",
    "integer",
    "boolean",
    "select",
    "multiselect",
    "collection",
]


class OnboardingOption(BaseModel):
    value: str
    label: str


class OnboardingCondition(BaseModel):
    field_key: str
    equals: JsonValue


class OnboardingFieldDefinition(BaseModel):
    key: str
    label: str
    description: str | None = None
    field_type: OnboardingFieldType
    required: bool = False
    sensitive: bool = False
    placeholder: str | None = None
    pattern: str | None = None
    min_items: int | None = None
    required_when: OnboardingCondition | None = None
    options: list[OnboardingOption] = Field(default_factory=list)
    item_fields: list["OnboardingFieldDefinition"] = Field(default_factory=list)


class OnboardingSectionDefinition(BaseModel):
    key: str
    title: str
    description: str
    position: int
    fields: list[OnboardingFieldDefinition]


class OnboardingCatalogResponse(BaseModel):
    object: Literal["onboarding_catalog"] = "onboarding_catalog"
    target_type: OnboardingTargetType
    target_key: str
    country_code: str
    schema_version: Literal[1] = 1
    catalog_revision: int
    sections: list[OnboardingSectionDefinition]


class OnboardingAnswersReplace(BaseModel):
    country_code: str = Field(min_length=2, max_length=2)
    answers: dict[str, JsonValue] = Field(default_factory=dict)


class OnboardingValidationIssue(BaseModel):
    path: str
    code: str
    message: str


class OnboardingValidationResponse(BaseModel):
    object: Literal["onboarding_validation"] = "onboarding_validation"
    valid: bool
    issues: list[OnboardingValidationIssue]


class OnboardingSessionResponse(BaseModel):
    object: Literal["onboarding_session"] = "onboarding_session"
    id: str
    organization_id: str
    target_type: OnboardingTargetType
    target_key: str
    country_code: str
    schema_version: Literal[1] = 1
    catalog_revision: int
    status: Literal["draft", "submitted", "completed", "needs_update"]
    answers: dict[str, JsonValue]
    submitted_at: int | None
    completed_at: int | None
    created_at: int
    updated_at: int
