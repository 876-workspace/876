import { addInterval } from './period'

/** Prorates a calendar-alignment stub without consuming a regular cycle. */
export function prorateInitialStubAmount(
  amount: bigint,
  subscription: {
    hasInitialStubPeriod: boolean
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
    billingCycleAnchor: number | null
  },
  cadence: {
    intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
    intervalCount: number | null
  }
): bigint {
  if (
    !subscription.hasInitialStubPeriod ||
    subscription.currentPeriodStart === null ||
    subscription.currentPeriodEnd === null ||
    subscription.billingCycleAnchor === null ||
    !cadence.intervalUnit ||
    !cadence.intervalCount
  )
    return amount

  const regularPeriodEnd = addInterval(
    subscription.billingCycleAnchor,
    cadence.intervalUnit,
    cadence.intervalCount
  )
  const regularSeconds = regularPeriodEnd - subscription.billingCycleAnchor
  const stubSeconds =
    subscription.currentPeriodEnd - subscription.currentPeriodStart
  if (regularSeconds <= 0 || stubSeconds <= 0)
    throw new Error('Calendar billing periods must have a positive duration.')

  return (
    (amount * BigInt(stubSeconds) + BigInt(regularSeconds) / 2n) /
    BigInt(regularSeconds)
  )
}
