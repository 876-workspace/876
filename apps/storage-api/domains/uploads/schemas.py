from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UploadCreate(BaseModel):
    route_key: str = Field(description="Server-declared upload route key.")
    owner_type: Literal["organization", "user", "platform"] = Field(description="Type of owning entity.")
    owner_id: str = Field(description="Opaque identifier for the owning entity.")
    actor_user_id: str = Field(description="Opaque identifier for the authorized actor.")
    source_app_id: str = Field(description="Opaque identifier for the calling app.")
    file_name: str = Field(description="Original filename retained as metadata only.")
    content_type: str = Field(description="Declared media type.")
    size_bytes: int = Field(description="Declared byte size.")

    model_config = ConfigDict(extra="forbid")


class UploadSessionResponse(BaseModel):
    object: Literal["upload_session"] = Field(default="upload_session", description="Object discriminator.")
    id: str = Field(description="Upload session identifier.")
    file_id: str = Field(description="Stable file identifier created for the object.")
    upload_url: str = Field(description="Short-lived presigned R2 PUT URL.")
    method: Literal["PUT"] = Field(default="PUT", description="Required upload method.")
    headers: dict[str, str] = Field(description="Exact signed headers that must be replayed.")
    expires_at: int = Field(description="Unix timestamp when the upload URL expires.")


class UploadComplete(BaseModel):
    model_config = ConfigDict(extra="forbid")
