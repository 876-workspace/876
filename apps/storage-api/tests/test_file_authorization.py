"""Caller authorization on the files domain.

Storage authenticates a service, not a person: the shared internal key proves
only that *some* 876 service is calling. These tests pin the second gate — the
calling app naming the principal it acts for — so that holding the key can
never again be enough to read, sign for, or delete an arbitrary file.
"""

from __future__ import annotations

import sqlite3

import pytest

from tests.conftest import StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    FILE_CALLER_HEADERS,
    INTERNAL_KEY_HEADERS,
    make_uploaded_object,
    open_upload,
)

FILE_ID = "file_01TESTFILE"

# A different 876 service that legitimately holds the same shared internal key.
OTHER_APP_HEADERS = {
    **INTERNAL_KEY_HEADERS,
    "x-876-source-app-id": "876-billing",
    "x-876-actor-user-id": "user_999",
    "x-876-actor-org-id": "org_999",
}


def _ready_file(harness: StorageHarness) -> None:
    assert open_upload(harness).status_code == 201
    make_uploaded_object(harness)
    assert (
        harness.client.post(
            "/v1/uploads/upl_01TESTSESSION/complete",
            headers=AUTH_HEADERS,
            json={},
        ).status_code
        == 200
    )


def _set_audience(harness: StorageHarness, audience: str) -> None:
    bucket = "assets-test" if audience == "public" else "files-test"
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            "UPDATE storage_files SET audience = ?, bucket = ? WHERE id = ?",
            (audience, bucket, FILE_ID),
        )
        connection.commit()


@pytest.mark.parametrize("audience", ["private", "organization", "app"])
def test_read_url_is_refused_without_a_caller_assertion(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    """The internal key alone must not mint a signed URL for a non-public file."""
    _ready_file(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.post(
        f"/v1/files/{FILE_ID}/read-url",
        headers=INTERNAL_KEY_HEADERS,
        json={},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/file-not-found"


@pytest.mark.parametrize("audience", ["private", "organization", "app"])
def test_read_url_is_refused_for_another_apps_principal(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    _ready_file(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.post(
        f"/v1/files/{FILE_ID}/read-url",
        headers=OTHER_APP_HEADERS,
        json={},
    )

    assert response.status_code == 404


@pytest.mark.parametrize("audience", ["private", "organization", "app"])
def test_read_url_is_granted_to_the_authorized_caller(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    _ready_file(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.post(
        f"/v1/files/{FILE_ID}/read-url",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == 200
    assert response.json()["expires_at"] is not None


def test_public_bytes_stay_readable_without_an_assertion(
    storage_harness: StorageHarness,
) -> None:
    """A public asset is world-readable by definition; the gate must not break it."""
    _ready_file(storage_harness)

    response = storage_harness.client.post(
        f"/v1/files/{FILE_ID}/read-url",
        headers=INTERNAL_KEY_HEADERS,
        json={},
    )

    assert response.status_code == 200
    assert response.json()["expires_at"] is None


def test_app_audience_requires_the_owning_app_to_name_an_actor(
    storage_harness: StorageHarness,
) -> None:
    """Storage cannot know another app's domain rules, so it demands the actor."""
    _ready_file(storage_harness)
    _set_audience(storage_harness, "app")

    response = storage_harness.client.post(
        f"/v1/files/{FILE_ID}/read-url",
        headers={
            **INTERNAL_KEY_HEADERS,
            "x-876-source-app-id": FILE_CALLER_HEADERS["x-876-source-app-id"],
        },
        json={},
    )

    assert response.status_code == 404


def test_metadata_retrieve_is_refused_for_another_apps_principal(
    storage_harness: StorageHarness,
) -> None:
    _ready_file(storage_harness)
    _set_audience(storage_harness, "private")

    response = storage_harness.client.get(f"/v1/files/{FILE_ID}", headers=OTHER_APP_HEADERS)

    assert response.status_code == 404


def test_delete_is_refused_for_a_caller_acting_as_someone_else(
    storage_harness: StorageHarness,
) -> None:
    """A public logo is world-readable; that is not a licence to destroy it."""
    _ready_file(storage_harness)

    response = storage_harness.client.delete(f"/v1/files/{FILE_ID}", headers=OTHER_APP_HEADERS)

    assert response.status_code == 404
    # Refusing must not also have deleted it.
    assert storage_harness.client.get(f"/v1/files/{FILE_ID}", headers=AUTH_HEADERS).status_code == 200


def test_delete_is_refused_without_a_caller_assertion(
    storage_harness: StorageHarness,
) -> None:
    _ready_file(storage_harness)

    response = storage_harness.client.delete(f"/v1/files/{FILE_ID}", headers=INTERNAL_KEY_HEADERS)

    assert response.status_code == 404
    assert storage_harness.client.get(f"/v1/files/{FILE_ID}", headers=AUTH_HEADERS).status_code == 200


def test_delete_is_granted_to_a_caller_acting_as_the_owner(
    storage_harness: StorageHarness,
) -> None:
    _ready_file(storage_harness)

    response = storage_harness.client.delete(f"/v1/files/{FILE_ID}", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.json()["deleted"] is True


def _set_platform_owned(harness: StorageHarness) -> None:
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            "UPDATE storage_files SET owner_type = 'platform' WHERE id = ?",
            (FILE_ID,),
        )
        connection.commit()


def test_a_platform_owned_file_answers_to_the_app_that_created_it(
    storage_harness: StorageHarness,
) -> None:
    """An app logo has no user or org behind it, so the creating app is the owner."""
    _ready_file(storage_harness)
    _set_platform_owned(storage_harness)

    refused = storage_harness.client.delete(f"/v1/files/{FILE_ID}", headers=OTHER_APP_HEADERS)
    assert refused.status_code == 404

    granted = storage_harness.client.delete(f"/v1/files/{FILE_ID}", headers=AUTH_HEADERS)
    assert granted.status_code == 200


def test_a_denial_is_indistinguishable_from_a_missing_file(
    storage_harness: StorageHarness,
) -> None:
    """Otherwise the endpoint becomes an oracle for which file ids exist."""
    _ready_file(storage_harness)
    _set_audience(storage_harness, "private")

    denied = storage_harness.client.get(f"/v1/files/{FILE_ID}", headers=OTHER_APP_HEADERS)
    missing = storage_harness.client.get("/v1/files/file_01NOSUCHFILE", headers=OTHER_APP_HEADERS)

    assert denied.status_code == missing.status_code
    assert denied.json() == missing.json()
