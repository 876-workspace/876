from typing import Any, Literal, Protocol, cast

from core.config import Settings
from db.models import File
from domains.files.schemas import FileResponse


class ObjectKeyRow(Protocol):
    object_key: Any


def public_asset_url(settings: Settings, row: ObjectKeyRow) -> str:
    return f"{settings.r2_assets_base_url.rstrip('/')}/{row.object_key}"


def serialize_file(row: File, settings: Settings) -> FileResponse:
    url = public_asset_url(settings, row) if row.audience == "public" and row.status == "ready" else None
    return FileResponse(
        id=row.id,
        owner_type=cast(Literal["organization", "user", "platform"], row.owner_type),
        owner_id=row.owner_id,
        source_app_id=row.source_app_id,
        purpose=row.purpose,
        category=cast(Literal["library", "attachment", "system"], row.category),
        audience=cast(Literal["private", "organization", "app", "public"], row.audience),
        status=cast(Literal["pending", "uploaded", "ready", "failed", "deleted"], row.status),
        original_name=row.original_name,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        version_id=row.version_id,
        url=url,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
