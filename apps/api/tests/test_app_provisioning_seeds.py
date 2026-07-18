from types import SimpleNamespace
from unittest.mock import AsyncMock

from core.platform_apps import get_platform_app
from services.provisioning_seeds import _seed_application


async def test_seed_clones_recipe_and_adds_declared_finance_contract(monkeypatch) -> None:
    app = SimpleNamespace(id="rap_couriers", slug="876-couriers")
    current = SimpleNamespace(
        id="pmr_1",
        revision=1,
        reconciliation="create_missing",
        preserve_tenant_overrides=True,
        finance_dependency="none",
        finance_scopes=[],
        resources=[],
        steps=[SimpleNamespace(key="workspace", description="Create workspace", position=0)],
    )
    session = SimpleNamespace(scalar=AsyncMock(return_value=app))
    replace_draft = AsyncMock()
    publish = AsyncMock(
        return_value=SimpleNamespace(
            revision=2,
            finance_dependency="embedded",
        )
    )
    retrieve_revision = AsyncMock(side_effect=[current, None])
    reconcile = AsyncMock(return_value=(2, 2, None))

    monkeypatch.setattr(
        "services.provisioning_seeds.reconcile_finance_connections",
        reconcile,
    )

    definition = get_platform_app("876-couriers")
    assert definition is not None
    repository = SimpleNamespace(
        retrieve_revision=retrieve_revision,
        replace_draft=replace_draft,
        publish=publish,
    )
    await _seed_application(session, repository, definition)

    replace_draft.assert_awaited_once()
    values = replace_draft.await_args.kwargs
    assert values["finance_dependency"] == "embedded"
    assert values["finance_scopes"] == [
        "billing.customers.read",
        "billing.customers.write",
        "billing.invoices.read",
        "billing.invoices.write",
        "billing.items.read",
        "billing.items.write",
        "billing.payments.read",
        "billing.payments.write",
    ]
    assert values["resources"] == []
    assert values["steps"][0].key == "workspace"
    publish.assert_awaited_once_with("application", "rap_couriers", now=values["now"])
    reconcile.assert_awaited_once_with(session, app_id="rap_couriers", limit=None)


async def test_unchanged_seed_skips_finance_reconciliation(monkeypatch) -> None:
    definition = get_platform_app("876-billing")
    assert definition is not None
    app = SimpleNamespace(id="rap_billing", slug=definition.slug)
    current = SimpleNamespace(
        finance_dependency=definition.finance_dependency,
        finance_scopes=list(definition.finance_scopes),
    )
    session = SimpleNamespace(scalar=AsyncMock(return_value=app))
    repository = SimpleNamespace(retrieve_revision=AsyncMock(return_value=current))
    reconcile = AsyncMock(return_value=(1, 0, None))
    monkeypatch.setattr(
        "services.provisioning_seeds.reconcile_finance_connections",
        reconcile,
    )

    await _seed_application(session, repository, definition)

    reconcile.assert_not_awaited()


async def test_changed_seed_preserves_a_human_draft(monkeypatch) -> None:
    definition = get_platform_app("876-couriers")
    assert definition is not None
    app = SimpleNamespace(id="rap_couriers", slug=definition.slug)
    published = SimpleNamespace(
        revision=1,
        reconciliation="create_missing",
        preserve_tenant_overrides=True,
        finance_dependency="none",
        finance_scopes=[],
        resources=[],
        steps=[],
    )
    draft = SimpleNamespace(
        revision=2,
        reconciliation="create_missing",
        preserve_tenant_overrides=True,
        finance_dependency="none",
        finance_scopes=[],
        resources=[],
        steps=[SimpleNamespace(key="human-wip", description="Keep this step", position=0)],
    )
    session = SimpleNamespace(scalar=AsyncMock(return_value=app))
    repository = SimpleNamespace(
        retrieve_revision=AsyncMock(side_effect=[published, draft]),
        replace_draft=AsyncMock(),
        publish=AsyncMock(),
    )
    reconcile = AsyncMock()
    monkeypatch.setattr(
        "services.provisioning_seeds.reconcile_finance_connections",
        reconcile,
    )

    await _seed_application(session, repository, definition)

    repository.replace_draft.assert_not_awaited()
    repository.publish.assert_not_awaited()
    reconcile.assert_not_awaited()
