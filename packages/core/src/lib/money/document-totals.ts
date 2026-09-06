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
