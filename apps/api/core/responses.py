from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str = Field(description="Machine-readable error code, e.g. 'auth/not-found'.")
    message: str = Field(description="Human-readable error message.")

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"code": "auth/no-session", "message": "No active session."}]}
    )


class ErrorEnvelope(BaseModel):
    error: ErrorDetail = Field(description="Error detail.")

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"error": {"code": "auth/no-session", "message": "No active session."}}]}
    )


class ListObject(BaseModel, Generic[T]):
    object: str = Field(default="list", description="Always 'list'.")
    data: list[T] = Field(description="Array of objects in this page.")
    has_more: bool = Field(description="Whether there are more objects beyond this page.")
    url: str = Field(description="The URL for this list endpoint.")
    total_count: int | None = Field(
        default=None,
        description="Total number of objects, if available.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True)
