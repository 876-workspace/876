"""Opaque ID validation for upload create — security boundary."""

from __future__ import annotations

import pytest

from tests.conftest import StorageHarness
from tests.test_storage_api import open_upload


@pytest.mark.parametrize(
    "field",
    ["owner_id", "actor_user_id", "source_app_id"],
)
@pytest.mark.parametrize(
    "value",
    [
        "",  # empty
        " ",  # whitespace
        "a" * 256,  # over 255
        "-leading-dash",  # must start with alnum
        "_leading_us",
        "has space",
        "has/slash",
        "has@at",
        "has.dot",
        "has:colon",
        "unicode- café",
        "../traversal",
        "org\nid",
        "org\x00null",
        "';'; DROP TABLE files;--",
        "<script>",
    ],
)
def test_invalid_opaque_ids_are_rejected(
    storage_harness: StorageHarness,
    field: str,
    value: str,
) -> None:
    response = open_upload(storage_harness, {field: value})

    assert response.status_code == 400, (field, value, response.json())
    assert response.json()["error"]["code"] in {
        "storage/invalid-request",
    }
    assert storage_harness.provider.create_upload_calls == []


def test_valid_opaque_id_shapes_are_accepted(storage_harness: StorageHarness) -> None:
    for value in (
        "a",
        "org_123",
        "user-456",
        "876-couriers",
        "z_9-Z",
        "0start",
        "9end9",
    ):
        # Pattern check only — harness freezes generate_id so only first create
        # can succeed; re-validate pattern via module under test semantics.
        from domains.uploads.router import OPAQUE_ID_PATTERN

        assert OPAQUE_ID_PATTERN.fullmatch(value), value


def test_max_length_255_opaque_id_is_accepted(storage_harness: StorageHarness) -> None:
    value = "a" + ("b" * 254)  # 255 chars, starts with alnum
    assert len(value) == 255
    response = open_upload(
        storage_harness,
        {
            "owner_id": value,
            "actor_user_id": "user_1",
            "source_app_id": "app_1",
        },
    )
    assert response.status_code == 201
    assert storage_harness.provider.create_upload_calls


def test_256_char_opaque_id_is_rejected(storage_harness: StorageHarness) -> None:
    value = "a" * 256
    response = open_upload(storage_harness, {"owner_id": value})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"
