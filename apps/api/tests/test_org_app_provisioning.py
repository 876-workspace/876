"""Which apps a new organization is entitled to.

Every org gets Enterprise (where it manages itself) and Billing (its financial
plane) without asking, plus the product app it signed up through. Before this,
only Enterprise was provisioned, so a courier company registering through
Couriers landed on an onboarding screen whose own subscription lookup 404'd.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from services.provisioning import (
    BILLING_APP_SLUG,
    DEFAULT_ORG_APP_SLUGS,
    ENTERPRISE_APP_SLUG,
    provision_org_apps,
)

ORG = "org_2kL9mN4q"
COURIERS_APP_ID = "rap_couriers"
APPS_BY_SLUG = {
    ENTERPRISE_APP_SLUG: "rap_enterprise",
    BILLING_APP_SLUG: "rap_billing",
    "876-couriers": COURIERS_APP_ID,
}


class _FakeApps:
    def __init__(self, known: dict[str, str]) -> None:
        self._known = known

    async def get_by_slug(self, slug: str) -> Any:
        app_id = self._known.get(slug)
        return SimpleNamespace(id=app_id, slug=slug) if app_id else None


class _FakeSubscriptions:
    def __init__(self, existing: set[str] | None = None) -> None:
        self.existing = existing or set()
        self.provisioned: list[tuple[str, str, str | None]] = []

    async def get(self, org_id: str, app_id: str) -> Any:
        return SimpleNamespace(id="sub_existing") if app_id in self.existing else None

    async def provision(self, org_id: str, app_id: str, price_id: str | None) -> Any:
        self.provisioned.append((org_id, app_id, price_id))
        return SimpleNamespace(id=f"sub_{app_id}")


class _FakePrices:
    async def get_default_for_app(self, app_id: str) -> Any:
        return SimpleNamespace(id=f"prc_{app_id}")


@pytest.fixture
def wired(monkeypatch: pytest.MonkeyPatch) -> _FakeSubscriptions:
    subscriptions = _FakeSubscriptions()
    monkeypatch.setattr("services.provisioning.AppRepository", lambda db: _FakeApps(APPS_BY_SLUG))
    monkeypatch.setattr("services.provisioning.SubscriptionRepository", lambda db: subscriptions)
    monkeypatch.setattr("services.provisioning.PriceRepository", lambda db: _FakePrices())
    return subscriptions


class TestDefaultApps:
    def test_the_default_set_is_enterprise_and_billing(self) -> None:
        assert DEFAULT_ORG_APP_SLUGS == (ENTERPRISE_APP_SLUG, BILLING_APP_SLUG)

    async def test_provisions_both_defaults_for_a_plain_org(self, wired: _FakeSubscriptions) -> None:
        await provision_org_apps(None, ORG)

        assert [app_id for _org, app_id, _price in wired.provisioned] == [
            "rap_enterprise",
            "rap_billing",
        ]

    async def test_attaches_the_default_price_for_each_app(self, wired: _FakeSubscriptions) -> None:
        await provision_org_apps(None, ORG)

        assert wired.provisioned[0][2] == "prc_rap_enterprise"


class TestSourceApp:
    async def test_also_provisions_the_app_the_org_signed_up_through(
        self, wired: _FakeSubscriptions
    ) -> None:
        """The whole point: registering through Couriers must grant Couriers."""
        await provision_org_apps(None, ORG, source_app_id=COURIERS_APP_ID)

        assert COURIERS_APP_ID in [app_id for _org, app_id, _price in wired.provisioned]

    async def test_does_not_duplicate_when_the_source_is_already_a_default(
        self, wired: _FakeSubscriptions
    ) -> None:
        await provision_org_apps(None, ORG, source_app_id="rap_enterprise")

        app_ids = [app_id for _org, app_id, _price in wired.provisioned]
        assert app_ids.count("rap_enterprise") == 1

    async def test_provisions_only_the_defaults_without_a_source(self, wired: _FakeSubscriptions) -> None:
        await provision_org_apps(None, ORG, source_app_id=None)

        assert len(wired.provisioned) == 2


class TestIdempotence:
    async def test_skips_an_app_the_org_already_subscribes_to(self, monkeypatch: pytest.MonkeyPatch) -> None:
        subscriptions = _FakeSubscriptions(existing={"rap_enterprise"})
        monkeypatch.setattr("services.provisioning.AppRepository", lambda db: _FakeApps(APPS_BY_SLUG))
        monkeypatch.setattr("services.provisioning.SubscriptionRepository", lambda db: subscriptions)
        monkeypatch.setattr("services.provisioning.PriceRepository", lambda db: _FakePrices())

        await provision_org_apps(None, ORG)

        assert [app_id for _org, app_id, _price in subscriptions.provisioned] == ["rap_billing"]

    async def test_running_twice_provisions_nothing_the_second_time(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        subscriptions = _FakeSubscriptions()
        monkeypatch.setattr("services.provisioning.AppRepository", lambda db: _FakeApps(APPS_BY_SLUG))
        monkeypatch.setattr("services.provisioning.SubscriptionRepository", lambda db: subscriptions)
        monkeypatch.setattr("services.provisioning.PriceRepository", lambda db: _FakePrices())

        await provision_org_apps(None, ORG)
        subscriptions.existing.update(app_id for _org, app_id, _price in subscriptions.provisioned)
        subscriptions.provisioned.clear()

        await provision_org_apps(None, ORG)

        assert subscriptions.provisioned == []


class TestPartiallySeededEnvironment:
    async def test_a_missing_app_row_does_not_fail_provisioning(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A half-seeded environment must not break somebody's signup."""
        subscriptions = _FakeSubscriptions()
        monkeypatch.setattr(
            "services.provisioning.AppRepository",
            lambda db: _FakeApps({ENTERPRISE_APP_SLUG: "rap_enterprise"}),
        )
        monkeypatch.setattr("services.provisioning.SubscriptionRepository", lambda db: subscriptions)
        monkeypatch.setattr("services.provisioning.PriceRepository", lambda db: _FakePrices())

        provisioned = await provision_org_apps(None, ORG)

        assert provisioned == ["rap_enterprise"]
