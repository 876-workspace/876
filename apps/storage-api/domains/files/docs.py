"""OpenAPI descriptions and response maps for file operations."""

from typing import Any

from fastapi import status

from core.responses import ErrorEnvelope

DELETE_FILE_SUMMARY = "Delete a file"
DELETE_FILE_DESCRIPTION = "Soft-deletes file metadata. Object bytes are reclaimed asynchronously."
DELETE_FILE_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "File not found."},
}

READ_FILE_URL_SUMMARY = "Create a file read URL"
READ_FILE_URL_DESCRIPTION = "Returns the stable URL for a public asset or mints a short-lived signed GET URL."
READ_FILE_URL_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "Ready file not found."},
    status.HTTP_502_BAD_GATEWAY: {"model": ErrorEnvelope, "description": "Storage provider failure."},
}

RETRIEVE_FILE_SUMMARY = "Retrieve a file"
RETRIEVE_FILE_DESCRIPTION = "Returns active file metadata. Soft-deleted files are excluded."
RETRIEVE_FILE_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "File not found."},
}
