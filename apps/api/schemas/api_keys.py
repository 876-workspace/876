from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyResponse(BaseModel):
    object: Literal["api_key"] = Field(
        default="api_key",
        description="String representing the object's type. Always 'api_key'.",
    )
    id: str = Field(description="Unique identifier for the API key.")
    app_id: str = Field(description="Unique identifier for the app this key belongs to.")
    name: str | None = Field(default=None, description="A human-readable name for the API key.")
    last_used_at: int | None = Field(
        default=None,
        description="Time at which the key was last used. Measured in seconds since the Unix epoch.",
    )
    expires_at: int | None = Field(
        default=None,
        description="Time at which the key expires, if set. Measured in seconds since the Unix epoch.",
    )
    revoked: bool = Field(description="Whether the key has been revoked.")
    created_at: int = Field(
        description="Time at which the API key was created. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "api_key",
                    "id": "key_01HFNPGM9K",
                    "app_id": "app_01HFNPGM9K",
                    "name": "Production Key",
                    "last_used_at": None,
                    "expires_at": None,
                    "revoked": False,
                    "created_at": 1700000000,
                }
            ]
        },
    )


class ApiKeyCreate(BaseModel):
    app_id: str = Field(
        description="Unique identifier for the app this key belongs to.",
        alias="appId",
    )
    name: str | None = Field(default=None, description="A human-readable name for the API key.")
    expires_at: int | None = Field(
        default=None,
        description="Time at which the key expires. Measured in seconds since the Unix epoch.",
        alias="expiresAt",
    )

    model_config = ConfigDict(populate_by_name=True)
