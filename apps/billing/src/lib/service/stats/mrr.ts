import type { IntervalUnit } from '@/lib/db'

type RecurringItem = {
  quantity: number
  unitAmount: bigint | null
  price: {
    unitAmount: bigint | null
    priceType: 'ONE_TIME' | 'RECURRING'
    plan: {
      intervalUnit: IntervalUnit
      intervalCount: number
    } | null
  }
}

/** Normalizes recurring subscription items into monthly minor units. */
export function calculateMonthlyRecurringRevenue(
  items: RecurringItem[]
): bigint {
  let annualRevenue = 0n

  for (const item of items) {
    if (item.price.priceType !== 'RECURRING' || !item.price.plan) continue

    const unitAmount = item.unitAmount ?? item.price.unitAmount
    if (unitAmount === null) continue

    const amount = unitAmount * BigInt(item.quantity)
    annualRevenue += toAnnualAmount(
      amount,
      item.price.plan.intervalUnit,
      item.price.plan.intervalCount
    )
  }

  return annualRevenue / 12n
}

function toAnnualAmount(
  amount: bigint,
  intervalUnit: IntervalUnit,
  intervalCount: number
): bigint {
  if (intervalCount < 1) return 0n

  const count = BigInt(intervalCount)
  if (intervalUnit === 'DAY') return (amount * 365n) / count
  if (intervalUnit === 'WEEK') return (amount * 52n) / count
  if (intervalUnit === 'MONTH') return (amount * 12n) / count

  return amount / count
}
