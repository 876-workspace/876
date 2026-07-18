from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SessionResponse(BaseModel):
    object: Literal["session"] = Field(
        default="session",
        description="String representing the object's type. Always 'session'.",
    )
    id: str = Field(description="Unique identifier for the session.")
    user_id: str = Field(description="Unique identifier for the user this session belongs to.")
    app_id: str | None = Field(
        default=None,
        description="Unique identifier for the registered app associated with this session, if any.",
    )
    token: str | None = Field(
        default=None,
        description="The plain-text session token. Only present immediately after creation.",
    )
    token_hash: str = Field(description="SHA-256 hash of the session token used for secure lookup.")
    expires_at: int = Field(description="Time at which this session expires. Measured in seconds since the Unix epoch.")
    ip_address: str | None = Field(
        default=None,
        description="IP address from which the session was created.",
    )
    user_agent: str | None = Field(
        default=None,
        description="User-Agent string from the client that created this session.",
    )
    created_at: int = Field(
        description="Time at which the session was created. Measured in seconds since the Unix epoch."
    )
    updated_at: int = Field(
        description="Time at which the session was last updated. Measured in seconds since the Unix epoch."
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "object": "session",
                    "id": "ses_01HFNPGM9K",
                    "user_id": "usr_01HFNPGM9K",
                    "app_id": None,
                    "token": None,
                    "token_hash": "abc123...",
                    "expires_at": 1700086400,
                    "ip_address": "127.0.0.1",
                    "user_agent": "Mozilla/5.0",
                    "created_at": 1700000000,
                    "updated_at": 1700000000,
                }
            ]
        },
    )
