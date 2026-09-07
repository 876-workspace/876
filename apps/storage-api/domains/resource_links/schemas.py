from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ResourceLinkCreate(BaseModel):
    file_id: str = Field(min_length=1)
    app_id: str = Field(min_length=1)
    resource_type: str = Field(min_length=1, max_length=128)
    resource_id: str = Field(min_length=1)
    relation: str = Field(min_length=1, max_length=128)
    owner_type: Literal["organization", "user", "platform"]
    owner_id: str = Field(min_length=1)
    actor_user_id: str = Field(min_length=1)

    model_config = ConfigDict(extra="forbid")


class ResourceLinkResponse(BaseModel):
    object: Literal["resource_link"] = "resource_link"
    id: str
    file_id: str
    app_id: str
    resource_type: str
    resource_id: str
    relation: str
    created_by: str
    created_at: int


class ResourceLinkListResponse(BaseModel):
    object: Literal["list"] = "list"
    data: list[ResourceLinkResponse]


class DeletedResourceLinkResponse(BaseModel):
    object: Literal["resource_link"] = "resource_link"
    id: str
    deleted: Literal[True] = True
