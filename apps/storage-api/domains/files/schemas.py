from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FileResponse(BaseModel):
    object: Literal["file"] = Field(default="file", description="Object discriminator. Always 'file'.")
    id: str = Field(description="Stable Storage file identifier.")
    owner_type: Literal["organization", "user", "platform"] = Field(description="Type of entity that owns the file.")
    owner_id: str = Field(description="Opaque identifier for the owning entity.")
    source_app_id: str = Field(description="Opaque identifier for the app that created the file.")
    purpose: str = Field(description="Stable server-assigned purpose.")
    category: Literal["library", "attachment", "system"] = Field(description="How the file is managed.")
    audience: Literal["private", "organization", "app", "public"] = Field(description="Who may read the bytes.")
    status: Literal["pending", "uploaded", "ready", "failed", "deleted"] = Field(
        description="Current file lifecycle status."
    )
    original_name: str = Field(description="Original client filename retained as metadata only.")
    content_type: str = Field(description="Verified media type.")
    size_bytes: int = Field(description="Verified size in bytes.")
    version_id: str = Field(description="Server-generated immutable version identifier.")
    url: str | None = Field(description="Stable URL for a ready public asset; otherwise null.")
    created_at: int = Field(description="Unix timestamp when the file was created.")
    updated_at: int = Field(description="Unix timestamp when the file was last updated.")


class ReadUrlRequest(BaseModel):
    expires_in: int = Field(default=300, ge=1, le=3600, description="Signed URL lifetime in seconds.")

    model_config = ConfigDict(extra="forbid")


class ReadUrlResponse(BaseModel):
    object: Literal["read_url"] = Field(default="read_url", description="Object discriminator.")
    url: str = Field(description="Stable public URL or short-lived signed read URL.")
    expires_at: int | None = Field(description="Unix expiry for signed URLs; null for stable public URLs.")


class FileDeleteResponse(BaseModel):
    object: Literal["file"] = Field(default="file", description="Object discriminator. Always 'file'.")
    id: str = Field(description="Identifier of the deleted file.")
    deleted: Literal[True] = Field(default=True, description="Always true.")
