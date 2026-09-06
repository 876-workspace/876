import { describe, expect, it } from 'vitest'

import {
  calculateDocumentTotals,
  calculateLineSubtotal,
  formatMinorUnits,
  parseDecimalToMinorUnits,
  resolvePercentageDiscount,
  toMinorUnits,
  MAX_PERCENT_BASIS_POINTS,
  PERCENT_SCALE,
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

describe('parseDecimalToMinorUnits', () => {
  it('parses a whole number as minor units', () => {
    expect(parseDecimalToMinorUnits('1500')).toBe(150_000n)
  })

  it('parses a two-decimal amount exactly', () => {
    expect(parseDecimalToMinorUnits('1500.07')).toBe(150_007n)
  })

  it('parses an amount a float would round wrongly', () => {
    // 1500.07 * 100 === 150006.99999999999 in IEEE 754.
    expect(parseDecimalToMinorUnits('1500.07')).not.toBe(150_006n)
  })

  it('strips grouping commas', () => {
    expect(parseDecimalToMinorUnits('1,234,567.89')).toBe(123_456_789n)
  })

  it('pads a single decimal place', () => {
    expect(parseDecimalToMinorUnits('1.5')).toBe(150n)
  })

  it('accepts a leading decimal point', () => {
    expect(parseDecimalToMinorUnits('.5')).toBe(50n)
  })

  it('accepts a trailing decimal point', () => {
    expect(parseDecimalToMinorUnits('5.')).toBe(500n)
  })

  it('parses a negative amount', () => {
    expect(parseDecimalToMinorUnits('-2.50')).toBe(-250n)
  })

  it('trims surrounding whitespace', () => {
    expect(parseDecimalToMinorUnits('  12.34  ')).toBe(1_234n)
  })

  it('honours a zero-decimal currency', () => {
    expect(parseDecimalToMinorUnits('1500', 0)).toBe(1_500n)
  })

  it('honours a three-decimal currency', () => {
    expect(parseDecimalToMinorUnits('1.234', 3)).toBe(1_234n)
  })

  it('rejects more decimal places than the currency has, rather than truncating', () => {
    expect(parseDecimalToMinorUnits('1.234')).toBeNull()
  })

  it('rejects a decimal on a zero-decimal currency', () => {
    expect(parseDecimalToMinorUnits('1.5', 0)).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(parseDecimalToMinorUnits('')).toBeNull()
  })

  it('rejects a lone decimal point', () => {
    expect(parseDecimalToMinorUnits('.')).toBeNull()
  })

  it('rejects a currency symbol', () => {
    expect(parseDecimalToMinorUnits('$12.34')).toBeNull()
  })

  it('rejects letters', () => {
    expect(parseDecimalToMinorUnits('12.34abc')).toBeNull()
  })

  it('rejects exponential notation', () => {
    expect(parseDecimalToMinorUnits('1e3')).toBeNull()
  })

  it('rejects a negative minorUnitDigits', () => {
    expect(parseDecimalToMinorUnits('1.00', -1)).toBeNull()
  })

  it('keeps precision beyond Number.MAX_SAFE_INTEGER', () => {
    expect(parseDecimalToMinorUnits('90071992547409.93')).toBe(
      9_007_199_254_740_993n
    )
  })
})

describe('formatMinorUnits', () => {
  it('renders minor units with two decimal places', () => {
    expect(formatMinorUnits(150_007n)).toBe('1500.07')
  })

  it('pads an amount smaller than one major unit', () => {
    expect(formatMinorUnits(7n)).toBe('0.07')
  })

  it('renders zero', () => {
    expect(formatMinorUnits(0n)).toBe('0.00')
  })

  it('renders a negative amount', () => {
    expect(formatMinorUnits(-250n)).toBe('-2.50')
  })

  it('renders a zero-decimal currency without a point', () => {
    expect(formatMinorUnits(1_500n, 0)).toBe('1500')
  })

  it('renders a three-decimal currency', () => {
    expect(formatMinorUnits(1_234n, 3)).toBe('1.234')
  })

  it('throws for a negative minorUnitDigits, which is a programming error', () => {
    expect(() => formatMinorUnits(1n, -1)).toThrow(RangeError)
  })

  it('round-trips through parseDecimalToMinorUnits', () => {
    for (const amount of [0n, 7n, -250n, 150_007n, 9_007_199_254_740_993n]) {
      expect(parseDecimalToMinorUnits(formatMinorUnits(amount))).toBe(amount)
    }
  })
})

describe('resolvePercentageDiscount', () => {
  it('takes a whole percentage off a subtotal', () => {
    expect(resolvePercentageDiscount(150_000n, 1_000n)).toBe(15_000n)
  })

  it('takes a fractional percentage, carried as basis points', () => {
    expect(resolvePercentageDiscount(150_000n, 1_250n)).toBe(18_750n)
  })

  it('returns the whole subtotal at 100%', () => {
    expect(resolvePercentageDiscount(150_000n, MAX_PERCENT_BASIS_POINTS)).toBe(
      150_000n
    )
  })

  it('returns zero at 0%', () => {
    expect(resolvePercentageDiscount(150_000n, 0n)).toBe(0n)
  })

  it('resolves a percentage above 100% rather than swallowing it, so the document invariant can name the line', () => {
    const discount = resolvePercentageDiscount(
      150_000n,
      MAX_PERCENT_BASIS_POINTS + 5_000n
    )

    expect(discount).toBe(225_000n)
    expect(
      calculateDocumentTotals({
        lines: [line({ subtotalAmount: 150_000n, discountAmount: 225_000n })],
      }).error
    ).toEqual({
      code: 'billing/line-discount-exceeds-subtotal',
      message: 'A line discount cannot exceed the line subtotal.',
      lineIndex: 0,
    })
  })

  it('rejects a negative percentage, which would be a surcharge', () => {
    expect(resolvePercentageDiscount(150_000n, -1n)).toBeNull()
  })

  it('truncates toward zero rather than rounding up', () => {
    // 1 unit at 33.33% is 0.3333 units; the customer is not credited the
    // fraction of a cent.
    expect(resolvePercentageDiscount(1n, 3_333n)).toBe(0n)
    expect(resolvePercentageDiscount(3n, 3_333n)).toBe(0n)
    expect(resolvePercentageDiscount(10n, 3_333n)).toBe(3n)
  })

  it('stays within the subtotal for every percentage up to 100%', () => {
    for (let bp = 0n; bp <= MAX_PERCENT_BASIS_POINTS; bp += 137n) {
      const discount = resolvePercentageDiscount(150_007n, bp)
      expect(discount).not.toBeNull()
      expect(discount!).toBeLessThanOrEqual(150_007n)
      expect(discount!).toBeGreaterThanOrEqual(0n)
    }
  })

  it('holds exactness past the float-safe integer range', () => {
    expect(resolvePercentageDiscount(9_007_199_254_740_993_00n, 5_000n)).toBe(
      4_503_599_627_370_496_50n
    )
  })

  it('scales percentages by basis points, not by hundredths', () => {
    expect(PERCENT_SCALE).toBe(10_000n)
  })
})
