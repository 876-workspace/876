from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest

import services.features as features_module
from core.errors import AppHTTPException
from services.features import FeatureService


def _update_arguments(*, enabled: bool | None) -> dict[str, Any]:
    return {
        "description": None,
        "description_set": False,
        "enabled": enabled,
        "app_id": None,
        "app_id_set": False,
        "consumer_default_enabled": None,
        "scope": None,
        "default_value": None,
        "tags": None,
        "value_type": None,
        "value": None,
        "value_set": False,
        "server_side_only": None,
        "archived": None,
        "parent_feature_id": None,
        "parent_feature_id_set": False,
    }


@pytest.mark.asyncio
async def test_update_rejects_unmigrated_provider_before_local_change(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    feature = SimpleNamespace(
        provider="flagsmith",
        provider_feature_id="legacy-id",
        enabled=True,
    )
    service = FeatureService(cast(Any, SimpleNamespace()))
    monkeypatch.setattr(
        service,
        "require_feature",
        AsyncMock(return_value=feature),
    )

    with pytest.raises(AppHTTPException) as exc:
        await service.update_feature(
            "ftr_123",
            **_update_arguments(enabled=False),
        )

    assert exc.value.app_code == "feature/provider-not-configured"
    assert feature.enabled is True


@pytest.mark.asyncio
async def test_update_syncs_posthog_before_flushing_local_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    feature = SimpleNamespace(
        provider="posthog",
        provider_feature_id="757983",
        provider_metadata={"active": True},
        enabled=True,
        synced_at=0,
        updated_at=0,
    )
    db = SimpleNamespace(flush=AsyncMock(), refresh=AsyncMock())
    provider = SimpleNamespace(
        update=AsyncMock(
            return_value=SimpleNamespace(metadata={"active": False})
        )
    )
    service = FeatureService(cast(Any, db))
    monkeypatch.setattr(
        service,
        "require_feature",
        AsyncMock(return_value=feature),
    )
    monkeypatch.setattr(
        features_module,
        "get_feature_flag_provider",
        lambda: provider,
    )

    result = await service.update_feature(
        "ftr_123",
        **_update_arguments(enabled=False),
    )

    provider.update.assert_awaited_once_with(
        provider_feature_id="757983",
        default_enabled=False,
    )
    db.flush.assert_awaited_once()
    db.refresh.assert_awaited_once_with(feature)
    assert result.enabled is False
    assert result.provider_metadata == {"active": False}
