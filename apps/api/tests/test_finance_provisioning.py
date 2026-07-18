from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import ANY, AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import FinanceProvisioningOutbox, ProvisioningRun
from services.finance_provisioning import (
    desired_finance_connection_status,
    enqueue_finance_connection_event,
    finance_event_payload,
    reconcile_finance_connections,
)
from services.finance_provisioning_dispatch import claim_finance_provisioning_events


@pytest.fixture(autouse=True)
def stub_run_correlation(monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    attach = AsyncMock()
    monkeypatch.setattr("services.finance_provisioning._attach_run", attach)
    return attach


def _subscription(**overrides: Any) -> Any:
    values = {
        "id": "sub_1",
        "organization_id": "org_1",
        "app_id": "rap_couriers",
        "status": "active",
        "finance_lifecycle_version": 0,
        "updated_at": 1_700_000_000,
    }
    return SimpleNamespace(**{**values, **overrides})


def _profile(**overrides: Any) -> Any:
    values = {
        "id": "pmr_app_2",
        "revision": 2,
        "finance_dependency": "embedded",
        "finance_scopes": ["billing.invoices.write", "billing.customers.read"],
        "steps": [],
    }
    return SimpleNamespace(**{**values, **overrides})


def _organization() -> Any:
    return SimpleNamespace(
        id="org_1",
        name="Efesto Technologies",
        short_name="Efesto",
        slug="efesto",
        country_code="JM",
        currency_code="JMD",
        status="active",
        deleted_at=None,
    )


def _app(**overrides: Any) -> Any:
    return SimpleNamespace(**{"status": "active", "deleted_at": None, **overrides})


def _db(
    subscription: Any,
    profile: Any,
    latest: Any,
    *,
    subscriptions: list[Any] | None = None,
    organization: Any | None = None,
    app: Any | None = None,
) -> Any:
    rows = subscriptions or [subscription]
    return SimpleNamespace(
        flush=AsyncMock(),
        scalar=AsyncMock(side_effect=[subscription, profile, latest]),
        scalars=AsyncMock(return_value=SimpleNamespace(all=lambda: rows)),
        get=AsyncMock(side_effect=[organization or _organization(), app or _app()]),
        add=Mock(),
    )


def test_subscription_status_mapping_denies_unknown_states_by_default() -> None:
    assert desired_finance_connection_status("active") == "ACTIVE"
    assert desired_finance_connection_status("trialing") == "ACTIVE"
    assert desired_finance_connection_status("canceled") == "REVOKED"
    assert desired_finance_connection_status("incomplete_expired") == "REVOKED"
    assert desired_finance_connection_status("past_due") == "SUSPENDED"
    assert desired_finance_connection_status("future_provider_state") == "SUSPENDED"


async def test_embedded_subscription_appends_a_versioned_finance_event(
    stub_run_correlation: AsyncMock,
) -> None:
    subscription = _subscription()
    db = _db(subscription, _profile(), None)

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert event is not None
    assert event.id.startswith("fpe_")
    assert event.aggregate_id == "org_1:rap_couriers"
    assert event.desired_status == "ACTIVE"
    assert event.scopes == ["billing.customers.read", "billing.invoices.write"]
    assert event.lifecycle_version == 1
    assert subscription.finance_lifecycle_version == 1
    db.add.assert_called_once_with(event)
    stub_run_correlation.assert_awaited_once()
    assert finance_event_payload(event) == {
        "eventId": event.id,
        "eventType": "finance_connection.ensure",
        "contractVersion": 1,
        "aggregateId": "org_1:rap_couriers",
        "organization": {
            "id": "org_1",
            "name": "Efesto Technologies",
            "slug": "efesto",
            "countryCode": "JM",
            "currencyCode": "JMD",
        },
        "sourceAppId": "rap_couriers",
        "entitlementReference": "sub_1",
        "manifestVersion": 1,
        "provisioningRevision": 2,
        "lifecycleVersion": 1,
        "desiredStatus": "ACTIVE",
        "scopes": ["billing.customers.read", "billing.invoices.write"],
        "occurredAt": event.occurred_at,
    }


async def test_event_normalizes_workspace_display_fields_to_the_billing_contract() -> None:
    subscription = _subscription()
    organization = _organization()
    organization.name = "E" * 200
    organization.slug = "a"
    db = _db(subscription, _profile(), None, organization=organization)

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert event is not None
    assert event.organization_name == "E" * 160
    assert event.organization_slug.startswith("a-")
    assert 2 <= len(event.organization_slug) <= 80


async def test_identical_retry_reuses_latest_outbox_event() -> None:
    subscription = _subscription(finance_lifecycle_version=1)
    latest = SimpleNamespace(
        desired_status="ACTIVE",
        scopes=["billing.customers.read", "billing.invoices.write"],
        provisioning_version=2,
        lifecycle_version=1,
        source_app_id="rap_couriers",
        entitlement_reference="sub_1",
        run_id="prn_existing",
    )
    db = _db(subscription, _profile(), latest)

    result = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert result is cast(FinanceProvisioningOutbox, latest)
    assert subscription.finance_lifecycle_version == 1
    assert db.get.await_count == 2
    db.add.assert_not_called()


async def test_identical_event_returns_the_newly_attached_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    subscription = _subscription(finance_lifecycle_version=1)
    latest = SimpleNamespace(
        id="fpe_existing",
        desired_status="ACTIVE",
        scopes=["billing.customers.read", "billing.invoices.write"],
        provisioning_version=2,
        lifecycle_version=1,
        source_app_id="rap_couriers",
        entitlement_reference="sub_1",
        run_id=None,
    )
    db = _db(subscription, _profile(), latest)
    run = ProvisioningRun(id="prn_attached", outbox_event_id=latest.id)
    attach = AsyncMock(return_value=run)
    monkeypatch.setattr("services.finance_provisioning._attach_run", attach)

    result = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert result is run
    attach.assert_awaited_once()


async def test_removing_embedded_dependency_enqueues_revocation() -> None:
    subscription = _subscription(finance_lifecycle_version=1)
    latest = SimpleNamespace(
        desired_status="ACTIVE",
        scopes=["billing.customers.read"],
        provisioning_version=2,
        lifecycle_version=1,
        source_app_id="rap_couriers",
        entitlement_reference="sub_1",
    )
    db = _db(
        subscription,
        _profile(revision=3, finance_dependency="none", finance_scopes=[]),
        latest,
    )

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert event is not None
    assert event.desired_status == "REVOKED"
    assert event.provisioning_version == 3
    assert event.scopes == ["billing.customers.read"]
    assert event.lifecycle_version == 2


async def test_direct_application_creates_an_app_owned_run_without_finance_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    subscription = _subscription(app_id="rap_billing")
    profile = _profile(finance_dependency="none", finance_scopes=[])
    db = _db(subscription, profile, None)
    run = ProvisioningRun(id="prn_direct")
    create_run = AsyncMock(return_value=(run, True))
    monkeypatch.setattr(
        "services.finance_provisioning.ProvisioningRunRepository.create_for_application",
        create_run,
    )

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert event is run
    create_run.assert_awaited_once_with(
        organization_id="org_1",
        app_id="rap_billing",
        subscription_id="sub_1",
        trigger="app_activation",
        application_revision=profile,
        now=ANY,
    )


async def test_direct_application_reuses_the_existing_run_without_counting_change(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    subscription = _subscription(app_id="rap_billing")
    profile = _profile(finance_dependency="none", finance_scopes=[])
    db = _db(subscription, profile, None)
    existing = ProvisioningRun(id="prn_direct")
    create_run = AsyncMock(return_value=(existing, False))
    monkeypatch.setattr(
        "services.finance_provisioning.ProvisioningRunRepository.create_for_application",
        create_run,
    )

    result = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert result is None


async def test_reconciliation_counts_a_new_direct_application_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    subscription = _subscription(app_id="rap_billing")
    db = SimpleNamespace(
        scalars=AsyncMock(
            return_value=SimpleNamespace(all=lambda: [subscription])
        )
    )
    enqueue = AsyncMock(return_value=ProvisioningRun(id="prn_direct"))
    monkeypatch.setattr(
        "services.finance_provisioning.enqueue_finance_connection_event", enqueue
    )

    examined, changed, cursor = await reconcile_finance_connections(
        cast(AsyncSession, db), trigger="manual_reconcile"
    )

    assert (examined, changed, cursor) == (1, 1, None)


async def test_reconciliation_counts_a_run_attached_to_an_existing_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    subscription = _subscription(finance_lifecycle_version=1)
    db = SimpleNamespace(
        scalars=AsyncMock(return_value=SimpleNamespace(all=lambda: [subscription]))
    )
    attached_run = ProvisioningRun(id="prn_attached", outbox_event_id="fpe_existing")
    enqueue = AsyncMock(return_value=attached_run)
    monkeypatch.setattr(
        "services.finance_provisioning.enqueue_finance_connection_event", enqueue
    )

    examined, changed, cursor = await reconcile_finance_connections(
        cast(AsyncSession, db), trigger="manual_reconcile"
    )

    assert (examined, changed, cursor) == (1, 1, None)


async def test_inactive_app_suspends_existing_finance_connection() -> None:
    subscription = _subscription(finance_lifecycle_version=1)
    latest = SimpleNamespace(
        desired_status="ACTIVE",
        scopes=["billing.customers.read"],
        provisioning_version=2,
        lifecycle_version=1,
        source_app_id="rap_couriers",
        entitlement_reference="sub_1",
    )
    db = _db(
        subscription,
        _profile(finance_scopes=latest.scopes),
        latest,
        app=_app(status="inactive"),
    )

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert event is not None
    assert event.desired_status == "SUSPENDED"
    assert event.lifecycle_version == 2


async def test_deleted_organization_revokes_existing_finance_connection() -> None:
    subscription = _subscription(finance_lifecycle_version=1)
    latest = SimpleNamespace(
        desired_status="ACTIVE",
        scopes=["billing.customers.read"],
        provisioning_version=2,
        lifecycle_version=1,
        source_app_id="rap_couriers",
        entitlement_reference="sub_1",
    )
    organization = _organization()
    organization.deleted_at = 1_700_000_100
    db = _db(
        subscription,
        _profile(finance_scopes=latest.scopes),
        latest,
        organization=organization,
    )

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), subscription)

    assert event is not None
    assert event.desired_status == "REVOKED"
    assert event.lifecycle_version == 2


async def test_another_active_subscription_prevents_connection_revocation() -> None:
    canceled = _subscription(status="canceled", finance_lifecycle_version=1)
    active = _subscription(id="sub_2", status="active", finance_lifecycle_version=1)
    latest = SimpleNamespace(
        desired_status="ACTIVE",
        scopes=["billing.customers.read"],
        provisioning_version=2,
        lifecycle_version=1,
        source_app_id="rap_couriers",
        entitlement_reference="sub_1",
    )
    db = _db(
        canceled,
        _profile(finance_scopes=latest.scopes),
        latest,
        subscriptions=[canceled, active],
    )

    event = await enqueue_finance_connection_event(cast(AsyncSession, db), canceled)

    assert event is not None
    assert event.desired_status == "ACTIVE"
    assert event.entitlement_reference == "sub_2"
    assert event.lifecycle_version == 2
    assert canceled.finance_lifecycle_version == 2
    assert active.finance_lifecycle_version == 2


async def test_outbox_claim_marks_retry_state_before_network_delivery() -> None:
    event = SimpleNamespace(
        status="failed",
        attempt_count=2,
        locked_at=None,
        last_error="temporary failure",
        updated_at=0,
    )
    scalar_result = SimpleNamespace(all=lambda: [event])
    db = SimpleNamespace(scalars=AsyncMock(return_value=scalar_result), flush=AsyncMock())

    claimed = await claim_finance_provisioning_events(
        cast(AsyncSession, db),
        now=1_700_000_100,
        limit=25,
    )

    assert claimed == [event]
    assert event.status == "processing"
    assert event.attempt_count == 3
    assert event.locked_at == 1_700_000_100
    assert event.last_error is None
    assert event.updated_at == 1_700_000_100
    db.flush.assert_awaited_once()


async def test_outbox_claim_loads_all_runs_in_one_query(monkeypatch: pytest.MonkeyPatch) -> None:
    events = [
        SimpleNamespace(
            run_id="prn_1",
            status="pending",
            attempt_count=0,
            locked_at=None,
            last_error=None,
            updated_at=0,
        ),
        SimpleNamespace(
            run_id="prn_2",
            status="failed",
            attempt_count=1,
            locked_at=None,
            last_error="retry",
            updated_at=0,
        ),
    ]
    runs = [ProvisioningRun(id="prn_1"), ProvisioningRun(id="prn_2")]
    db = SimpleNamespace(
        scalars=AsyncMock(
            side_effect=[
                SimpleNamespace(all=lambda: events),
                SimpleNamespace(all=lambda: runs),
            ]
        ),
        flush=AsyncMock(),
    )
    mark_processing = Mock()
    monkeypatch.setattr(
        "services.finance_provisioning_dispatch.ProvisioningRunRepository.mark_processing",
        mark_processing,
    )

    await claim_finance_provisioning_events(
        cast(AsyncSession, db),
        now=1_700_000_100,
        limit=25,
    )

    assert db.scalars.await_count == 2
    assert mark_processing.call_count == 2
