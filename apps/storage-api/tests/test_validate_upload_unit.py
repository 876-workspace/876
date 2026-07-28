"""Unit tests for _validate_upload — every branch, no HTTP stack."""

from __future__ import annotations

import pytest
from fastapi import status
from pydantic import ValidationError

from core.errors import AppHTTPException
from domains.uploads.router import OPAQUE_ID_PATTERN, _validate_upload
from domains.uploads.schemas import UploadCreate


def make_body(**overrides: object) -> UploadCreate:
    data = {
        "route_key": "organization.primaryLogo",
        "owner_type": "organization",
        "owner_id": "org_123",
        "actor_user_id": "user_456",
        "source_app_id": "876-couriers",
        "file_name": "logo.png",
        "content_type": "image/png",
        "size_bytes": 1000,
    }
    data.update(overrides)
    return UploadCreate.model_validate(data)


def test_valid_body_returns_route() -> None:
    route = _validate_upload(make_body())
    assert route.key == "organization.primaryLogo"
    assert route.category == "attachment"
    assert route.audience == "public"


def test_unknown_route() -> None:
    with pytest.raises(AppHTTPException) as exc:
        _validate_upload(make_body(route_key="nope.route"))
    assert exc.value.app_code == "storage/route-not-found"
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize("owner_type", ["user", "platform"])
def test_wrong_owner_type(owner_type: str) -> None:
    with pytest.raises(AppHTTPException) as exc:
        _validate_upload(make_body(owner_type=owner_type))
    assert exc.value.app_code == "storage/invalid-owner"
    assert exc.value.status_code == 400


@pytest.mark.parametrize(
    "content_type",
    [
        "image/svg+xml",
        "image/gif",
        "application/pdf",
        "text/plain",
        "image/png; charset=utf-8",
        "IMAGE/PNG",
        "image/jpg",
        "",
        "application/octet-stream",
    ],
)
def test_disallowed_mime(content_type: str) -> None:
    with pytest.raises(AppHTTPException) as exc:
        _validate_upload(make_body(content_type=content_type))
    assert exc.value.app_code == "storage/mime-not-allowed"
    assert exc.value.status_code == 415


@pytest.mark.parametrize("content_type", ["image/png", "image/jpeg", "image/webp"])
def test_allowed_mimes(content_type: str) -> None:
    route = _validate_upload(make_body(content_type=content_type))
    assert content_type in route.allowed_content_types


@pytest.mark.parametrize("size", [0, -1, -100, 5 * 1024 * 1024 + 1, 10**9])
def test_size_too_large_or_zero(size: int) -> None:
    with pytest.raises(AppHTTPException) as exc:
        _validate_upload(make_body(size_bytes=size))
    assert exc.value.app_code == "storage/file-too-large"
    assert exc.value.status_code == 413


def test_size_exactly_max_allowed() -> None:
    route = _validate_upload(make_body(size_bytes=5 * 1024 * 1024))
    assert route.max_size_bytes == 5 * 1024 * 1024


def test_size_one_byte_allowed() -> None:
    _validate_upload(make_body(size_bytes=1))


@pytest.mark.parametrize(
    "bad_id",
    [
        "",
        " ",
        "-x",
        "_x",
        "x y",
        "x/y",
        "x@y",
        "x.y",
        "x" * 256,
        "../x",
        "x\n",
        "x\t",
    ],
)
def test_bad_opaque_ids(bad_id: str) -> None:
    for field in ("owner_id", "actor_user_id", "source_app_id"):
        body = make_body(**{field: bad_id if bad_id or field != "owner_id" else "x"})
        # empty string may fail pydantic first for some cases
        try:
            body = make_body(**{field: bad_id})
        except ValidationError:
            continue
        with pytest.raises(AppHTTPException) as exc:
            _validate_upload(body)
        assert exc.value.app_code == "storage/invalid-request"


@pytest.mark.parametrize(
    "good_id",
    ["a", "org_1", "user-2", "876-app", "A1", "z" * 255, "0x", "9_9-9"],
)
def test_good_opaque_ids_pattern(good_id: str) -> None:
    assert OPAQUE_ID_PATTERN.fullmatch(good_id)
    _validate_upload(
        make_body(owner_id=good_id, actor_user_id="u1", source_app_id="a1")
    )


def test_opaque_pattern_rejects_leading_non_alnum() -> None:
    assert OPAQUE_ID_PATTERN.fullmatch("-a") is None
    assert OPAQUE_ID_PATTERN.fullmatch("_a") is None
    assert OPAQUE_ID_PATTERN.fullmatch(".a") is None
