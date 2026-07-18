from typing import Any

import providers.feature_flags as feature_flags_module
from providers.feature_flags import PostHogFeatureFlagProvider, get_feature_flag_provider


async def test_create_serializes_posthog_feature(monkeypatch: Any) -> None:
    class FakePostHogClient:
        async def create_feature(self, **kwargs: Any) -> dict[str, Any]:
            assert kwargs == {
                "key": "billing_search_bar",
                "name": "billing_search_bar",
                "description": "Search billing records",
                "enabled": True,
            }
            return {
                "id": 42,
                "key": "billing_search_bar",
                "name": "Search billing records",
                "active": True,
            }

    monkeypatch.setattr(
        feature_flags_module,
        "get_posthog_client",
        lambda _settings: FakePostHogClient(),
    )

    result = await PostHogFeatureFlagProvider().create(
        slug="billing_search_bar",
        description="Search billing records",
        default_enabled=True,
        server_side_only=True,
    )

    assert result.provider == "posthog"
    assert result.provider_feature_id == "42"
    assert result.slug == "billing_search_bar"
    assert result.description == "Search billing records"
    assert result.enabled is True


def test_provider_is_posthog_only() -> None:
    assert isinstance(get_feature_flag_provider(), PostHogFeatureFlagProvider)
