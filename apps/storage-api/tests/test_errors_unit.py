"""AppHTTPException and error envelope unit contracts."""

from __future__ import annotations

from fastapi import status

from core.errors import AppHTTPException, get_error


def test_app_http_exception_defaults() -> None:
    exc = AppHTTPException()
    assert exc.app_code == "storage/provider-error"
    assert "storage provider" in exc.app_message.lower() or "could not complete" in exc.app_message
    assert exc.status_code == status.HTTP_502_BAD_GATEWAY
    assert exc.detail == exc.app_message


def test_app_http_exception_resolves_registered_code() -> None:
    exc = AppHTTPException(code="storage/file-not-found")
    assert exc.app_code == "storage/file-not-found"
    assert exc.app_message == "The file was not found."
    assert exc.status_code == 404
    assert exc.detail == "The file was not found."


def test_app_http_exception_unknown_code_raises() -> None:
    try:
        AppHTTPException(code="storage/no-such-code")
    except KeyError:
        pass
    else:
        raise AssertionError("expected KeyError for unregistered code")


def test_starlette_http_exception_is_subclass_compatible() -> None:
    exc = AppHTTPException(code="storage/unauthorized")
    assert isinstance(exc, Exception)
    assert hasattr(exc, "status_code")


def test_message_override_is_reserved_for_computed_detail() -> None:
    definition = get_error("storage/quota-exceeded")
    exc = AppHTTPException("storage/quota-exceeded", message="This upload needs 1 MB.")
    assert exc.app_code == "storage/quota-exceeded"
    assert exc.app_message == "This upload needs 1 MB."
    assert exc.status_code == definition.http_status
