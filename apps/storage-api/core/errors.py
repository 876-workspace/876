"""Registered Storage error definitions.

Every expected public Storage error originates here. Call sites pass only the
registered code (plus the documented quota detail below); message and HTTP
status always come from the definition. ``http_status`` is server-only and
never appears in client JSON beyond the response status line.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status


@dataclass(frozen=True)
class ErrorDefinition:
    code: str
    message: str
    http_status: int


STORAGE_ERRORS: dict[str, ErrorDefinition] = {
    "storage/file-not-found": ErrorDefinition(
        code="storage/file-not-found",
        message="The file was not found.",
        http_status=status.HTTP_404_NOT_FOUND,
    ),
    "storage/route-not-found": ErrorDefinition(
        code="storage/route-not-found",
        message="The upload route was not found.",
        http_status=status.HTTP_404_NOT_FOUND,
    ),
    "storage/invalid-owner": ErrorDefinition(
        code="storage/invalid-owner",
        message="The owner type is not valid for this upload.",
        http_status=status.HTTP_400_BAD_REQUEST,
    ),
    "storage/mime-not-allowed": ErrorDefinition(
        code="storage/mime-not-allowed",
        message="This file type is not allowed for this upload.",
        http_status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    ),
    "storage/file-too-large": ErrorDefinition(
        code="storage/file-too-large",
        message="The file exceeds the size allowed for this upload.",
        http_status=status.HTTP_413_CONTENT_TOO_LARGE,
    ),
    "storage/invalid-request": ErrorDefinition(
        code="storage/invalid-request",
        message="The request body or parameters failed validation.",
        http_status=status.HTTP_400_BAD_REQUEST,
    ),
    "storage/upload-not-found": ErrorDefinition(
        code="storage/upload-not-found",
        message="The upload session was not found.",
        http_status=status.HTTP_404_NOT_FOUND,
    ),
    "storage/upload-expired": ErrorDefinition(
        code="storage/upload-expired",
        message="The upload session has expired.",
        http_status=status.HTTP_410_GONE,
    ),
    "storage/upload-incomplete": ErrorDefinition(
        code="storage/upload-incomplete",
        message="The uploaded object was not found.",
        http_status=status.HTTP_409_CONFLICT,
    ),
    "storage/upload-verification-failed": ErrorDefinition(
        code="storage/upload-verification-failed",
        message="The uploaded object did not match the signed declaration.",
        http_status=status.HTTP_422_UNPROCESSABLE_CONTENT,
    ),
    "storage/file-not-ready": ErrorDefinition(
        code="storage/file-not-ready",
        message="Only a verified ready file can be linked to a resource.",
        http_status=status.HTTP_409_CONFLICT,
    ),
    "storage/forbidden": ErrorDefinition(
        code="storage/forbidden",
        message="The file does not belong to the asserted owner.",
        http_status=status.HTTP_403_FORBIDDEN,
    ),
    "storage/resource-link-not-found": ErrorDefinition(
        code="storage/resource-link-not-found",
        message="The resource link was not found.",
        http_status=status.HTTP_404_NOT_FOUND,
    ),
    "storage/quota-not-found": ErrorDefinition(
        code="storage/quota-not-found",
        message="No storage quota exists for that subject.",
        http_status=status.HTTP_404_NOT_FOUND,
    ),
    "storage/unauthorized": ErrorDefinition(
        code="storage/unauthorized",
        message="The storage credential is invalid.",
        http_status=status.HTTP_401_UNAUTHORIZED,
    ),
    "storage/provider-error": ErrorDefinition(
        code="storage/provider-error",
        message="The storage provider could not complete the request.",
        http_status=status.HTTP_502_BAD_GATEWAY,
    ),
    "storage/quota-exceeded": ErrorDefinition(
        code="storage/quota-exceeded",
        message="This upload would exceed the available storage quota.",
        http_status=status.HTTP_409_CONFLICT,
    ),
    "storage/quota-suspended": ErrorDefinition(
        code="storage/quota-suspended",
        message="Storage uploads for this subject are suspended.",
        http_status=status.HTTP_403_FORBIDDEN,
    ),
}

StorageErrorCode = str


def get_error(code: StorageErrorCode) -> ErrorDefinition:
    """Resolve a registered code to its canonical definition.

    Raises KeyError for unregistered codes: an unknown code is a programming
    bug, not an expected failure, and must surface loudly.
    """
    return STORAGE_ERRORS[code]


class AppHTTPException(HTTPException):
    """Expected application failure serialized through the canonical envelope."""

    def __init__(
        self,
        code: StorageErrorCode = "storage/provider-error",
        *,
        message: str | None = None,
    ) -> None:
        definition = get_error(code)
        # `message` is keyword-only and reserved for computed caller detail
        # with an explicit tested contract (quota byte counts). Every other
        # call site must omit it so the public message comes from the registry.
        resolved = definition.message if message is None else message
        self.app_code = definition.code
        self.app_message = resolved
        super().__init__(status_code=definition.http_status, detail=resolved)


def provider_error() -> AppHTTPException:
    return AppHTTPException("storage/provider-error")


def quota_exceeded(message: str) -> AppHTTPException:
    return AppHTTPException("storage/quota-exceeded", message=message)


def quota_suspended() -> AppHTTPException:
    return AppHTTPException("storage/quota-suspended")
