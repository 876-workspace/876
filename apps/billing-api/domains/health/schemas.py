from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    object: Literal["health"] = Field(default="health", description="Object discriminator. Always 'health'.")
    status: Literal["ok"] = Field(default="ok", description="Service health status.")
    service: Literal["@876/billing-api"] = Field(
        default="@876/billing-api",
        description="Service package name.",
    )


class ReadinessResponse(BaseModel):
    object: Literal["readiness"] = Field(default="readiness", description="Always 'readiness'.")
    status: Literal["ready", "not_ready"]
    service: Literal["@876/billing-api"] = "@876/billing-api"
