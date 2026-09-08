export { calculateCatalogAmount } from '@/commerce/calculations'

export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
export type RenewalPricingPolicy =
  'RETAIN_EXISTING' | 'USE_LATEST' | 'MARKUP' | 'MARKDOWN'

const percentScale = 1_000_000n

function scaledPercent(value: string | null): bigint {
  if (!value) return 0n
  const match = value.trim().match(/^([+-]?)(\d+)(?:\.(\d+))?$/)
  if (!match || match[1] === '-') return 0n
  const whole = BigInt(match[2]!)
  const fraction = `${match[3] ?? ''}00000`
  let result = whole * 10_000n + BigInt(fraction.slice(0, 4))
  if (Number(fraction[4]) >= 5) result += 1n
  return result
}

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
    (options.subtotal * scaledPercent(options.percentOff) + percentScale / 2n) /
    percentScale
  return amount < options.subtotal ? amount : options.subtotal
}

export function calculateTax(
  amount: bigint,
  rate: string | null,
  inclusive: boolean
): bigint {
  const scaledRate = scaledPercent(rate)
  if (amount <= 0n || scaledRate <= 0n) return 0n
  if (inclusive) {
    const net =
      (amount * percentScale + (percentScale + scaledRate) / 2n) /
      (percentScale + scaledRate)
    return amount - net
  }
  return (amount * scaledRate + percentScale / 2n) / percentScale
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
    (amount * scaledPercent(percent) + percentScale / 2n) / percentScale
  return policy === 'MARKUP'
    ? amount + adjustment
    : amount > adjustment
      ? amount - adjustment
      : 0n
}

export function addInterval(
  startsAt: number,
  unit: IntervalUnit,
  count: number
): number {
  if (!Number.isInteger(count) || count <= 0)
    throw new Error('Interval count must be positive.')
  if (unit === 'DAY') return startsAt + count * 86_400
  if (unit === 'WEEK') return startsAt + count * 7 * 86_400

  const source = new Date(startsAt * 1000)
  const months = unit === 'MONTH' ? count : count * 12
  const monthIndex = source.getUTCMonth() + months
  const year = source.getUTCFullYear() + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const finalDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(source.getUTCDate(), finalDay)
  return Math.floor(
    Date.UTC(
      year,
      month,
      day,
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds()
    ) / 1000
  )
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
