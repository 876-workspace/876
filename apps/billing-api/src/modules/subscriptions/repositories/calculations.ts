interface DiscountValue {
  discountType: 'PERCENTAGE' | 'AMOUNT'
  percentOff: { toString(): string } | null
  amountOff: bigint | null
  currency: string | null
}

interface InvoiceChargeLine {
  subtotalAmount: bigint
  taxable: boolean
}

interface TaxValue {
  rate: { toString(): string }
  inclusive: boolean
}

export interface InvoiceChargeLineTotal {
  subtotalAmount: bigint
  discountAmount: bigint
  taxAmount: bigint
  totalAmount: bigint
}

/** Calculates one discount against a recurring invoice subtotal. */
export function calculateDiscount(
  subtotal: bigint,
  currency: string,
  discount: DiscountValue
): bigint {
  if (subtotal <= 0n) return 0n
  if (discount.discountType === 'AMOUNT') {
    if (discount.currency !== currency) return 0n
    const amount = discount.amountOff ?? 0n

    return amount > subtotal ? subtotal : amount
  }

  const scaledPercent = parsePercent(discount.percentOff?.toString() ?? '0')
  const amount = (subtotal * scaledPercent + 500_000n) / 1_000_000n

  return amount > subtotal ? subtotal : amount
}

/** Calculates a time-weighted amount with half-up minor-unit rounding. */
export function calculateProration(
  amount: bigint,
  periodStart: number,
  periodEnd: number,
  changeAt: number
): bigint {
  if (periodEnd <= periodStart)
    throw new Error('A billing period must end after it starts.')
  if (changeAt <= periodStart) return amount
  if (changeAt >= periodEnd) return 0n

  const periodSeconds = BigInt(periodEnd - periodStart)
  const remainingSeconds = BigInt(periodEnd - changeAt)

  return (amount * remainingSeconds + periodSeconds / 2n) / periodSeconds
}

/** Calculates inclusive or exclusive tax using a percentage rate. */
export function calculateTax(
  amount: bigint,
  rateValue: string,
  inclusive: boolean
): bigint {
  const scaledRate = parsePercent(rateValue)
  if (scaledRate === 0n) return 0n
  const hundred = 1_000_000n
  if (inclusive) {
    const net =
      (amount * hundred + (hundred + scaledRate) / 2n) / (hundred + scaledRate)

    return amount - net
  }

  return (amount * scaledRate + hundred / 2n) / hundred
}

/** Distributes a document discount proportionally while preserving its total. */
export function allocateDiscount(
  totalDiscount: bigint,
  lineSubtotals: readonly bigint[]
): bigint[] {
  const subtotal = lineSubtotals.reduce((sum, value) => sum + value, 0n)
  if (subtotal === 0n) return lineSubtotals.map(() => 0n)

  let allocated = 0n
  return lineSubtotals.map((value, index) => {
    const isLast = index === lineSubtotals.length - 1
    const amount = isLast
      ? totalDiscount - allocated
      : (totalDiscount * value) / subtotal
    allocated += amount

    return amount
  })
}

/**
 * Calculates the authoritative line totals used by previews and invoices.
 * Centralizing discount allocation and tax rounding prevents preview drift.
 */
export function calculateInvoiceChargeLines(
  lines: readonly InvoiceChargeLine[],
  totalDiscount: bigint,
  tax: TaxValue | null
): InvoiceChargeLineTotal[] {
  const lineDiscounts = allocateDiscount(
    totalDiscount,
    lines.map((line) => line.subtotalAmount)
  )

  return lines.map((line, index) => {
    const discountAmount = lineDiscounts[index] ?? 0n
    const discountedAmount = line.subtotalAmount - discountAmount
    const taxAmount =
      line.taxable && tax
        ? calculateTax(discountedAmount, tax.rate.toString(), tax.inclusive)
        : 0n
    const totalAmount =
      line.taxable && tax?.inclusive
        ? discountedAmount
        : discountedAmount + taxAmount

    return {
      subtotalAmount: line.subtotalAmount,
      discountAmount,
      taxAmount,
      totalAmount,
    }
  })
}

function parsePercent(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.')
  const normalizedFraction = `${fraction}0000`.slice(0, 4)

  return BigInt(whole) * 10_000n + BigInt(normalizedFraction)
}
