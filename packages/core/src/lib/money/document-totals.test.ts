import { describe, expect, it } from 'vitest'

import {
  calculateDocumentTotals,
  calculateLineSubtotal,
  toMinorUnits,
  type DocumentLineAmounts,
} from './document-totals'

function line(
  overrides: Partial<DocumentLineAmounts> = {}
): DocumentLineAmounts {
  return { subtotalAmount: 150_000n, ...overrides }
}

describe('toMinorUnits', () => {
  it('returns a bigint unchanged', () => {
    expect(toMinorUnits(150_000n)).toBe(150_000n)
  })

  it('converts a safe integer number to minor units', () => {
    expect(toMinorUnits(150_000)).toBe(150_000n)
  })

  it('converts a negative integer number to minor units', () => {
    expect(toMinorUnits(-2_500)).toBe(-2_500n)
  })

  it('converts a digit string to minor units', () => {
    expect(toMinorUnits('150000')).toBe(150_000n)
  })

  it('converts a negative digit string to minor units', () => {
    expect(toMinorUnits('-150000')).toBe(-150_000n)
  })

  it('trims surrounding whitespace before parsing a string', () => {
    expect(toMinorUnits('  150000  ')).toBe(150_000n)
  })

  it('rejects a non-integer number rather than rounding it', () => {
    expect(toMinorUnits(1500.5)).toBeNull()
  })

  it('rejects a number beyond safe-integer precision', () => {
    expect(toMinorUnits(Number.MAX_SAFE_INTEGER + 2)).toBeNull()
  })

  it('rejects a decimal string, which would lose the fraction', () => {
    expect(toMinorUnits('1500.50')).toBeNull()
  })

  it('rejects a non-numeric string', () => {
    expect(toMinorUnits('JMD 1,500')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(toMinorUnits('')).toBeNull()
  })

  it('rejects NaN', () => {
    expect(toMinorUnits(Number.NaN)).toBeNull()
  })

  it('rejects Infinity', () => {
    expect(toMinorUnits(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('calculateLineSubtotal', () => {
  it('multiplies the unit amount by the quantity', () => {
    expect(calculateLineSubtotal(150_000n, 3)).toBe(450_000n)
  })

  it('returns zero for a zero quantity', () => {
    expect(calculateLineSubtotal(150_000n, 0)).toBe(0n)
  })

  it('rejects a fractional quantity rather than throwing on BigInt conversion', () => {
    expect(calculateLineSubtotal(150_000n, 1.5)).toBeNull()
  })

  it('rejects a negative quantity', () => {
    expect(calculateLineSubtotal(150_000n, -1)).toBeNull()
  })

  it('keeps precision far beyond Number.MAX_SAFE_INTEGER', () => {
    expect(calculateLineSubtotal(9_007_199_254_740_993n, 3)).toBe(
      27_021_597_764_222_979n
    )
  })
})

describe('calculateDocumentTotals', () => {
  describe('happy path', () => {
    it('returns the complete totals shape for a single plain line', () => {
      const result = calculateDocumentTotals({ lines: [line()] })

      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        subtotalAmount: 150_000n,
        taxAmount: 0n,
        lineDiscountAmount: 0n,
        linesTotalAmount: 150_000n,
        discountAmount: 0n,
        shippingAmount: 0n,
        adjustmentAmount: 0n,
        totalAmount: 150_000n,
        lines: [
          {
            subtotalAmount: 150_000n,
            taxAmount: 0n,
            discountAmount: 0n,
            totalAmount: 150_000n,
          },
        ],
      })
    })

    it('applies line tax and line discount as subtotal - discount + tax', () => {
      const result = calculateDocumentTotals({
        lines: [
          line({
            subtotalAmount: 100_000n,
            taxAmount: 15_000n,
            discountAmount: 10_000n,
          }),
        ],
      })

      expect(result.error).toBeNull()
      expect(result.data?.lines[0]?.totalAmount).toBe(105_000n)
    })

    it('sums subtotal, tax, line discounts and totals across several lines', () => {
      const result = calculateDocumentTotals({
        lines: [
          line({ subtotalAmount: 100_000n, taxAmount: 15_000n }),
          line({ subtotalAmount: 50_000n, discountAmount: 5_000n }),
          line({
            subtotalAmount: 25_000n,
            taxAmount: 3_750n,
            discountAmount: 2_500n,
          }),
        ],
      })

      expect(result.error).toBeNull()
      expect(result.data?.subtotalAmount).toBe(175_000n)
      expect(result.data?.taxAmount).toBe(18_750n)
      expect(result.data?.lineDiscountAmount).toBe(7_500n)
      expect(result.data?.linesTotalAmount).toBe(186_250n)
      expect(result.data?.totalAmount).toBe(186_250n)
    })

    it('applies document discount, shipping and adjustment to the lines total', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n, taxAmount: 15_000n })],
        discountAmount: 10_000n,
        shippingAmount: 5_000n,
        adjustmentAmount: 250n,
      })

      expect(result.error).toBeNull()
      expect(result.data?.totalAmount).toBe(110_250n)
    })

    it('accepts a negative adjustment that keeps the total non-negative', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n })],
        adjustmentAmount: -100_000n,
      })

      expect(result.error).toBeNull()
      expect(result.data?.totalAmount).toBe(0n)
    })

    it('returns zeroed totals and no lines for an empty document', () => {
      const result = calculateDocumentTotals({ lines: [] })

      expect(result.error).toBeNull()
      expect(result.data?.totalAmount).toBe(0n)
      expect(result.data?.lines).toEqual([])
    })

    it('returns line breakdowns in input order', () => {
      const result = calculateDocumentTotals({
        lines: [
          line({ subtotalAmount: 1n }),
          line({ subtotalAmount: 2n }),
          line({ subtotalAmount: 3n }),
        ],
      })

      expect(result.data?.lines.map((entry) => entry.subtotalAmount)).toEqual([
        1n,
        2n,
        3n,
      ])
    })

    it('permits a line discount exactly equal to the line subtotal', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n, discountAmount: 100_000n })],
      })

      expect(result.error).toBeNull()
      expect(result.data?.lines[0]?.totalAmount).toBe(0n)
    })

    it('permits a document discount exactly equal to the subtotal', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n })],
        discountAmount: 100_000n,
      })

      expect(result.error).toBeNull()
      expect(result.data?.totalAmount).toBe(0n)
    })
  })

  describe('invariants', () => {
    it('rejects a line discount larger than its line subtotal', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n, discountAmount: 100_001n })],
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'billing/line-discount-exceeds-subtotal',
        message: 'A line discount cannot exceed the line subtotal.',
        lineIndex: 0,
      })
    })

    it('reports the index of the offending line', () => {
      const result = calculateDocumentTotals({
        lines: [
          line(),
          line(),
          line({ subtotalAmount: 10n, discountAmount: 11n }),
        ],
      })

      expect(result.error?.lineIndex).toBe(2)
    })

    it('rejects a document discount larger than the subtotal', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n })],
        discountAmount: 100_001n,
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'billing/document-discount-exceeds-subtotal',
        message: 'The document discount cannot exceed its subtotal.',
      })
    })

    it('measures the document discount against the pre-tax subtotal, not the total', () => {
      // Lines total 115,000 with tax, but only 100,000 was actually sold.
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n, taxAmount: 15_000n })],
        discountAmount: 110_000n,
      })

      expect(result.error?.code).toBe(
        'billing/document-discount-exceeds-subtotal'
      )
    })

    it('rejects adjustments that drive the total below zero', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100_000n })],
        adjustmentAmount: -100_001n,
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'billing/negative-document-total',
        message: 'Document adjustments cannot produce a negative total.',
      })
    })

    it('returns the line failure rather than the document failure when both hold', () => {
      const result = calculateDocumentTotals({
        lines: [line({ subtotalAmount: 100n, discountAmount: 200n })],
        discountAmount: 999_999n,
      })

      expect(result.error?.code).toBe('billing/line-discount-exceeds-subtotal')
    })
  })

  describe('purity', () => {
    it('does not mutate the input lines', () => {
      const input = {
        lines: [line({ subtotalAmount: 100_000n })],
        discountAmount: 1_000n,
      }
      const snapshot = structuredClone(input)

      calculateDocumentTotals(input)

      expect(input).toEqual(snapshot)
    })

    it('returns an identical result when called twice with the same input', () => {
      const input = {
        lines: [line({ subtotalAmount: 100_000n, taxAmount: 15_000n })],
      }

      expect(calculateDocumentTotals(input)).toEqual(
        calculateDocumentTotals(input)
      )
    })
  })
})

describe('parity with the Billing service', () => {
  // Mirrors apps/billing-api/.../documents/lines.ts and invoices/create.ts.
  // If either side changes, this fixture must be updated deliberately.
  it('reproduces the service roll-up for a mixed document', () => {
    const result = calculateDocumentTotals({
      lines: [
        { subtotalAmount: 450_000n, taxAmount: 67_500n, discountAmount: 0n },
        {
          subtotalAmount: 120_000n,
          taxAmount: 18_000n,
          discountAmount: 20_000n,
        },
      ],
      discountAmount: 50_000n,
      shippingAmount: 15_000n,
      adjustmentAmount: -2_500n,
    })

    expect(result.error).toBeNull()
    expect(result.data?.subtotalAmount).toBe(570_000n)
    expect(result.data?.taxAmount).toBe(85_500n)
    expect(result.data?.linesTotalAmount).toBe(635_500n)
    // 635,500 - 50,000 + 15,000 - 2,500
    expect(result.data?.totalAmount).toBe(598_000n)
  })
})
