import pythonFixture from '../__fixtures__/python-financial-parity.json'
import {
  addInterval,
  adjustRenewalAmount,
  allocateDiscount,
  calculateCatalogAmount,
  calculateDiscount,
  calculateLateFee,
  calculateTax,
  prorateInitialStub,
} from '../calculations'

const asNumber = (value: bigint) => Number(value)

describe('frozen Python financial calculation parity', () => {
  const tiers = [
    { fromUnit: 1, toUnit: 10, unitAmount: 100n, flatAmount: null },
    { fromUnit: 11, toUnit: null, unitAmount: 80n, flatAmount: 50n },
  ] as const

  it('matches the Python Decimal and catalog outputs byte-for-byte', () => {
    expect({
      catalog: {
        flat: asNumber(
          calculateCatalogAmount({
            pricingModel: 'FLAT',
            unitAmount: 2_500n,
            quantity: 8,
          })
        ),
        per_unit: asNumber(
          calculateCatalogAmount({
            pricingModel: 'PER_UNIT',
            unitAmount: 125n,
            quantity: 8,
          })
        ),
        package: asNumber(
          calculateCatalogAmount({
            pricingModel: 'PACKAGE',
            unitAmount: 500n,
            quantity: 11,
            packageSize: 5,
          })
        ),
        volume: asNumber(
          calculateCatalogAmount({
            pricingModel: 'VOLUME',
            unitAmount: null,
            quantity: 12,
            tiers,
          })
        ),
        tiered: asNumber(
          calculateCatalogAmount({
            pricingModel: 'TIERED',
            unitAmount: null,
            quantity: 12,
            tiers,
          })
        ),
      },
      discounts: {
        percent_half_up: asNumber(
          calculateDiscount({
            subtotal: 10_005n,
            currency: 'JMD',
            discountType: 'PERCENTAGE',
            percentOff: '12.34567',
            amountOff: null,
            discountCurrency: null,
          })
        ),
        fixed_match: asNumber(
          calculateDiscount({
            subtotal: 10_005n,
            currency: 'JMD',
            discountType: 'AMOUNT',
            percentOff: null,
            amountOff: 2_000n,
            discountCurrency: 'JMD',
          })
        ),
        fixed_mismatch: asNumber(
          calculateDiscount({
            subtotal: 10_005n,
            currency: 'JMD',
            discountType: 'AMOUNT',
            percentOff: null,
            amountOff: 2_000n,
            discountCurrency: 'USD',
          })
        ),
      },
      taxes: {
        inclusive: asNumber(calculateTax(11_500n, '15', true)),
        exclusive: asNumber(calculateTax(10_000n, '15', false)),
        rounding: asNumber(calculateTax(333n, '7.12555', false)),
      },
      allocation: allocateDiscount(101n, [100n, 200n, 300n]).map(asNumber),
      late_fees: {
        fixed: asNumber(
          calculateLateFee({
            amountDue: 10_000n,
            calculationType: 'FIXED',
            percent: null,
            fixedAmount: 750n,
          })
        ),
        percent: asNumber(
          calculateLateFee({
            amountDue: 10_000n,
            calculationType: 'PERCENTAGE',
            percent: '2.5',
            fixedAmount: null,
          })
        ),
      },
      renewal: {
        markup: asNumber(adjustRenewalAmount(10_000n, 'MARKUP', '5')!),
        markdown: asNumber(adjustRenewalAmount(10_000n, 'MARKDOWN', '105')!),
      },
      intervals: {
        anchor: pythonFixture.intervals.anchor,
        leap_month: addInterval(pythonFixture.intervals.anchor, 'MONTH', 1),
        year: addInterval(pythonFixture.intervals.anchor, 'YEAR', 1),
        week: addInterval(pythonFixture.intervals.anchor, 'WEEK', 2),
      },
      proration: asNumber(
        prorateInitialStub({
          amount: 2_900n,
          hasStub: true,
          periodStart: pythonFixture.intervals.anchor,
          periodEnd: pythonFixture.intervals.anchor + 14 * 86_400,
          billingAnchor: pythonFixture.intervals.anchor,
          intervalUnit: 'MONTH',
          intervalCount: 1,
        })
      ),
    }).toEqual(pythonFixture)
  })
})
