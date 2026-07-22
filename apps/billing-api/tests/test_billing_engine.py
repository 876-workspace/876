from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from core.errors import AppHTTPException
from db.models import Customer, Invoice, Price, Subscription, SubscriptionBillingRun, SubscriptionItem
from db.models.generated.enums import (
    BillingRunStatus,
    BillingTiming,
    IntervalUnit,
    PricingModel,
    RenewalPricingPolicy,
    SubscriptionInvoiceMode,
    SubscriptionStatus,
    TaxBehavior,
)
from domains.billing.workflows.calculations import (
    add_interval,
    adjust_renewal_amount,
    allocate_discount,
    calculate_catalog_amount,
    calculate_late_fee,
    calculate_tax,
    prorate_initial_stub,
)
from domains.billing.workflows.engine import bill_subscription, run_billing_sweep


def test_catalog_calculations_preserve_minor_units_and_tier_coverage() -> None:
    assert calculate_catalog_amount(PricingModel.FLAT, 500, 8) == 500
    assert calculate_catalog_amount(PricingModel.PER_UNIT, 125, 4) == 500
    assert calculate_catalog_amount(PricingModel.PACKAGE, 300, 7, package_size=3) == 900
    assert (
        calculate_catalog_amount(
            PricingModel.VOLUME,
            None,
            12,
            tiers=((1, 10, 100, 0), (11, None, 80, 50)),
        )
        == 1_010
    )
    assert (
        calculate_catalog_amount(
            PricingModel.TIERED,
            None,
            12,
            tiers=((1, 10, 100, 0), (11, None, 80, 50)),
        )
        == 1_210
    )


def test_financial_rounding_and_calendar_intervals_are_deterministic() -> None:
    assert calculate_tax(10_000, Decimal("16.5000"), inclusive=False) == 1_650
    assert calculate_tax(11_650, Decimal("16.5000"), inclusive=True) == 1_650
    assert (
        calculate_late_fee(
            10_005,
            calculation_type="PERCENTAGE",
            percent=Decimal("2.5000"),
            fixed_amount=None,
        )
        == 250
    )
    assert allocate_discount(101, [100, 200, 300]) == [16, 33, 52]
    assert add_interval(1_706_659_200, IntervalUnit.MONTH, 1) == 1_709_164_800  # Jan 31 -> Feb 29
    assert adjust_renewal_amount(10_000, RenewalPricingPolicy.MARKUP, Decimal("2.5000")) == 10_250
    assert (
        prorate_initial_stub(
            3_100,
            has_stub=True,
            period_start=1_706_659_200,
            period_end=1_709_164_800,
            billing_anchor=1_706_659_200,
            interval_unit=IntervalUnit.MONTH,
            interval_count=1,
        )
        == 3_100
    )


async def test_bill_subscription_creates_one_invoice_and_advances_the_period() -> None:
    subscription = Subscription(
        id="sub_123",
        tenant_id="btenant_123",
        customer_id="cust_123",
        status=SubscriptionStatus.ACTIVE,
        current_period_start=1_700_000_000,
        current_period_end=1_702_678_400,
        service_period_start=1_700_000_000,
        service_period_end=1_702_678_400,
        billing_cycle_anchor=1_700_000_000,
        next_billing_at=1_700_000_000,
        billed_cycle_count=0,
        completed_regular_cycles=0,
        has_initial_stub_period=False,
        billing_timing=BillingTiming.IN_ADVANCE,
        payment_term_id=None,
        tax_behavior=TaxBehavior.EXCLUSIVE,
        invoice_mode_override=SubscriptionInvoiceMode.AUTO_FINALIZE,
        renewal_pricing_policy=RenewalPricingPolicy.RETAIN_EXISTING,
        renewal_adjustment_percent=None,
        remaining_cycles=None,
        advance_billing_enabled=False,
        advance_billing_days=None,
    )
    item = SubscriptionItem(
        id="subitem_123",
        subscription_id=subscription.id,
        price_id="price_123",
        quantity=2,
        unit_amount=None,
        currency="JMD",
        description="Workspace seats",
        position=0,
        is_active=True,
    )
    price = Price(
        id="price_123",
        tenant_id=subscription.tenant_id,
        currency="JMD",
        unit_amount=750,
        pricing_model=PricingModel.PER_UNIT,
        package_size=None,
        interval_unit=IntervalUnit.MONTH,
        interval_count=1,
        is_taxable=False,
        nickname="Monthly seats",
    )
    customer = Customer(
        id="cust_123",
        tenant_id=subscription.tenant_id,
        name="Island Supply",
        email="accounts@example.com",
        payment_term_id=None,
        billing_address={"country": "JM"},
        invoice_notes=None,
        invoice_terms=None,
        outstanding_receivable=0,
        updated_at=1,
    )
    execution = MagicMock()
    execution.tuples.return_value = [(item, price, False, False, False, None, None, None)]
    empty_scalars = MagicMock()
    empty_scalars.all.return_value = []
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[subscription, None, None, customer, None, None, 2])
    session.execute = AsyncMock(return_value=execution)
    session.scalars = AsyncMock(side_effect=[empty_scalars, empty_scalars, empty_scalars])
    session.flush = AsyncMock()

    result = await bill_subscription(
        session,
        subscription.tenant_id,
        subscription.id,
        as_of=1_700_000_100,
    )

    assert result.status == "succeeded"
    created = [call.args[0] for call in session.add.call_args_list]
    invoice = next(value for value in created if isinstance(value, Invoice))
    assert invoice.total_amount == 1_500
    assert invoice.amount_due == 1_500
    assert customer.outstanding_receivable == 1_500
    assert subscription.billed_cycle_count == 1
    assert subscription.next_billing_at == subscription.current_period_start
    assert session.flush.await_count == 2


async def test_bill_subscription_returns_existing_success_without_duplicate_invoice() -> None:
    subscription = Subscription(
        id="sub_123",
        tenant_id="btenant_123",
        status=SubscriptionStatus.ACTIVE,
        next_billing_at=200,
        next_advance_invoice_at=100,
        current_period_start=100,
        current_period_end=200,
    )
    run = SubscriptionBillingRun(
        id="sbrun_123",
        tenant_id=subscription.tenant_id,
        subscription_id=subscription.id,
        period_start=100,
        period_end=200,
        status=BillingRunStatus.SUCCEEDED,
        invoice_id="inv_existing",
    )
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[subscription, run])

    result = await bill_subscription(
        session,
        subscription.tenant_id,
        subscription.id,
        as_of=100,
        advance=True,
    )

    assert result.status == "skipped"
    assert result.invoice_id == "inv_existing"
    session.add.assert_not_called()


async def test_regular_delivery_advances_an_existing_advance_invoice_run() -> None:
    subscription = Subscription(
        id="sub_123",
        tenant_id="btenant_123",
        status=SubscriptionStatus.ACTIVE,
        next_billing_at=200,
        current_period_start=100,
        current_period_end=200,
        billing_cycle_anchor=100,
        billing_timing=BillingTiming.IN_ADVANCE,
        billed_cycle_count=0,
        completed_regular_cycles=0,
        has_initial_stub_period=False,
        remaining_cycles=None,
        advance_billing_enabled=True,
        advance_billing_days=5,
    )
    run = SubscriptionBillingRun(
        id="sbrun_123",
        tenant_id=subscription.tenant_id,
        subscription_id=subscription.id,
        period_start=100,
        period_end=200,
        status=BillingRunStatus.SUCCEEDED,
        invoice_id="inv_existing",
        is_advance_billing=True,
        period_advanced_at=None,
        updated_at=100,
    )
    price = Price(
        id="price_123",
        tenant_id=subscription.tenant_id,
        interval_unit=IntervalUnit.MONTH,
        interval_count=1,
    )
    session = MagicMock()
    session.scalar = AsyncMock(side_effect=[subscription, run, price])
    session.flush = AsyncMock()

    result = await bill_subscription(session, subscription.tenant_id, subscription.id, as_of=200)

    assert result.status == "succeeded"
    assert result.invoice_id == "inv_existing"
    assert run.period_advanced_at == 200
    assert subscription.next_billing_at is not None
    session.add.assert_not_called()


async def test_sweep_rejects_unbounded_work() -> None:
    with pytest.raises(AppHTTPException) as invalid:
        await run_billing_sweep(MagicMock(), limit=501)

    assert invalid.value.app_code == "validation/invalid-request"
