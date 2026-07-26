"""OpenAPI descriptions and response maps for upload operations."""

from typing import Any

from fastapi import status

from core.responses import ErrorEnvelope

COMPLETE_UPLOAD_SUMMARY = "Complete an upload"
COMPLETE_UPLOAD_DESCRIPTION = "Verifies the uploaded R2 object with HEAD and finalizes the file idempotently."
COMPLETE_UPLOAD_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_409_CONFLICT: {"model": ErrorEnvelope, "description": "The object has not been uploaded."},
    status.HTTP_410_GONE: {"model": ErrorEnvelope, "description": "The upload session expired."},
    status.HTTP_422_UNPROCESSABLE_CONTENT: {
        "model": ErrorEnvelope,
        "description": "The uploaded object did not match the signed declaration.",
    },
    status.HTTP_502_BAD_GATEWAY: {"model": ErrorEnvelope, "description": "Storage provider failure."},
}

CREATE_UPLOAD_SUMMARY = "Open an upload session"
CREATE_UPLOAD_DESCRIPTION = "Creates pending file metadata and returns a presigned R2 PUT bound to size and media type."
CREATE_UPLOAD_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Invalid owner or request."},
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "Upload route not found."},
    status.HTTP_413_CONTENT_TOO_LARGE: {"model": ErrorEnvelope, "description": "File is too large."},
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: {"model": ErrorEnvelope, "description": "Media type is not allowed."},
    status.HTTP_502_BAD_GATEWAY: {"model": ErrorEnvelope, "description": "Storage provider failure."},
}
