import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MODULE_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


class ModuleResponse(BaseModel):
    object: Literal["application_module"] = "application_module"
    id: str
    app_id: str
    key: str
    name: str
    description: str | None
    feature_id: str | None
    feature_slug: str | None = None
    status: Literal["active", "archived"]
    position: int
    created_at: int
    updated_at: int

    model_config = ConfigDict(from_attributes=True)


class ModuleCreate(BaseModel):
    app_id: str
    key: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    feature_id: str | None = None
    position: int = Field(default=0, ge=0)

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        normalized = value.strip()
        if not MODULE_KEY_PATTERN.fullmatch(normalized):
            raise ValueError("Module keys must be lowercase snake_case identifiers.")
        return normalized


class ModuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    feature_id: str | None = None
    position: int | None = Field(default=None, ge=0)
    status: Literal["active", "archived"] | None = None


class ModuleDeleteResponse(BaseModel):
    object: Literal["application_module"] = "application_module"
    id: str
    deleted: bool = True
