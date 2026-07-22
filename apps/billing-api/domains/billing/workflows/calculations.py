from __future__ import annotations

import calendar
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from db.models.generated.enums import IntervalUnit, PricingModel, RenewalPricingPolicy

PERCENT_SCALE = 1_000_000


def calculate_catalog_amount(
    pricing_model: PricingModel,
    unit_amount: int | None,
    quantity: int,
    *,
    package_size: int | None = None,
    tiers: tuple[tuple[int, int | None, int | None, int | None], ...] = (),
) -> int:
    if quantity <= 0:
        raise ValueError("Quantity must be a positive integer.")
    if pricing_model is PricingModel.FLAT:
        return _required_amount(unit_amount)
    if pricing_model is PricingModel.PER_UNIT:
        return _required_amount(unit_amount) * quantity
    if pricing_model is PricingModel.PACKAGE:
        if not package_size:
            raise ValueError("Package size is unavailable.")
        packages = (quantity + package_size - 1) // package_size
        return _required_amount(unit_amount) * packages

    ordered = sorted(tiers, key=lambda tier: tier[0])
    if pricing_model is PricingModel.VOLUME:
        for start, end, tier_amount, flat_amount in ordered:
            if quantity >= start and (end is None or quantity <= end):
                return _required_amount(tier_amount) * quantity + (flat_amount or 0)
        raise ValueError("No volume tier covers this quantity.")

    total = 0
    covered_through = 0
    for start, end, tier_amount, flat_amount in ordered:
        if quantity < start:
            break
        tier_end = min(quantity, end or quantity)
        units = max(tier_end - start + 1, 0)
        if units:
            total += _required_amount(tier_amount) * units + (flat_amount or 0)
            covered_through = max(covered_through, tier_end)
    if covered_through < quantity:
        raise ValueError("The tiered price does not cover this quantity.")
    return total


def calculate_discount(
    subtotal: int,
    currency: str,
    *,
    discount_type: str,
    percent_off: Decimal | None,
    amount_off: int | None,
    discount_currency: str | None,
) -> int:
    if subtotal <= 0:
        return 0
    if discount_type == "AMOUNT":
        if discount_currency != currency:
            return 0
        return min(amount_off or 0, subtotal)
    percent = _scaled_percent(percent_off)
    return min((subtotal * percent + PERCENT_SCALE // 2) // PERCENT_SCALE, subtotal)


def calculate_tax(amount: int, rate: Decimal | None, *, inclusive: bool) -> int:
    scaled_rate = _scaled_percent(rate)
    if amount <= 0 or scaled_rate <= 0:
        return 0
    if inclusive:
        net = (amount * PERCENT_SCALE + (PERCENT_SCALE + scaled_rate) // 2) // (PERCENT_SCALE + scaled_rate)
        return amount - net
    return (amount * scaled_rate + PERCENT_SCALE // 2) // PERCENT_SCALE


def allocate_discount(total_discount: int, line_subtotals: list[int]) -> list[int]:
    subtotal = sum(line_subtotals)
    if subtotal <= 0:
        return [0 for _ in line_subtotals]
    allocated = 0
    result: list[int] = []
    for index, value in enumerate(line_subtotals):
        amount = total_discount - allocated if index == len(line_subtotals) - 1 else total_discount * value // subtotal
        result.append(amount)
        allocated += amount
    return result


def calculate_late_fee(
    amount_due: int,
    *,
    calculation_type: str,
    percent: Decimal | None,
    fixed_amount: int | None,
) -> int:
    if amount_due <= 0:
        return 0
    if calculation_type == "FIXED":
        return max(fixed_amount or 0, 0)
    return calculate_discount(
        amount_due,
        "",
        discount_type="PERCENTAGE",
        percent_off=percent,
        amount_off=None,
        discount_currency=None,
    )


def adjust_renewal_amount(
    amount: int | None,
    policy: RenewalPricingPolicy,
    percent: Decimal | None,
) -> int | None:
    if amount is None or policy in (RenewalPricingPolicy.RETAIN_EXISTING, RenewalPricingPolicy.USE_LATEST):
        return amount
    adjustment = (amount * _scaled_percent(percent) + PERCENT_SCALE // 2) // PERCENT_SCALE
    return amount + adjustment if policy is RenewalPricingPolicy.MARKUP else max(amount - adjustment, 0)


def prorate_initial_stub(
    amount: int,
    *,
    has_stub: bool,
    period_start: int,
    period_end: int,
    billing_anchor: int | None,
    interval_unit: IntervalUnit | None,
    interval_count: int | None,
) -> int:
    if not has_stub or billing_anchor is None or interval_unit is None or interval_count is None:
        return amount
    regular_end = add_interval(billing_anchor, interval_unit, interval_count)
    regular_seconds = regular_end - billing_anchor
    stub_seconds = period_end - period_start
    if regular_seconds <= 0 or stub_seconds <= 0:
        raise ValueError("Calendar billing periods must have a positive duration.")
    return (amount * stub_seconds + regular_seconds // 2) // regular_seconds


def add_interval(starts_at: int, unit: IntervalUnit, count: int) -> int:
    if count <= 0:
        raise ValueError("Interval count must be positive.")
    value = datetime.fromtimestamp(starts_at, UTC)
    if unit is IntervalUnit.DAY:
        return starts_at + count * 86_400
    if unit is IntervalUnit.WEEK:
        return starts_at + count * 7 * 86_400
    months = count if unit is IntervalUnit.MONTH else count * 12
    target_month = value.month - 1 + months
    year = value.year + target_month // 12
    month = target_month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return int(value.replace(year=year, month=month, day=day).timestamp())


def _required_amount(value: int | None) -> int:
    if value is None:
        raise ValueError("Price amount is unavailable.")
    return value


def _scaled_percent(value: Decimal | None) -> int:
    if value is None or value <= 0:
        return 0
    scaled = (value * Decimal(10_000)).quantize(Decimal(1), rounding=ROUND_HALF_UP)
    return int(scaled)
