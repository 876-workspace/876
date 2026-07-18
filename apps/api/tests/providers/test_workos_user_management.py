from __future__ import annotations

from typing import Any

import httpx
import pytest

from core.errors import AppHTTPException
from providers.workos.adapter import WorkOSAuthProvider
from providers.workos.client import WorkOSClient


async def _client_with_transport(handler: Any) -> WorkOSClient:
    client = WorkOSClient(api_key="test_secret", base_url="https://workos.test")
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        base_url="https://workos.test",
        headers={"Authorization": "Bearer test_secret"},
        transport=httpx.MockTransport(handler),
    )
    return client


@pytest.mark.asyncio
async def test_list_users_filters_by_exact_email_and_returns_data() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/user_management/users"
        assert request.url.params.get("email") == "owner+retry@example.com"
        assert request.headers["authorization"] == "Bearer test_secret"
        return httpx.Response(
            200,
            json={"data": [{"id": "user_workos_123", "email": "owner+retry@example.com"}]},
        )

    client = await _client_with_transport(handler)
    try:
        users = await client.list_users(email="owner+retry@example.com")
    finally:
        await client._client.aclose()

    assert users == [{"id": "user_workos_123", "email": "owner+retry@example.com"}]


@pytest.mark.asyncio
async def test_list_users_returns_empty_list_when_provider_omits_data() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={})

    client = await _client_with_transport(handler)
    try:
        users = await client.list_users(email="missing@example.com")
    finally:
        await client._client.aclose()

    assert users == []


@pytest.mark.asyncio
async def test_create_organization_membership_uses_user_management_path() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/user_management/organization_memberships"
        assert request.headers["authorization"] == "Bearer test_secret"
        assert request.read() == (
            b'{"user_id":"user_workos_123","organization_id":"org_workos_123","role_slug":"admin"}'
        )
        return httpx.Response(201, json={"id": "membership_workos_123"})

    client = await _client_with_transport(handler)
    try:
        membership = await client.create_organization_membership(
            user_id="user_workos_123",
            organization_id="org_workos_123",
            role_slug="admin",
        )
    finally:
        await client._client.aclose()

    assert membership == {"id": "membership_workos_123"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("operation", "identifier", "expected_path"),
    [
        ("user", "user_workos_123", "/user_management/users/user_workos_123"),
        ("organization", "org_workos_123", "/organizations/org_workos_123"),
    ],
)
async def test_delete_operations_use_the_expected_workos_resource_path(
    operation: str,
    identifier: str,
    expected_path: str,
) -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "DELETE"
        assert request.url.path == expected_path
        assert request.headers["authorization"] == "Bearer test_secret"
        return httpx.Response(204)

    client = await _client_with_transport(handler)
    try:
        if operation == "user":
            await client.delete_user(identifier)
        else:
            await client.delete_organization(identifier)
    finally:
        await client._client.aclose()


@pytest.mark.asyncio
async def test_delete_normalizes_provider_details_before_raising() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            409,
            json={
                "code": "external_id_already_used",
                "message": "Sensitive upstream conflict details.",
            },
        )

    client = await _client_with_transport(handler)
    try:
        with pytest.raises(AppHTTPException) as raised:
            await client.delete_organization("org_workos_123")
    finally:
        await client._client.aclose()

    assert raised.value.app_code == "organization/provider-conflict"
    assert raised.value.status_code == 409
    assert raised.value.app_message == "We couldn't complete organization setup. Please try again."
    assert "Sensitive upstream" not in raised.value.app_message


class _AdapterClient:
    def __init__(self, users: list[dict[str, Any]] | None = None) -> None:
        self.users = users or []
        self.listed_emails: list[str] = []
        self.deleted_users: list[str] = []
        self.deleted_organizations: list[str] = []

    async def list_users(self, *, email: str) -> list[dict[str, Any]]:
        self.listed_emails.append(email)
        return self.users

    async def delete_user(self, user_id: str) -> None:
        self.deleted_users.append(user_id)

    async def delete_organization(self, organization_id: str) -> None:
        self.deleted_organizations.append(organization_id)


@pytest.mark.asyncio
async def test_adapter_returns_the_first_matching_user_as_provider_user() -> None:
    client = _AdapterClient(
        [
            {
                "id": "user_workos_first",
                "email": "Owner@Example.com",
                "firstName": "Alicia",
                "lastName": "Morgan",
                "emailVerified": True,
                "profile_picture_url": "https://example.com/avatar.png",
            },
            {"id": "user_workos_second", "email": "owner@example.com"},
        ]
    )
    provider = WorkOSAuthProvider(client)  # type: ignore[arg-type]

    user = await provider.get_user_by_email(email="owner@example.com")

    assert client.listed_emails == ["owner@example.com"]
    assert user is not None
    assert user.id == "user_workos_first"
    assert user.email == "Owner@Example.com"
    assert user.first_name == "Alicia"
    assert user.last_name == "Morgan"
    assert user.email_verified is True
    assert user.avatar == "https://example.com/avatar.png"


@pytest.mark.asyncio
async def test_adapter_returns_none_when_no_user_matches() -> None:
    provider = WorkOSAuthProvider(_AdapterClient())  # type: ignore[arg-type]

    assert await provider.get_user_by_email(email="missing@example.com") is None


@pytest.mark.asyncio
async def test_adapter_delegates_compensating_deletes() -> None:
    client = _AdapterClient()
    provider = WorkOSAuthProvider(client)  # type: ignore[arg-type]

    await provider.delete_user(user_id="user_workos_123")
    await provider.delete_organization(organization_id="org_workos_123")

    assert client.deleted_users == ["user_workos_123"]
    assert client.deleted_organizations == ["org_workos_123"]
