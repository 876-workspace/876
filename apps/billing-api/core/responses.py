from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str = Field(description="Machine-readable Billing error code.")
    message: str = Field(description="Human-readable error message.")


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


class ListObject(BaseModel, Generic[T]):
    object: str = Field(default="list", description="Always 'list'.")
    data: list[T]
    has_more: bool
    url: str
    total_count: int | None = None

    model_config = ConfigDict(arbitrary_types_allowed=True)
