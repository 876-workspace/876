from typing import Literal

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from . import docs


class HealthResponse(BaseModel):
    object: Literal["health"] = Field(description="Object discriminator. Always 'health'.")
    status: Literal["ok"] = Field(description="Service health status.")
    service: Literal["@876/api"] = Field(description="Service package name.")


router = APIRouter(tags=["System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Check API health",
    description=docs.HEALTH_DESCRIPTION,
    responses={
        status.HTTP_200_OK: {
            "description": "The API process is running.",
            "content": {
                "application/json": {
                    "example": {
                        "object": "health",
                        "status": "ok",
                        "service": "@876/api",
                    }
                }
            },
        },
    },
)
async def get_health() -> HealthResponse:
    return HealthResponse(object="health", status="ok", service="@876/api")
