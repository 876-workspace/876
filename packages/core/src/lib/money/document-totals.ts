/**
 * Document totals arithmetic, shared by the Billing service and the document
 * line-item editor.
 *
 * This exists because the arithmetic below had exactly one home —
 * `apps/billing-api/src/modules/documents/repositories/documents/lines.ts` —
 * which is Prisma-coupled and therefore unreachable from a browser editor.
 * Without extraction, an editor showing a running total would have had to
 * reimplement it, and two subtotal implementations is a defect a customer
 * finds rather than a test.
 *
 * The split is deliberate: *resolution* (which unit amount, which description,
 * which price-list entry applies) stays on the server, because it needs the
 * catalogue. *Arithmetic* lives here, because it needs nothing.
 *
 * Money is `bigint` minor units throughout. A JS `number` cannot carry money
 * on this platform — see `.claude/rules/billing-data-plane.md`.
 */

/** A wire money value: minor units as an integer or a decimal-free string. */
export type MinorAmount = number | string | bigint

export interface DocumentLineAmounts {
  /**
   * The line's subtotal in minor units, before its own discount and tax.
   * On the server this comes from the catalogue price; in an editor it is
   * `calculateLineSubtotal(unitAmount, quantity)`.
   */
  subtotalAmount: bigint

  /** Tax charged on this line, in minor units. */
  taxAmount?: bigint

  /** Discount applied to this line, in minor units. */
  discountAmount?: bigint
}

export interface DocumentLineTotals {
  subtotalAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  /** `subtotal - discount + tax`. */
  totalAmount: bigint
}

export interface DocumentTotalsParams {
  lines: readonly DocumentLineAmounts[]

  /** Document-level discount, applied after the lines roll up. */
  discountAmount?: bigint

  /** Shipping charged on the document. */
  shippingAmount?: bigint

  /** Manual adjustment, positive or negative. */
  adjustmentAmount?: bigint
}

export interface DocumentTotals {
  /** Sum of line subtotals, excluding tax and before any discount. */
  subtotalAmount: bigint

  /** Sum of line tax. */
  taxAmount: bigint

  /** Sum of line discounts. Does not include the document-level discount. */
  lineDiscountAmount: bigint

  /** Sum of line totals, before document-level adjustments. */
  linesTotalAmount: bigint

  discountAmount: bigint
  shippingAmount: bigint
  adjustmentAmount: bigint

  /** `linesTotal - documentDiscount + shipping + adjustment`. */
  totalAmount: bigint

  /** Per-line breakdown, in input order. */
  lines: DocumentLineTotals[]
}

export interface DocumentTotalsError {
  code: DocumentTotalsErrorCode
  message: string
  /** Zero-based index of the offending line, when the failure is line-scoped. */
  lineIndex?: number
}

export type DocumentTotalsErrorCode =
  | 'billing/line-discount-exceeds-subtotal'
  | 'billing/document-discount-exceeds-subtotal'
  | 'billing/negative-document-total'
  | 'billing/invalid-quantity'
  | 'billing/invalid-amount'

export type DocumentTotalsResult =
  | { data: DocumentTotals; error: null }
  | { data: null; error: DocumentTotalsError }

/**
 * Converts a wire money value to minor units.
 *
 * Rejects anything that is not an exact integer, so a float that has already
 * lost precision cannot enter the arithmetic and be rounded away silently.
 */
export function toMinorUnits(value: MinorAmount): bigint | null {
  if (typeof value === 'bigint') return value

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || !Number.isSafeInteger(value)) return null
    return BigInt(value)
  }

  const trimmed = value.trim()
  if (!/^-?\d+$/.test(trimmed)) return null
  return BigInt(trimmed)
}

/**
 * The non-catalogue line subtotal: a unit amount repeated `quantity` times.
 *
 * Catalogue lines are priced by the server's pricing module instead, because
 * tiered and volume models need the price's tiers.
 */
export function calculateLineSubtotal(
  unitAmount: bigint,
  quantity: number
): bigint | null {
  if (!Number.isInteger(quantity) || quantity < 0) return null
  return unitAmount * BigInt(quantity)
}

/**
 * Percentages are carried as basis points, so 12.5% is 1250 and never 0.125.
 * A fraction cannot survive integer arithmetic, and money never uses a float.
 */
export const PERCENT_SCALE = 10_000n

/** Basis points give a percentage two decimal places: 12.34% is 1234. */
export const PERCENT_DIGITS = 2

/** 100%, in basis points — the largest discount a line may carry. */
export const MAX_PERCENT_BASIS_POINTS = PERCENT_SCALE

/**
 * Resolves a percentage discount against the amount it applies to.
 *
 * This is the one definition of the rule. An editor showing a running total
 * and the service writing the document must agree to the minor unit, so both
 * call this rather than repeating `subtotal * bp / 10_000`.
 *
 * Truncates toward zero, which is what the integer division in the document
 * pipeline already did — a discount never rounds up in the customer's favour
 * by accident.
 *
 * A percentage over 100% is deliberately *not* rejected here. It resolves to
 * more than the subtotal, and `calculateDocumentTotals` then reports
 * `billing/line-discount-exceeds-subtotal` against the offending line — a
 * named error naming the line, rather than a silent zero. Callers that must
 * refuse it earlier compare against `MAX_PERCENT_BASIS_POINTS` themselves.
 *
 * Only a negative percentage is refused, because that is a surcharge wearing
 * a discount's name and no downstream invariant would catch it.
 */
export function resolvePercentageDiscount(
  subtotalAmount: bigint,
  basisPoints: bigint
): bigint | null {
  if (basisPoints < 0n) return null
  return (subtotalAmount * basisPoints) / PERCENT_SCALE
}

/** A tax or percentage rate at six-decimal scale: 15% is `150_000n`. */
export const RATE_SCALE = 1_000_000n

/**
 * Reads a percentage rate such as `"15"` or `"16.5000"` at `RATE_SCALE`,
 * rounding half-up on the fifth decimal. Anything negative or unreadable is
 * zero, because a rate row that cannot be read must not charge anything.
 */
export function parsePercentRate(value: string | null): bigint {
  if (!value) return 0n
  const match = value.trim().match(/^([+-]?)(\d+)(?:\.(\d+))?$/)
  if (!match || match[1] === '-') return 0n
  const whole = BigInt(match[2]!)
  const fraction = `${match[3] ?? ''}00000`
  let result = whole * 10_000n + BigInt(fraction.slice(0, 4))
  if (Number(fraction[4]) >= 5) result += 1n
  return result
}

/**
 * Tax on an amount at a percentage rate, rounded half-up to the minor unit.
 *
 * This is the one definition shared by the Billing engine and the document
 * editor, so the tax a person sees while drafting is the tax that is billed.
 * An inclusive rate returns the tax already contained in `amount`.
 */
export function calculateTax(
  amount: bigint,
  rate: string | null,
  inclusive = false
): bigint {
  const scaledRate = parsePercentRate(rate)
  if (amount <= 0n || scaledRate <= 0n) return 0n
  if (inclusive) {
    const net =
      (amount * RATE_SCALE + (RATE_SCALE + scaledRate) / 2n) /
      (RATE_SCALE + scaledRate)
    return amount - net
  }
  return (amount * scaledRate + RATE_SCALE / 2n) / RATE_SCALE
}

/**
 * Rolls lines up into document totals, enforcing the same invariants the
 * Billing service enforces.
 *
 * Returns failures as values rather than throwing: an over-large discount is
 * an expected outcome of a half-typed form, not a bug.
 */
export function calculateDocumentTotals(
  params: DocumentTotalsParams
): DocumentTotalsResult {
  const lines: DocumentLineTotals[] = []
  let subtotalAmount = 0n
  let taxAmount = 0n
  let lineDiscountAmount = 0n
  let linesTotalAmount = 0n

  for (const [index, line] of params.lines.entries()) {
    const lineTax = line.taxAmount ?? 0n
    const lineDiscount = line.discountAmount ?? 0n

    if (lineDiscount > line.subtotalAmount) {
      return {
        data: null,
        error: {
          code: 'billing/line-discount-exceeds-subtotal',
          message: 'A line discount cannot exceed the line subtotal.',
          lineIndex: index,
        },
      }
    }

    const lineTotal = line.subtotalAmount - lineDiscount + lineTax
    lines.push({
      subtotalAmount: line.subtotalAmount,
      taxAmount: lineTax,
      discountAmount: lineDiscount,
      totalAmount: lineTotal,
    })

    subtotalAmount += line.subtotalAmount
    taxAmount += lineTax
    lineDiscountAmount += lineDiscount
    linesTotalAmount += lineTotal
  }

  const discountAmount = params.discountAmount ?? 0n
  const shippingAmount = params.shippingAmount ?? 0n
  const adjustmentAmount = params.adjustmentAmount ?? 0n

  // Checked against the pre-tax, pre-line-discount subtotal, matching the
  // Billing service. A document discount is a discount on what was sold, not
  // on the tax collected on it.
  if (discountAmount > subtotalAmount) {
    return {
      data: null,
      error: {
        code: 'billing/document-discount-exceeds-subtotal',
        message: 'The document discount cannot exceed its subtotal.',
      },
    }
  }

  const totalAmount =
    linesTotalAmount - discountAmount + shippingAmount + adjustmentAmount

  if (totalAmount < 0n) {
    return {
      data: null,
      error: {
        code: 'billing/negative-document-total',
        message: 'Document adjustments cannot produce a negative total.',
      },
    }
  }

  return {
    data: {
      subtotalAmount,
      taxAmount,
      lineDiscountAmount,
      linesTotalAmount,
      discountAmount,
      shippingAmount,
      adjustmentAmount,
      totalAmount,
      lines,
    },
    error: null,
  }
}

/**
 * Parses what a person types — `1500`, `1,500.00`, `.5`, `-2.50` — into minor
 * units, using string arithmetic only.
 *
 * A float cannot do this: `1500.07 * 100` is `150006.99999999999`, and money
 * that rounds the wrong way once is a support ticket. Returns `null` for
 * anything it cannot read exactly, including more decimal places than the
 * currency has, so a silently truncated amount can never be written.
 */
export function parseDecimalToMinorUnits(
  input: string,
  minorUnitDigits = 2
): bigint | null {
  if (!Number.isInteger(minorUnitDigits) || minorUnitDigits < 0) return null

  const cleaned = input.trim().replace(/,/g, '')
  if (cleaned === '') return null

  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(cleaned)
  if (!match) return null

  const [, sign, whole = '', fraction = ''] = match
  if (whole === '' && fraction === '') return null
  if (fraction.length > minorUnitDigits) return null

  const padded = fraction.padEnd(minorUnitDigits, '0')
  const magnitude = BigInt(`${whole || '0'}${padded}`)
  return sign === '-' ? -magnitude : magnitude
}

/**
 * Renders minor units as a plain decimal string, without a currency symbol or
 * grouping — the inverse of `parseDecimalToMinorUnits`, for populating an
 * input a person will edit.
 *
 * Presentation formatting (symbol, grouping, locale) belongs to the host,
 * which knows the viewer.
 */
export function formatMinorUnits(amount: bigint, minorUnitDigits = 2): string {
  if (!Number.isInteger(minorUnitDigits) || minorUnitDigits < 0) {
    throw new RangeError('minorUnitDigits must be a non-negative integer.')
  }
  if (minorUnitDigits === 0) return amount.toString()

  const negative = amount < 0n
  const digits = (negative ? -amount : amount)
    .toString()
    .padStart(minorUnitDigits + 1, '0')
  const whole = digits.slice(0, -minorUnitDigits)
  const fraction = digits.slice(-minorUnitDigits)
  return `${negative ? '-' : ''}${whole}.${fraction}`
}
