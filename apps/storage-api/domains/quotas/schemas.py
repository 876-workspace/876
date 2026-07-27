from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

QuotaSubjectType = Literal["organization", "user"]


class StorageQuotaResponse(BaseModel):
    object: Literal["storage_quota"] = Field(
        default="storage_quota", description="Object discriminator. Always 'storage_quota'."
    )
    subject_type: QuotaSubjectType = Field(description="Type of entity the limit applies to.")
    subject_id: str = Field(description="Opaque identifier for the quota subject.")
    parent_org_id: str | None = Field(description="Organization whose pool a user subject also draws from.")
    limit_bytes: int | None = Field(description="Enforced ceiling in bytes; null means unlimited.")
    max_file_bytes: int | None = Field(description="Plan per-file ceiling; the route ceiling still applies.")
    default_user_limit_bytes: int | None = Field(description="Default member cap for an organization subject.")
    source: Literal["plan", "override", "default"] = Field(description="Where the limit came from.")
    plan_product_id: str | None = Field(description="Opaque identifier of the plan carrying the entitlement.")
    plan_slug: str | None = Field(description="Slug of the plan carrying the entitlement.")
    plan_name: str | None = Field(description="Display name of the plan carrying the entitlement.")
    status: Literal["active", "suspended"] = Field(description="Whether admission is permitted for this subject.")
    entitlement_version: int = Field(description="Monotonic version; a lower version is ignored on delivery.")
    created_at: int = Field(description="Unix timestamp when the quota was created.")
    updated_at: int = Field(description="Unix timestamp when the quota was last updated.")


class StorageQuotaUsageResponse(BaseModel):
    object: Literal["storage_usage"] = Field(
        default="storage_usage", description="Object discriminator. Always 'storage_usage'."
    )
    subject_type: QuotaSubjectType = Field(description="Type of entity the usage belongs to.")
    subject_id: str = Field(description="Opaque identifier for the quota subject.")
    parent_org_id: str | None = Field(description="Organization whose pool a user subject also draws from.")
    limit_bytes: int | None = Field(description="Enforced ceiling in bytes; null means unlimited.")
    max_file_bytes: int | None = Field(description="Plan per-file ceiling in bytes.")
    bytes_used: int = Field(description="Verified bytes stored by ready, non-deleted files.")
    bytes_reserved: int = Field(description="Bytes held by open upload sessions.")
    bytes_total: int = Field(description="Effective consumption: used plus reserved.")
    bytes_remaining: int | None = Field(description="Headroom before admission fails; null when unlimited.")
    files_count: int = Field(description="Number of ready, non-deleted files.")
    quota_status: Literal["active", "suspended"] | None = Field(description="Admission status for this subject.")
    recomputed_at: int | None = Field(description="Unix timestamp of the last drift recompute.")
    updated_at: int = Field(description="Unix timestamp when the counters last changed.")


class StorageMemberUsageResponse(BaseModel):
    object: Literal["storage_member_usage"] = Field(
        default="storage_member_usage", description="Object discriminator."
    )
    user_id: str = Field(description="Opaque identifier for the member.")
    owned_bytes: int = Field(description="Bytes of files this member owns. Counts against their cap.")
    owned_files: int = Field(description="Number of files this member owns.")
    uploaded_bytes: int = Field(
        description="Bytes of files this member uploaded, whoever owns them. Attribution only."
    )
    uploaded_files: int = Field(description="Number of files this member uploaded.")
    limit_bytes: int | None = Field(description="The member cap, or null when uncapped.")


class QuotaEnsureRequest(BaseModel):
    subject_type: QuotaSubjectType = Field(description="Type of entity the limit applies to.")
    subject_id: str = Field(description="Opaque identifier for the quota subject.")
    parent_org_id: str | None = Field(default=None, description="Organization pool a user subject also draws from.")
    limit_bytes: int | None = Field(default=None, ge=0, description="Ceiling in bytes; null means unlimited.")
    max_file_bytes: int | None = Field(default=None, ge=0, description="Plan per-file ceiling in bytes.")
    default_user_limit_bytes: int | None = Field(default=None, ge=0, description="Default member cap in bytes.")
    plan_product_id: str | None = Field(default=None, description="Opaque plan identifier, for display.")
    plan_slug: str | None = Field(default=None, description="Plan slug, for display.")
    plan_name: str | None = Field(default=None, description="Plan display name.")
    status: Literal["active", "suspended"] = Field(default="active", description="Admission status.")
    entitlement_version: int = Field(ge=0, description="Monotonic version; a lower version is ignored.")

    model_config = ConfigDict(extra="forbid")


class UsageRecomputeRequest(BaseModel):
    subject_type: QuotaSubjectType | None = Field(default=None, description="Subject type to recompute.")
    subject_id: str | None = Field(default=None, description="Subject identifier to recompute.")
    all: bool = Field(default=False, description="Recompute the least recently verified subjects instead.")
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum subjects to recompute when 'all' is set.")

    model_config = ConfigDict(extra="forbid")


class UsageRecomputeResultResponse(BaseModel):
    object: Literal["storage_usage_recompute"] = Field(
        default="storage_usage_recompute", description="Object discriminator."
    )
    subject_type: QuotaSubjectType = Field(description="Type of entity that was recomputed.")
    subject_id: str = Field(description="Identifier of the subject that was recomputed.")
    bytes_used: int = Field(description="Recomputed verified bytes.")
    bytes_reserved: int = Field(description="Recomputed reserved bytes.")
    files_count: int = Field(description="Recomputed file count.")
    delta_bytes: int = Field(description="Change applied by the recompute; non-zero means drift was repaired.")
