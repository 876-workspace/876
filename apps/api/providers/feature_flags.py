from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from core.config import get_settings
from providers.posthog.client import get_posthog_client


@dataclass(frozen=True)
class ProviderFeature:
    provider: str
    provider_feature_id: str
    provider_environment_state_id: str | None
    slug: str
    name: str
    description: str | None
    enabled: bool
    metadata: dict[str, Any]


class FeatureFlagProvider(Protocol):
    provider: str

    async def create(
        self,
        *,
        slug: str,
        description: str | None,
        default_enabled: bool,
        server_side_only: bool,
    ) -> ProviderFeature: ...

    async def update(
        self,
        *,
        provider_feature_id: str,
        description: str | None = None,
        default_enabled: bool | None = None,
        server_side_only: bool | None = None,
    ) -> ProviderFeature: ...

    async def delete(self, *, provider_feature_id: str) -> None: ...


class PostHogFeatureFlagProvider:
    provider = "posthog"

    async def create(
        self,
        *,
        slug: str,
        description: str | None,
        default_enabled: bool,
        server_side_only: bool,
    ) -> ProviderFeature:
        del server_side_only
        flag = await get_posthog_client(get_settings()).create_feature(
            key=slug,
            name=slug,
            description=description,
            enabled=default_enabled,
        )
        return self._serialize(flag)

    async def update(
        self,
        *,
        provider_feature_id: str,
        description: str | None = None,
        default_enabled: bool | None = None,
        server_side_only: bool | None = None,
    ) -> ProviderFeature:
        del server_side_only
        flag = await get_posthog_client(get_settings()).update_feature(
            provider_feature_id,
            description=description,
            enabled=default_enabled,
        )
        return self._serialize(flag)

    async def delete(self, *, provider_feature_id: str) -> None:
        await get_posthog_client(get_settings()).delete_feature(provider_feature_id)

    def _serialize(self, flag: dict[str, Any]) -> ProviderFeature:
        key = str(flag.get("key") or flag["id"])
        return ProviderFeature(
            provider=self.provider,
            provider_feature_id=str(flag["id"]),
            provider_environment_state_id=str(get_settings().posthog_project_id),
            slug=key,
            name=str(flag.get("name") or key),
            description=flag.get("name"),
            enabled=bool(flag.get("active", False)),
            metadata=flag,
        )


def get_feature_flag_provider() -> FeatureFlagProvider:
    return PostHogFeatureFlagProvider()
