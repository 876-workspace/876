from __future__ import annotations

from typing import Any

import httpx
from fastapi import status

from core.errors import AppHTTPException


class PostHogClient:
    """Narrow PostHog management API client for the shared 876 project."""

    def __init__(
        self,
        *,
        host: str,
        project_id: int,
        personal_api_key: str,
        timeout: float = 20.0,
    ) -> None:
        self._base_url = host.rstrip("/")
        self._project_id = project_id
        self._headers = {
            "Authorization": f"Bearer {personal_api_key}",
            "Content-Type": "application/json",
        }
        self._timeout = timeout

    async def list_features(self) -> list[dict[str, Any]]:
        url: str | None = self._feature_url()
        features: list[dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            while url:
                payload = await self._request(client, "GET", url)
                results = payload.get("results", [])
                if isinstance(results, list):
                    features.extend(item for item in results if isinstance(item, dict))
                next_url = payload.get("next")
                url = str(next_url) if next_url else None

        return features

    async def create_feature(
        self,
        *,
        key: str,
        name: str,
        description: str | None,
        enabled: bool,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "key": key,
            "name": description or name,
            "active": enabled,
            "filters": {"groups": [{"properties": [], "rollout_percentage": 100}]},
            "evaluation_runtime": "server",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            return await self._request(client, "POST", self._feature_url(), json=payload)

    async def update_feature(
        self,
        feature_id: str,
        *,
        key: str | None = None,
        description: str | None = None,
        enabled: bool | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if key is not None:
            payload["key"] = key
        if description is not None:
            payload["name"] = description
        if enabled is not None:
            payload["active"] = enabled

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            return await self._request(
                client,
                "PATCH",
                self._feature_url(feature_id),
                json=payload,
            )

    async def delete_feature(self, feature_id: str) -> None:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            await self._request(
                client,
                "DELETE",
                self._feature_url(feature_id),
            )

    def _feature_url(self, feature_id: str | None = None) -> str:
        suffix = f"/{feature_id}/" if feature_id else "/"
        return f"{self._base_url}/api/projects/{self._project_id}/feature_flags{suffix}"

    async def _request(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            response = await client.request(method, url, headers=self._headers, json=json)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AppHTTPException(
                code="provider/posthog-error",
                message="PostHog feature flag request failed.",
                http_status_code=status.HTTP_502_BAD_GATEWAY,
            ) from exc

        if response.status_code == status.HTTP_204_NO_CONTENT:
            return {}

        payload = response.json()
        if not isinstance(payload, dict):
            raise AppHTTPException(
                code="provider/posthog-invalid",
                message="PostHog returned an invalid feature flag response.",
                http_status_code=status.HTTP_502_BAD_GATEWAY,
            )
        return payload


def get_posthog_client(settings: Any) -> PostHogClient:
    if not (settings.posthog_personal_api_key and settings.posthog_project_id and settings.posthog_host):
        raise AppHTTPException(
            code="provider/misconfigured",
            message=(
                "PostHog feature management is not configured. Set "
                "POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST."
            ),
            http_status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return PostHogClient(
        host=settings.posthog_host,
        project_id=settings.posthog_project_id,
        personal_api_key=settings.posthog_personal_api_key,
    )
