"""AppHTTPException and error envelope unit contracts."""

from __future__ import annotations

from fastapi import status

from core.errors import AppHTTPException


def test_app_http_exception_defaults() -> None:
    exc = AppHTTPException()
    assert exc.app_code == "storage/provider-error"
    assert "storage provider" in exc.app_message.lower() or "could not complete" in exc.app_message
    assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert exc.detail == exc.app_message


def test_app_http_exception_custom_fields() -> None:
    exc = AppHTTPException(
        code="storage/file-not-found",
        message="The file was not found.",
        http_status_code=status.HTTP_404_NOT_FOUND,
    )
    assert exc.app_code == "storage/file-not-found"
    assert exc.app_message == "The file was not found."
    assert exc.status_code == 404
    assert exc.detail == "The file was not found."


def test_starlette_http_exception_is_subclass_compatible() -> None:
    exc = AppHTTPException(code="storage/unauthorized", message="nope", http_status_code=401)
    assert isinstance(exc, Exception)
    assert hasattr(exc, "status_code")
