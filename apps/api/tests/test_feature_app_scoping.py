from types import SimpleNamespace
from typing import Any, cast

import pytest

from core.errors import AppHTTPException
from db.repositories.apps import AppRepository
from services.features import FeatureEvaluationContext, FeatureService


def _service() -> FeatureService:
    return FeatureService(cast(Any, None))


def test_app_feature_key_must_match_the_selected_app() -> None:
    app = SimpleNamespace(slug="876-billing", name="876 Billing")

    _service()._validate_feature_app("billing_search_bar", cast(Any, app))

    with pytest.raises(AppHTTPException) as exc:
        _service()._validate_feature_app("console_search_bar", cast(Any, app))

    assert exc.value.app_code == "feature/app-prefix-mismatch"


def test_platform_feature_key_requires_platform_prefix() -> None:
    _service()._validate_feature_app("platform_status_page", None)

    with pytest.raises(AppHTTPException):
        _service()._validate_feature_app("status_page", None)


def test_child_feature_must_share_app_and_extend_parent_key() -> None:
    parent = SimpleNamespace(
        id="ftr_parent",
        app_id="rap_console",
        slug="console_widgets",
    )

    _service()._validate_feature_parent(
        "console_widgets_notepad",
        "rap_console",
        cast(Any, parent),
    )

    with pytest.raises(AppHTTPException) as exc:
        _service()._validate_feature_parent(
            "console_notes",
            "rap_console",
            cast(Any, parent),
        )

    assert exc.value.app_code == "feature/parent-prefix-mismatch"


@pytest.mark.asyncio
async def test_product_feature_evaluation_combines_plan_overrides_and_global_kill_switch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = SimpleNamespace(id="app_billing", slug="876-billing", app_kind="product")

    def feature(feature_id: str, *, enabled: bool = True) -> SimpleNamespace:
        return SimpleNamespace(
            id=feature_id,
            enabled=enabled,
            default_value=False,
            tags=[],
            app_id=app.id,
            parent_feature_id=None,
        )

    plan_feature = feature("feature_plan")
    override_feature = feature("feature_override")
    globally_disabled = feature("feature_disabled", enabled=False)
    operational_feature = feature("feature_operational")

    class Features:
        async def list_evaluation_features(self, app_id: str) -> list[Any]:
            assert app_id == app.id
            return [plan_feature, override_feature, globally_disabled, operational_feature]

        async def list_plan_module_feature_ids(self, organization_id: str, app_id: str) -> set[str]:
            assert organization_id == "org_123"
            assert app_id == app.id
            return {plan_feature.id, globally_disabled.id}

        async def list_module_feature_ids(self, app_id: str) -> set[str]:
            return {plan_feature.id, override_feature.id, globally_disabled.id}

        async def list_org_features(self, organization_id: str) -> list[Any]:
            return [
                SimpleNamespace(feature_id=override_feature.id, status="enabled"),
            ]

        async def list_user_features(self, user_id: str) -> list[Any]:
            return [
                SimpleNamespace(feature_id=plan_feature.id, status="disabled"),
                SimpleNamespace(feature_id=globally_disabled.id, status="enabled"),
            ]

    async def fake_get_app(self: AppRepository, app_id: str) -> Any:
        return app

    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_app)
    service = FeatureService(cast(Any, object()))
    service.features = cast(Any, Features())

    result = await service.evaluate(
        FeatureEvaluationContext(
            user_id="user_123",
            organization_id="org_123",
            app_id=app.id,
        )
    )

    assert result == [override_feature, operational_feature]


@pytest.mark.asyncio
async def test_widget_evaluation_combines_platform_app_org_and_user_layers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = SimpleNamespace(id="app_billing", slug="876-billing", app_kind="product")
    platform = SimpleNamespace(
        id="platform_widgets",
        enabled=True,
        default_value=True,
        tags=["widget"],
        app_id=None,
        parent_feature_id=None,
    )
    platform_notepad = SimpleNamespace(
        id="platform_widgets_notepad",
        enabled=True,
        default_value=True,
        tags=["widget"],
        app_id=None,
        parent_feature_id=platform.id,
    )
    billing = SimpleNamespace(
        id="billing_widgets",
        enabled=True,
        default_value=True,
        tags=["widget"],
        app_id=app.id,
        parent_feature_id=None,
    )
    billing_notepad = SimpleNamespace(
        id="billing_widgets_notepad",
        enabled=True,
        default_value=False,
        tags=["widget"],
        app_id=app.id,
        parent_feature_id=billing.id,
    )

    class Features:
        async def list_evaluation_features(self, app_id: str) -> list[Any]:
            return [platform, platform_notepad, billing, billing_notepad]

        async def list_plan_module_feature_ids(self, organization_id: str, app_id: str) -> set[str]:
            return set()

        async def list_module_feature_ids(self, app_id: str) -> set[str]:
            return set()

        async def list_org_features(self, organization_id: str) -> list[Any]:
            return [SimpleNamespace(feature_id=billing_notepad.id, status="enabled")]

        async def list_user_features(self, user_id: str) -> list[Any]:
            return [SimpleNamespace(feature_id=platform_notepad.id, status="disabled")]

    async def fake_get_app(self: AppRepository, app_id: str) -> Any:
        return app

    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_app)
    service = FeatureService(cast(Any, object()))
    service.features = cast(Any, Features())

    result = await service.evaluate(
        FeatureEvaluationContext(user_id="user_123", organization_id="org_123", app_id=app.id)
    )

    assert platform in result
    assert platform_notepad not in result
    assert billing in result
    assert billing_notepad in result


@pytest.mark.asyncio
async def test_widget_parent_global_kill_switch_cannot_be_overridden(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = SimpleNamespace(id="app_billing", slug="876-billing", app_kind="product")
    parent = SimpleNamespace(
        id="platform_widgets",
        enabled=False,
        default_value=True,
        tags=["widget"],
        app_id=None,
        parent_feature_id=None,
    )
    child = SimpleNamespace(
        id="platform_widgets_notepad",
        enabled=True,
        default_value=True,
        tags=["widget"],
        app_id=None,
        parent_feature_id=parent.id,
    )

    class Features:
        async def list_evaluation_features(self, app_id: str) -> list[Any]:
            return [child, parent]

        async def list_plan_module_feature_ids(self, organization_id: str, app_id: str) -> set[str]:
            return set()

        async def list_module_feature_ids(self, app_id: str) -> set[str]:
            return set()

        async def list_org_features(self, organization_id: str) -> list[Any]:
            return []

        async def list_user_features(self, user_id: str) -> list[Any]:
            return [SimpleNamespace(feature_id=child.id, status="enabled")]

    async def fake_get_app(self: AppRepository, app_id: str) -> Any:
        return app

    monkeypatch.setattr(AppRepository, "get_by_id", fake_get_app)
    service = FeatureService(cast(Any, object()))
    service.features = cast(Any, Features())

    result = await service.evaluate(
        FeatureEvaluationContext(user_id="user_123", organization_id="org_123", app_id=app.id)
    )

    assert result == []
