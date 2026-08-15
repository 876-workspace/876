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

describe('Python-compatible financial calculations', () => {
  it('prices flat, quantity, package, volume, and graduated tiers', () => {
    expect(
      calculateCatalogAmount({
        pricingModel: 'FLAT',
        unitAmount: 2_500n,
        quantity: 8,
      })
    ).toBe(2_500n)
    expect(
      calculateCatalogAmount({
        pricingModel: 'PER_UNIT',
        unitAmount: 125n,
        quantity: 8,
      })
    ).toBe(1_000n)
    expect(
      calculateCatalogAmount({
        pricingModel: 'PACKAGE',
        unitAmount: 500n,
        quantity: 11,
        packageSize: 5,
      })
    ).toBe(1_500n)
    const tiers = [
      { fromUnit: 1, toUnit: 10, unitAmount: 100n, flatAmount: null },
      { fromUnit: 11, toUnit: null, unitAmount: 80n, flatAmount: 50n },
    ]
    expect(
      calculateCatalogAmount({
        pricingModel: 'VOLUME',
        unitAmount: null,
        quantity: 12,
        tiers,
      })
    ).toBe(1_010n)
    expect(
      calculateCatalogAmount({
        pricingModel: 'TIERED',
        unitAmount: null,
        quantity: 12,
        tiers,
      })
    ).toBe(1_210n)
  })

  it('matches Decimal half-up discount and inclusive/exclusive tax rounding', () => {
    expect(
      calculateDiscount({
        subtotal: 10_005n,
        currency: 'JMD',
        discountType: 'PERCENTAGE',
        percentOff: '12.34567',
        amountOff: null,
        discountCurrency: null,
      })
    ).toBe(1_235n)
    expect(calculateTax(11_500n, '15', true)).toBe(1_500n)
    expect(calculateTax(10_000n, '15', false)).toBe(1_500n)
  })

  it('preserves discount totals while allocating across lines', () => {
    const result = allocateDiscount(101n, [100n, 200n, 300n])
    expect(result).toEqual([16n, 33n, 52n])
    expect(result.reduce((sum, value) => sum + value, 0n)).toBe(101n)
  })

  it('calculates fixed and percentage late fees and renewal adjustments', () => {
    expect(
      calculateLateFee({
        amountDue: 10_000n,
        calculationType: 'FIXED',
        percent: null,
        fixedAmount: 750n,
      })
    ).toBe(750n)
    expect(
      calculateLateFee({
        amountDue: 10_000n,
        calculationType: 'PERCENTAGE',
        percent: '2.5',
        fixedAmount: null,
      })
    ).toBe(250n)
    expect(adjustRenewalAmount(10_000n, 'MARKUP', '5')).toBe(10_500n)
  })

  it('handles leap years and month-end interval clamping', () => {
    const january31 = Date.UTC(2024, 0, 31, 12) / 1000
    expect(addInterval(january31, 'MONTH', 1)).toBe(
      Date.UTC(2024, 1, 29, 12) / 1000
    )
    expect(addInterval(january31, 'YEAR', 1)).toBe(
      Date.UTC(2025, 0, 31, 12) / 1000
    )
  })

  it('prorates an initial calendar stub with half-up minor-unit rounding', () => {
    const anchor = Date.UTC(2024, 0, 31) / 1000
    expect(
      prorateInitialStub({
        amount: 2_900n,
        hasStub: true,
        periodStart: anchor,
        periodEnd: anchor + 14 * 86_400,
        billingAnchor: anchor,
        intervalUnit: 'MONTH',
        intervalCount: 1,
      })
    ).toBe(1_400n)
  })
})
