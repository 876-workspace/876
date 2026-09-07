"""Caller authorization on the resource-links domain.

A resource link names a Storage file *and* somebody else's resource id — an
item, an invoice, a conversation. The `/v1` boundary authenticates a service,
not a person, so possession of the shared internal key proves only that some
876 service is calling. Without the second gate these endpoints let any key
holder enumerate which records in another organization carry media, and detach
that organization's branding from its own item.

These tests pin that gate. The authorization itself is the files domain's
(`domains/files/authorization.py`) — a link is only ever as disclosable as the
file behind it — so what is asserted here is that the resource-links routes
actually consult it, and that a denial is indistinguishable from absence.
"""

from __future__ import annotations

import sqlite3
from typing import Any

import pytest

from tests.conftest import StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    INTERNAL_KEY_HEADERS,
    make_uploaded_object,
    open_upload,
)

FILE_ID = "file_01TESTFILE"

# A different 876 service holding the same shared internal key, acting for its
# own organization. Everything it is refused below, it is refused because of
# these three values — not because it lacks the key.
OTHER_ORG_HEADERS = {
    **INTERNAL_KEY_HEADERS,
    "x-876-source-app-id": "876-billing",
    "x-876-actor-user-id": "user_999",
    "x-876-actor-org-id": "org_999",
}

LINK_BODY: dict[str, Any] = {
    "file_id": FILE_ID,
    "app_id": "876-billing",
    "resource_type": "item",
    "resource_id": "item_01ABC",
    "relation": "image",
    "owner_type": "organization",
    "owner_id": "org_123",
    "actor_user_id": "user_456",
}

LIST_QUERY = "/v1/resource-links?app_id=876-billing&resource_type=item&resource_id=item_01ABC"


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
    """The upload route mints a public org logo; narrow it to exercise disclosure."""
    bucket = "assets-test" if audience == "public" else "files-test"
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            "UPDATE storage_files SET audience = ?, bucket = ? WHERE id = ?",
            (audience, bucket, FILE_ID),
        )
        connection.commit()


def _create_link(harness: StorageHarness) -> str:
    response = harness.client.post("/v1/resource-links", headers=AUTH_HEADERS, json=LINK_BODY)
    assert response.status_code == 201, response.text
    link_id: str = response.json()["id"]
    return link_id


def test_create_links_a_file_for_its_own_owner(storage_harness: StorageHarness) -> None:
    """The baseline the denials below are measured against."""
    _ready_file(storage_harness)

    response = storage_harness.client.post(
        "/v1/resource-links",
        headers=AUTH_HEADERS,
        json=LINK_BODY,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["object"] == "resource_link"
    assert body["id"].startswith("rlink_")
    assert body["file_id"] == FILE_ID
    assert body["resource_id"] == "item_01ABC"
    assert body["relation"] == "image"
    assert body["created_by"] == "user_456"


@pytest.mark.parametrize("audience", ["private", "organization"])
def test_create_is_refused_for_another_organizations_file(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    """Naming the true owner in the body is a claim, not proof of being it.

    The owner match alone would let any key holder attach another organization's
    file to a resource of its own choosing simply by guessing the owner id.
    """
    _ready_file(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.post(
        "/v1/resource-links",
        headers=OTHER_ORG_HEADERS,
        json=LINK_BODY,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/file-not-found"


@pytest.mark.parametrize("audience", ["private", "organization"])
def test_create_is_refused_without_any_caller_assertion(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    _ready_file(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.post(
        "/v1/resource-links",
        headers=INTERNAL_KEY_HEADERS,
        json=LINK_BODY,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/file-not-found"


def test_list_returns_links_to_the_owning_caller(storage_harness: StorageHarness) -> None:
    _ready_file(storage_harness)
    link_id = _create_link(storage_harness)
    _set_audience(storage_harness, "organization")

    response = storage_harness.client.get(LIST_QUERY, headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "list"
    assert [row["id"] for row in body["data"]] == [link_id]


@pytest.mark.parametrize("audience", ["private", "organization"])
def test_list_hides_another_organizations_links(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    """An empty list, not a denial.

    Storage knows who owns a file; it cannot know who owns another app's
    resource. Answering 403 here would confirm that `item_01ABC` exists and
    carries media, which is exactly the enumeration this gate prevents.
    """
    _ready_file(storage_harness)
    _create_link(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.get(LIST_QUERY, headers=OTHER_ORG_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"object": "list", "data": []}


@pytest.mark.parametrize("audience", ["private", "organization"])
def test_list_hides_links_from_a_caller_with_no_assertion(
    storage_harness: StorageHarness,
    audience: str,
) -> None:
    _ready_file(storage_harness)
    _create_link(storage_harness)
    _set_audience(storage_harness, audience)

    response = storage_harness.client.get(LIST_QUERY, headers=INTERNAL_KEY_HEADERS)

    assert response.status_code == 200
    assert response.json() == {"object": "list", "data": []}


def test_delete_removes_the_link_for_its_owner(storage_harness: StorageHarness) -> None:
    _ready_file(storage_harness)
    link_id = _create_link(storage_harness)

    response = storage_harness.client.delete(
        f"/v1/resource-links/{link_id}",
        headers=AUTH_HEADERS,
    )

    assert response.status_code == 200
    assert response.json() == {"object": "resource_link", "id": link_id, "deleted": True}
    assert storage_harness.client.get(LIST_QUERY, headers=AUTH_HEADERS).json()["data"] == []


def test_delete_is_refused_for_another_organization(storage_harness: StorageHarness) -> None:
    """Detaching an organization's product image is the owner's call alone."""
    _ready_file(storage_harness)
    link_id = _create_link(storage_harness)

    response = storage_harness.client.delete(
        f"/v1/resource-links/{link_id}",
        headers=OTHER_ORG_HEADERS,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/resource-link-not-found"
    # And the refusal did not quietly take effect anyway.
    assert [row["id"] for row in storage_harness.client.get(LIST_QUERY, headers=AUTH_HEADERS).json()["data"]] == [
        link_id
    ]


def test_delete_is_refused_on_a_public_file_for_a_non_owner(storage_harness: StorageHarness) -> None:
    """World-readable is not world-detachable.

    An organization logo is `public` so it can render in an `<img>`. That must
    not become a licence for another app to strip an organization's branding.
    """
    _ready_file(storage_harness)
    link_id = _create_link(storage_harness)
    _set_audience(storage_harness, "public")

    response = storage_harness.client.delete(
        f"/v1/resource-links/{link_id}",
        headers=OTHER_ORG_HEADERS,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/resource-link-not-found"


def test_delete_is_refused_without_any_caller_assertion(storage_harness: StorageHarness) -> None:
    _ready_file(storage_harness)
    link_id = _create_link(storage_harness)

    response = storage_harness.client.delete(
        f"/v1/resource-links/{link_id}",
        headers=INTERNAL_KEY_HEADERS,
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "storage/resource-link-not-found"


def test_delete_reports_a_missing_link_the_same_way_as_a_forbidden_one(
    storage_harness: StorageHarness,
) -> None:
    """The two answers must be byte-identical, or the endpoint is an oracle."""
    _ready_file(storage_harness)
    link_id = _create_link(storage_harness)

    missing = storage_harness.client.delete(
        "/v1/resource-links/rlink_01NOSUCHLINK",
        headers=AUTH_HEADERS,
    )
    forbidden = storage_harness.client.delete(
        f"/v1/resource-links/{link_id}",
        headers=OTHER_ORG_HEADERS,
    )

    assert missing.status_code == forbidden.status_code == 404
    assert missing.json()["error"] == forbidden.json()["error"]
