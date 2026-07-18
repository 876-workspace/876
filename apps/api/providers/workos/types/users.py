from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from providers.workos.types.auth import WorkosUser


class WorkosUserListResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    data: list[WorkosUser] = Field(default_factory=list)
    list_metadata: dict[str, str | None] | None = None
