import { describe, expect, it } from 'vitest'

import { computeTotals } from './shared'
import type { CreditNoteCreateParams } from '@/types/credit-note'

type Line = CreditNoteCreateParams['lines'][number]

function line(overrides: Partial<Line> = {}): Line {
  return {
    itemId: null,
    priceId: null,
    description: 'Consulting refund',
    quantity: 1,
    unitAmount: 10_000n,
    taxAmount: undefined,
    discountAmount: undefined,
    ...overrides,
  }
}

describe('computeTotals', () => {
  it('computes a single line total as quantity times unit amount', () => {
    const result = computeTotals([line({ quantity: 3, unitAmount: 2_500n })])

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].totalAmount).toBe(7_500n)
    expect(result.subtotalAmount).toBe(7_500n)
    expect(result.taxAmount).toBe(0n)
    expect(result.totalAmount).toBe(7_500n)
  })

  it('subtracts the discount before adding tax', () => {
    const result = computeTotals([
      line({
        quantity: 2,
        unitAmount: 5_000n,
        discountAmount: 1_000n,
        taxAmount: 750n,
      }),
    ])

    // gross 10_000 - discount 1_000 = 9_000 net; + tax 750 = 9_750 total
    expect(result.lines[0].totalAmount).toBe(9_750n)
    expect(result.subtotalAmount).toBe(9_000n)
    expect(result.taxAmount).toBe(750n)
    expect(result.totalAmount).toBe(9_750n)
  })

  it('floors a line net at zero when the discount exceeds the gross', () => {
    const result = computeTotals([
      line({
        quantity: 1,
        unitAmount: 1_000n,
        discountAmount: 4_000n,
        taxAmount: 200n,
      }),
    ])

    // net floored at 0, tax still added
    expect(result.lines[0].totalAmount).toBe(200n)
  })

  it('rolls up subtotal, tax, and total across multiple lines', () => {
    const result = computeTotals([
      line({ quantity: 1, unitAmount: 10_000n, taxAmount: 1_500n }),
      line({
        quantity: 2,
        unitAmount: 3_000n,
        discountAmount: 500n,
        taxAmount: 825n,
      }),
    ])

    expect(result.subtotalAmount).toBe(15_500n)
    expect(result.taxAmount).toBe(2_325n)
    expect(result.totalAmount).toBe(17_825n)
  })
})
