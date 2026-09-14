"""Registered Storage error catalog contract.

Mirrors the TypeScript registry contract: unique kebab-case codes, valid HTTP
statuses, safe messages, and code-only construction for every definition.
"""

from __future__ import annotations

import re

from core.errors import STORAGE_ERRORS, AppHTTPException, get_error

CODE_PATTERN = re.compile(r"^[a-z-]+\/[a-z-]+$")
LEAKAGE_PATTERN = re.compile(r"stack|prisma|postgres|select|todo|fixme", re.IGNORECASE)
VALID_STATUSES = {
    400,
    401,
    403,
    404,
    409,
    410,
    413,
    415,
    422,
    429,
    500,
    502,
    503,
}


def test_registry_codes_are_unique_kebab_case() -> None:
    codes = list(STORAGE_ERRORS)
    assert len(set(codes)) == len(codes)
    for code in codes:
        assert CODE_PATTERN.match(code), code
        namespace, _, _name = code.partition("/")
        assert namespace, code


def test_registry_messages_are_safe_and_complete() -> None:
    for code, definition in STORAGE_ERRORS.items():
        message = definition.message
        assert message == message.strip(), code
        assert 10 <= len(message) <= 200, code
        assert message.endswith("."), code
        assert not LEAKAGE_PATTERN.search(message), code


def test_registry_statuses_are_valid() -> None:
    for code, definition in STORAGE_ERRORS.items():
        assert definition.http_status in VALID_STATUSES, code


def test_every_code_resolves_without_overrides() -> None:
    for code, definition in STORAGE_ERRORS.items():
        resolved = get_error(code)
        assert resolved.code == code
        assert resolved.message == definition.message
        assert resolved.http_status == definition.http_status
        exc = AppHTTPException(code)
        assert exc.app_code == code
        assert exc.app_message == definition.message
        assert exc.status_code == definition.http_status
        assert exc.detail == definition.message
