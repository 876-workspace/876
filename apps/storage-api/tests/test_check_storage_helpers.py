"""Unit tests for storage operational check helpers (no live R2)."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from scripts.check_storage import expect_json, generated_png, run


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


def test_round_trip_asserts_the_caller_on_every_files_call(monkeypatch: pytest.MonkeyPatch) -> None:
    """The checker must authorize itself, or the round-trip breaks in operations.

    The files domain authorizes the principal a caller acts for, so a request
    carrying only the service key is refused. This drives the whole script over
    a mock transport and pins the assertion onto the read-url and delete calls.
    """
    image = generated_png()
    seen: dict[str, httpx.Headers] = {}

    def handle(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/v1/uploads":
            return httpx.Response(
                201,
                json={
                    "id": "upl_1",
                    "file_id": "file_1",
                    "upload_url": "https://r2.test/object",
                    "headers": {"Content-Type": "image/png"},
                },
            )
        if path == "/object":
            return httpx.Response(200)
        if path == "/v1/uploads/upl_1/complete":
            return httpx.Response(200, json={"status": "ready"})
        if path == "/v1/files/file_1/read-url":
            seen["read_url"] = request.headers
            return httpx.Response(200, json={"url": "https://r2.test/signed"})
        if path == "/signed":
            return httpx.Response(200, content=image)
        if path == "/v1/files/file_1":
            seen["delete"] = request.headers
            return httpx.Response(200, json={"object": "file", "id": "file_1", "deleted": True})
        raise AssertionError(f"unexpected request to {path}")

    transport = httpx.MockTransport(handle)
    real_client = httpx.Client

    def client_factory(**kwargs: Any) -> httpx.Client:
        kwargs.pop("transport", None)
        return real_client(transport=transport, **kwargs)

    monkeypatch.setattr("scripts.check_storage.httpx.Client", client_factory)

    run(
        base_url="https://storage.test",
        internal_key="storage-test-key",
        owner_id="org_check",
        actor_user_id="user_check",
        source_app_id="876-storage-check",
    )

    for stage in ("read_url", "delete"):
        assert seen[stage]["x-876-source-app-id"] == "876-storage-check"
        assert seen[stage]["x-876-actor-user-id"] == "user_check"
        assert seen[stage]["x-876-actor-org-id"] == "org_check"
