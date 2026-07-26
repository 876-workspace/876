from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    object: Literal["health"] = Field(default="health", description="Object discriminator.")
    status: Literal["ok"] = Field(default="ok", description="Service health status.")
    service: Literal["@876/storage-api"] = Field(default="@876/storage-api", description="Service package name.")


class ReadinessResponse(BaseModel):
    object: Literal["readiness"] = Field(default="readiness", description="Object discriminator.")
    status: Literal["ready", "not_ready"] = Field(description="Database readiness status.")
    service: Literal["@876/storage-api"] = Field(default="@876/storage-api", description="Service package name.")
