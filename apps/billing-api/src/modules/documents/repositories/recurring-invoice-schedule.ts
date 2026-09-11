import { addInterval } from '@876/core/timestamps'

type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export interface RecurringSchedule {
  startAt: number
  intervalUnit: IntervalUnit
  intervalCount: number
}

/**
 * First anchored occurrence strictly after `after`. Every occurrence is
 * computed from `startAt` (never from the previous run), so a Jan 31 anchor
 * yields Feb 28/29 then Mar 31 instead of drifting to the 28th, and a paused
 * profile resumes on its calendar rather than back-filling skipped periods.
 */
export function nextRecurringRunAfter(
  schedule: RecurringSchedule,
  after: number
): number {
  if (schedule.startAt > after) return schedule.startAt

  let periods = 1
  let next = addInterval(
    schedule.startAt,
    schedule.intervalUnit,
    schedule.intervalCount
  )
  while (next <= after) {
    periods += 1
    next = addInterval(
      schedule.startAt,
      schedule.intervalUnit,
      schedule.intervalCount * periods
    )
  }
  return next
}

/** True when generating the next run would exceed `endAt` or `maxCycles`. */
export function isRecurringScheduleExhausted(
  limits: { endAt: number | null; maxCycles: number | null },
  generatedCount: number,
  nextRunAt: number
): boolean {
  if (limits.maxCycles !== null && generatedCount >= limits.maxCycles)
    return true
  return limits.endAt !== null && nextRunAt > limits.endAt
}
