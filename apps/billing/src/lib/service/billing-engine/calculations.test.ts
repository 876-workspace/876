import { describe, expect, it } from 'vitest'

import {
  allocateDiscount,
  calculateDiscount,
  calculateInvoiceChargeLines,
  calculateProration,
  calculateTax,
} from './calculations'

describe('billing engine calculations', () => {
  it('calculates percentage and currency-scoped amount discounts', () => {
    expect(
      calculateDiscount(10_000n, 'JMD', {
        discountType: 'PERCENTAGE',
        percentOff: { toString: () => '12.5' },
        amountOff: null,
        currency: null,
      })
    ).toBe(1_250n)
    expect(
      calculateDiscount(10_000n, 'JMD', {
        discountType: 'AMOUNT',
        percentOff: null,
        amountOff: 2_000n,
        currency: 'USD',
      })
    ).toBe(0n)
  })

  it('caps a discount at the remaining subtotal', () => {
    expect(
      calculateDiscount(1_000n, 'JMD', {
        discountType: 'AMOUNT',
        percentOff: null,
        amountOff: 2_000n,
        currency: 'JMD',
      })
    ).toBe(1_000n)
  })

  it('allocates a document discount without losing rounding remainder', () => {
    const allocation = allocateDiscount(1_001n, [3_000n, 2_000n, 5_000n])

    expect(allocation).toEqual([300n, 200n, 501n])
    expect(allocation.reduce((sum, value) => sum + value, 0n)).toBe(1_001n)
  })

  it('prorates the remaining half of a billing period', () => {
    expect(calculateProration(10_001n, 1_000, 2_000, 1_500)).toBe(5_001n)
  })

  it('handles proration boundaries and rejects invalid periods', () => {
    expect(calculateProration(10_000n, 1_000, 2_000, 1_000)).toBe(10_000n)
    expect(calculateProration(10_000n, 1_000, 2_000, 2_000)).toBe(0n)
    expect(() => calculateProration(10_000n, 2_000, 2_000, 2_000)).toThrow(
      'A billing period must end after it starts.'
    )
  })

  it('calculates exclusive and inclusive GCT in minor units', () => {
    expect(calculateTax(10_000n, '15', false)).toBe(1_500n)
    expect(calculateTax(11_500n, '15', true)).toBe(1_500n)
  })

  it('allocates discounts and taxes only taxable lines', () => {
    expect(
      calculateInvoiceChargeLines(
        [
          { subtotalAmount: 10_000n, taxable: true },
          { subtotalAmount: 10_000n, taxable: false },
        ],
        2_000n,
        { rate: { toString: () => '15' }, inclusive: false }
      )
    ).toEqual([
      {
        subtotalAmount: 10_000n,
        discountAmount: 1_000n,
        taxAmount: 1_350n,
        totalAmount: 10_350n,
      },
      {
        subtotalAmount: 10_000n,
        discountAmount: 1_000n,
        taxAmount: 0n,
        totalAmount: 9_000n,
      },
    ])
  })
})
