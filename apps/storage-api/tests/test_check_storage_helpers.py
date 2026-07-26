"""Unit tests for storage operational check helpers (no live R2)."""

from __future__ import annotations

import httpx
import pytest

from scripts.check_storage import expect_json, generated_png


def test_generated_png_is_valid_minimal_png() -> None:
    image = generated_png()

    assert image.startswith(b"\x89PNG\r\n\x1a\n")
    assert b"IHDR" in image
    assert b"IDAT" in image
    assert b"IEND" in image
    assert len(image) > 40
    assert len(image) < 200  # tiny 1x1 PNG


def test_expect_json_returns_dict_on_expected_status() -> None:
    response = httpx.Response(201, json={"object": "upload_session", "id": "upl_1"})

    payload = expect_json(response, 201)

    assert payload == {"object": "upload_session", "id": "upl_1"}


def test_expect_json_raises_on_status_mismatch() -> None:
    response = httpx.Response(400, json={"error": {"code": "storage/invalid-request"}})

    with pytest.raises(RuntimeError, match="HTTP 400"):
        expect_json(response, 201)


def test_expect_json_raises_on_non_object_json() -> None:
    response = httpx.Response(200, json=["not", "an", "object"])

    with pytest.raises(RuntimeError, match="non-object"):
        expect_json(response, 200)
