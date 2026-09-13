export { calculateCatalogAmount } from '@/commerce/calculations'
import { addInterval } from '@876/core/timestamps'
import { calculateTax, parsePercentRate, RATE_SCALE } from '@876/core/money'
export { addInterval, calculateTax }

export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
export type RenewalPricingPolicy =
  'RETAIN_EXISTING' | 'USE_LATEST' | 'MARKUP' | 'MARKDOWN'

export function calculateDiscount(options: {
  subtotal: bigint
  currency: string
  discountType: 'PERCENTAGE' | 'AMOUNT'
  percentOff: string | null
  amountOff: bigint | null
  discountCurrency: string | null
}): bigint {
  if (options.subtotal <= 0n) return 0n
  if (options.discountType === 'AMOUNT') {
    if (options.discountCurrency !== options.currency) return 0n
    return options.amountOff !== null && options.amountOff < options.subtotal
      ? options.amountOff
      : options.subtotal
  }
  const amount =
    (options.subtotal * parsePercentRate(options.percentOff) +
      RATE_SCALE / 2n) /
    RATE_SCALE
  return amount < options.subtotal ? amount : options.subtotal
}

export function allocateDiscount(
  totalDiscount: bigint,
  lineSubtotals: readonly bigint[]
): bigint[] {
  const subtotal = lineSubtotals.reduce((sum, value) => sum + value, 0n)
  if (subtotal <= 0n) return lineSubtotals.map(() => 0n)
  let allocated = 0n
  return lineSubtotals.map((value, index) => {
    const amount =
      index === lineSubtotals.length - 1
        ? totalDiscount - allocated
        : (totalDiscount * value) / subtotal
    allocated += amount
    return amount
  })
}

export function calculateLateFee(options: {
  amountDue: bigint
  calculationType: 'FIXED' | 'PERCENTAGE'
  percent: string | null
  fixedAmount: bigint | null
}): bigint {
  if (options.amountDue <= 0n) return 0n
  if (options.calculationType === 'FIXED') {
    const amount = options.fixedAmount ?? 0n
    return amount > 0n ? amount : 0n
  }
  return calculateDiscount({
    subtotal: options.amountDue,
    currency: '',
    discountType: 'PERCENTAGE',
    percentOff: options.percent,
    amountOff: null,
    discountCurrency: null,
  })
}

export function adjustRenewalAmount(
  amount: bigint | null,
  policy: RenewalPricingPolicy,
  percent: string | null
): bigint | null {
  if (
    amount === null ||
    policy === 'RETAIN_EXISTING' ||
    policy === 'USE_LATEST'
  ) {
    return amount
  }
  const adjustment =
    (amount * parsePercentRate(percent) + RATE_SCALE / 2n) / RATE_SCALE
  return policy === 'MARKUP'
    ? amount + adjustment
    : amount > adjustment
      ? amount - adjustment
      : 0n
}

export function prorateInitialStub(options: {
  amount: bigint
  hasStub: boolean
  periodStart: number
  periodEnd: number
  billingAnchor: number | null
  intervalUnit: IntervalUnit | null
  intervalCount: number | null
}): bigint {
  if (
    !options.hasStub ||
    options.billingAnchor === null ||
    options.intervalUnit === null ||
    options.intervalCount === null
  ) {
    return options.amount
  }
  const regularEnd = addInterval(
    options.billingAnchor,
    options.intervalUnit,
    options.intervalCount
  )
  const regularSeconds = regularEnd - options.billingAnchor
  const stubSeconds = options.periodEnd - options.periodStart
  if (regularSeconds <= 0 || stubSeconds <= 0) {
    throw new Error('Calendar billing periods must have a positive duration.')
  }
  return (
    (options.amount * BigInt(stubSeconds) +
      BigInt(Math.floor(regularSeconds / 2))) /
    BigInt(regularSeconds)
  )
}
