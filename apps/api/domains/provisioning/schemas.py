import re
from decimal import Decimal
from typing import Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

ProvisioningTargetType = Literal["organization", "finance", "application"]
ProvisioningRevisionStatus = Literal["draft", "published", "archived"]
ProvisioningValueType = Literal["string", "integer", "decimal", "boolean", "reference"]
FinanceDependency = Literal["none", "embedded"]
FINANCE_SCOPE_PATTERN = re.compile(r"^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$")


class ProvisioningPropertyInput(BaseModel):
    key: str = Field(min_length=1, max_length=120)
    value_type: ProvisioningValueType
    string_value: str | None = None
    integer_value: int | None = None
    decimal_value: Decimal | None = None
    boolean_value: bool | None = Field(default=None, strict=True)
    reference_namespace: str | None = Field(default=None, max_length=120)
    reference_key: str | None = Field(default=None, max_length=240)

    @field_validator("key")
    @classmethod
    def strip_key(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Property key cannot be blank.")
        return value

    @field_validator("reference_namespace", "reference_key")
    @classmethod
    def strip_reference(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def validate_typed_value(self) -> Self:
        if self.integer_value is not None and not (-(2**63) <= self.integer_value <= 2**63 - 1):
            raise ValueError("Integer values must fit in a signed 64-bit integer.")
        if self.decimal_value is not None:
            if not self.decimal_value.is_finite():
                raise ValueError("Decimal values must be finite.")
            if abs(self.decimal_value) >= Decimal("1e16"):
                raise ValueError("Decimal values support at most 16 integer digits.")
            exponent = self.decimal_value.as_tuple().exponent
            if isinstance(exponent, int) and exponent < -8:
                raise ValueError("Decimal values support at most 8 fractional digits.")

        scalar_values = {
            "string": self.string_value,
            "integer": self.integer_value,
            "decimal": self.decimal_value,
            "boolean": self.boolean_value,
        }
        if self.value_type == "reference":
            if not self.reference_namespace or not self.reference_key:
                raise ValueError("Reference values require a namespace and key.")
            if any(value is not None for value in scalar_values.values()):
                raise ValueError("Reference values cannot include a scalar value.")
            return self

        if scalar_values[self.value_type] is None:
            raise ValueError(f"{self.value_type} values require their typed value field.")
        if sum(value is not None for value in scalar_values.values()) != 1:
            raise ValueError("Exactly one scalar value field is allowed.")
        if self.reference_namespace or self.reference_key:
            raise ValueError("Scalar values cannot include reference fields.")
        return self


class ProvisioningResourceInput(BaseModel):
    resource_type: str = Field(min_length=1, max_length=120)
    key: str = Field(min_length=1, max_length=120)
    position: int = Field(ge=0, le=2**31 - 1)
    properties: list[ProvisioningPropertyInput] = Field(default_factory=list, max_length=100)

    @field_validator("resource_type", "key")
    @classmethod
    def strip_identifier(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Resource identifiers cannot be blank.")
        return value


class ProvisioningStepInput(BaseModel):
    key: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=1000)
    position: int = Field(ge=0, le=2**31 - 1)

    @field_validator("key", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Step fields cannot be blank.")
        return value


class ProvisioningDraftReplace(BaseModel):
    manifest_version: Literal[1] = 1
    reconciliation: Literal["create_missing"] = "create_missing"
    preserve_tenant_overrides: Literal[True] = True
    finance_dependency: FinanceDependency = "none"
    finance_scopes: list[str] = Field(default_factory=list, max_length=50)
    resources: list[ProvisioningResourceInput] = Field(default_factory=list, max_length=500)
    steps: list[ProvisioningStepInput] = Field(default_factory=list, max_length=100)

    @field_validator("finance_scopes")
    @classmethod
    def normalize_finance_scopes(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values]
        if any(not value or len(value) > 120 or not FINANCE_SCOPE_PATTERN.fullmatch(value) for value in normalized):
            raise ValueError("Finance scopes must use a lowercase dotted identifier.")
        if len(normalized) != len(set(normalized)):
            raise ValueError("Finance scopes must be unique.")
        return normalized

    @model_validator(mode="after")
    def validate_unique_keys(self) -> Self:
        if self.finance_dependency == "none" and self.finance_scopes:
            raise ValueError("Targets without a finance dependency cannot request finance scopes.")
        if self.finance_dependency == "embedded" and not self.finance_scopes:
            raise ValueError("Embedded finance dependencies require at least one scope.")

        resource_keys = [(item.resource_type, item.key) for item in self.resources]
        if len(resource_keys) != len(set(resource_keys)):
            raise ValueError("Resource type/key pairs must be unique.")
        if len({item.position for item in self.resources}) != len(self.resources):
            raise ValueError("Resource positions must be unique.")
        for resource in self.resources:
            keys = [prop.key for prop in resource.properties]
            if len(keys) != len(set(keys)):
                raise ValueError("Property keys must be unique within a resource.")

        step_keys = [step.key for step in self.steps]
        if len(step_keys) != len(set(step_keys)):
            raise ValueError("Step keys must be unique.")
        if len({step.position for step in self.steps}) != len(self.steps):
            raise ValueError("Step positions must be unique.")
        return self


class ProvisioningPropertyResponse(BaseModel):
    object: Literal["provisioning_property"] = "provisioning_property"
    id: str
    key: str
    value_type: ProvisioningValueType
    string_value: str | None
    integer_value: str | None
    decimal_value: Decimal | None
    boolean_value: bool | None
    reference_namespace: str | None
    reference_key: str | None


class ProvisioningResourceResponse(BaseModel):
    object: Literal["provisioning_resource"] = "provisioning_resource"
    id: str
    resource_type: str
    key: str
    position: int
    properties: list[ProvisioningPropertyResponse]


class ProvisioningStepResponse(ProvisioningStepInput):
    object: Literal["provisioning_step"] = "provisioning_step"
    id: str


class ProvisioningRevisionResponse(BaseModel):
    object: Literal["provisioning_manifest_revision"] = "provisioning_manifest_revision"
    id: str
    manifest_id: str
    manifest_version: Literal[1] = 1
    revision: int
    status: ProvisioningRevisionStatus
    reconciliation: Literal["create_missing"]
    preserve_tenant_overrides: bool
    finance_dependency: FinanceDependency
    finance_scopes: list[str]
    resources: list[ProvisioningResourceResponse]
    steps: list[ProvisioningStepResponse]
    published_at: int | None
    created_at: int
    updated_at: int


class ProvisioningManifestResponse(BaseModel):
    object: Literal["provisioning_manifest"] = "provisioning_manifest"
    id: str
    target_type: ProvisioningTargetType
    target_key: str
    manifest_version: Literal[1] = 1
    published: ProvisioningRevisionResponse | None
    draft: ProvisioningRevisionResponse | None
    created_at: int
    updated_at: int


class ProvisioningValidationIssue(BaseModel):
    path: str
    code: str
    message: str


class ProvisioningValidationResponse(BaseModel):
    object: Literal["provisioning_validation"] = "provisioning_validation"
    valid: bool
    issues: list[ProvisioningValidationIssue]


class ProvisioningFieldDefinition(BaseModel):
    key: str
    label: str
    value_type: ProvisioningValueType
    required: bool = True
    reference_namespace: str | None = None
    allowed_values: list[str] | None = None


class ProvisioningResourceDefinition(BaseModel):
    resource_type: str
    label: str
    description: str
    multiple: bool
    minimum_items: int = 0
    maximum_items: int | None = None
    fields: list[ProvisioningFieldDefinition]


class ProvisioningCatalogResponse(BaseModel):
    object: Literal["provisioning_catalog"] = "provisioning_catalog"
    manifest_version: Literal[1] = 1
    target_type: ProvisioningTargetType
    resource_types: list[ProvisioningResourceDefinition]


class ProvisioningNoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)
    author_user_id: str | None = Field(default=None, max_length=255)

    @field_validator("body")
    @classmethod
    def strip_and_validate_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Note body cannot be blank.")
        return value


class ProvisioningNoteResponse(BaseModel):
    object: Literal["provisioning_note"] = "provisioning_note"
    id: str
    manifest_id: str
    body: str
    author_user_id: str | None
    created_at: int
    updated_at: int


class ProvisioningNoteDeleteResponse(BaseModel):
    object: Literal["provisioning_note"] = "provisioning_note"
    id: str
    deleted: Literal[True] = True


ProvisioningRunStatus = Literal["queued", "processing", "succeeded", "failed"]
ProvisioningRunTrigger = Literal["app_activation", "manifest_publish", "manual_reconcile", "retry"]


class ProvisioningRunStepResponse(BaseModel):
    object: Literal["provisioning_run_step"] = "provisioning_run_step"
    id: str
    target_type: ProvisioningTargetType
    target_key: str
    revision_id: str
    revision: int
    step_key: str
    description: str
    position: int
    status: ProvisioningRunStatus
    attempt_count: int
    started_at: int | None
    completed_at: int | None
    last_error: str | None


class ProvisioningRunResponse(BaseModel):
    object: Literal["provisioning_run"] = "provisioning_run"
    id: str
    organization_id: str
    app_id: str
    subscription_id: str | None
    outbox_event_id: str | None
    trigger: ProvisioningRunTrigger
    status: ProvisioningRunStatus
    manifest_version: Literal[1] = 1
    finance_revision_id: str | None
    finance_revision: int | None
    application_revision_id: str | None
    application_revision: int | None
    attempt_count: int
    available_at: int
    started_at: int | None
    completed_at: int | None
    last_error: str | None
    steps: list[ProvisioningRunStepResponse]
    created_at: int
    updated_at: int


class ProvisioningReconcileRequest(BaseModel):
    app_id: str | None = Field(default=None, max_length=255)
    organization_id: str | None = Field(default=None, max_length=255)
    limit: int = Field(default=1000, ge=1, le=5000)
    starting_after: str | None = Field(default=None, max_length=255)


class ProvisioningReconcileResponse(BaseModel):
    object: Literal["provisioning_reconciliation"] = "provisioning_reconciliation"
    examined: int
    enqueued: int
    next_cursor: str | None


class ProvisioningApplicationClaimRequest(BaseModel):
    organization_id: str = Field(min_length=1, max_length=255)
    app_id: str = Field(min_length=1, max_length=255)


class ProvisioningApplicationCompleteRequest(BaseModel):
    status: Literal["succeeded", "failed"]
    error: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_error(self) -> Self:
        if self.status == "failed" and not (self.error or "").strip():
            raise ValueError("Failed application runs require an error message.")
        if self.status == "succeeded" and self.error is not None:
            raise ValueError("Successful application runs cannot include an error message.")
        return self
