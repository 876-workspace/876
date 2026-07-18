from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from providers.workos.types._coerce import coerce_to_unix


class WorkosFeatureFlag(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    object: Literal["feature_flag"] = "feature_flag"
    id: str
    slug: str
    name: str
    description: str | None = None
    enabled: bool = False
    rollout_percentage: int | None = Field(
        default=None,
        validation_alias=AliasChoices("rollout_percentage", "rolloutPercentage"),
    )
    created_at: int | None = Field(
        default=None,
        validation_alias=AliasChoices("created_at", "createdAt"),
    )
    updated_at: int | None = Field(
        default=None,
        validation_alias=AliasChoices("updated_at", "updatedAt"),
    )

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def _parse_ts(cls, v: Any) -> int | None:
        return coerce_to_unix(v)


class WorkosFeatureFlagTarget(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    feature_flag_id: str = Field(
        validation_alias=AliasChoices("feature_flag_id", "featureFlagId"),
    )
    target_id: str = Field(
        validation_alias=AliasChoices("target_id", "targetId"),
    )
    target_type: str | None = Field(
        default=None,
        validation_alias=AliasChoices("target_type", "targetType"),
    )


class WorkosFeatureFlagEvaluation(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    slug: str
    enabled: bool
    value: Any | None = None
