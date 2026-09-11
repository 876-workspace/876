import { describe, expect, it } from 'vitest'

import {
  isRecurringScheduleExhausted,
  nextRecurringRunAfter,
  type RecurringSchedule,
} from '../repositories/recurring-invoice-schedule'

const JAN_15 = Date.UTC(2026, 0, 15, 12) / 1000
const FEB_15 = Date.UTC(2026, 1, 15, 12) / 1000
const MAR_15 = Date.UTC(2026, 2, 15, 12) / 1000
const MAY_15 = Date.UTC(2026, 4, 15, 12) / 1000
const JAN_31 = Date.UTC(2026, 0, 31, 12) / 1000
const FEB_28 = Date.UTC(2026, 1, 28, 12) / 1000
const MAR_31 = Date.UTC(2026, 2, 31, 12) / 1000
const JAN_31_2028 = Date.UTC(2028, 0, 31, 12) / 1000
const FEB_29_2028 = Date.UTC(2028, 1, 29, 12) / 1000
const MAR_31_2028 = Date.UTC(2028, 2, 31, 12) / 1000

function monthly(
  overrides: Partial<RecurringSchedule> = {}
): RecurringSchedule {
  return {
    startAt: JAN_15,
    intervalUnit: 'MONTH',
    intervalCount: 1,
    ...overrides,
  }
}

describe('nextRecurringRunAfter', () => {
  it('returns startAt when startAt is after the reference time', () => {
    expect(nextRecurringRunAfter(monthly(), JAN_15 - 1)).toBe(JAN_15)
  })

  it('returns the next monthly occurrence after the reference time', () => {
    expect(nextRecurringRunAfter(monthly(), JAN_15)).toBe(FEB_15)
    expect(nextRecurringRunAfter(monthly(), FEB_15 - 1)).toBe(FEB_15)
  })

  it('advances two calendar months for an every-2-months frequency', () => {
    const schedule = monthly({ intervalCount: 2 })

    expect(nextRecurringRunAfter(schedule, JAN_15)).toBe(MAR_15)
    expect(nextRecurringRunAfter(schedule, MAR_15)).toBe(MAY_15)
  })

  it('clamps a Jan 31 anchor to Feb 28 then returns to Mar 31', () => {
    const schedule = monthly({ startAt: JAN_31 })

    expect(nextRecurringRunAfter(schedule, JAN_31)).toBe(FEB_28)
    expect(nextRecurringRunAfter(schedule, FEB_28)).toBe(MAR_31)
  })

  it('clamps a Jan 31 anchor to Feb 29 in the 2028 leap year', () => {
    const schedule = monthly({ startAt: JAN_31_2028 })

    expect(nextRecurringRunAfter(schedule, JAN_31_2028)).toBe(FEB_29_2028)
    expect(nextRecurringRunAfter(schedule, FEB_29_2028)).toBe(MAR_31_2028)
  })

  it('advances a weekly schedule by whole weeks from the anchor', () => {
    const schedule: RecurringSchedule = {
      startAt: JAN_15,
      intervalUnit: 'WEEK',
      intervalCount: 1,
    }

    expect(nextRecurringRunAfter(schedule, JAN_15)).toBe(JAN_15 + 7 * 86_400)
    expect(nextRecurringRunAfter(schedule, JAN_15 + 7 * 86_400)).toBe(
      JAN_15 + 14 * 86_400
    )
  })

  it('advances a daily schedule by whole days from the anchor', () => {
    const schedule: RecurringSchedule = {
      startAt: JAN_15,
      intervalUnit: 'DAY',
      intervalCount: 1,
    }

    expect(nextRecurringRunAfter(schedule, JAN_15)).toBe(JAN_15 + 86_400)
  })

  it('advances a yearly schedule by calendar years from the anchor', () => {
    const schedule: RecurringSchedule = {
      startAt: JAN_15,
      intervalUnit: 'YEAR',
      intervalCount: 1,
    }

    expect(nextRecurringRunAfter(schedule, JAN_15)).toBe(
      Date.UTC(2027, 0, 15, 12) / 1000
    )
  })

  it('skips elapsed periods without back-filling missed occurrences', () => {
    expect(nextRecurringRunAfter(monthly(), MAY_15)).toBe(
      Date.UTC(2026, 5, 15, 12) / 1000
    )
  })

  it('derives every occurrence from the anchor rather than the previous run', () => {
    const schedule = monthly({ startAt: JAN_31 })

    expect(nextRecurringRunAfter(schedule, FEB_28 - 1)).toBe(FEB_28)
    expect(nextRecurringRunAfter(schedule, FEB_28)).toBe(MAR_31)
  })
})

describe('isRecurringScheduleExhausted', () => {
  it('returns true once the generated count reaches maxCycles', () => {
    expect(
      isRecurringScheduleExhausted({ endAt: null, maxCycles: 12 }, 12, FEB_15)
    ).toBe(true)
  })

  it('returns false while cycles remain under maxCycles', () => {
    expect(
      isRecurringScheduleExhausted({ endAt: null, maxCycles: 12 }, 11, FEB_15)
    ).toBe(false)
  })

  it('returns true when the next run passes endAt', () => {
    expect(
      isRecurringScheduleExhausted(
        { endAt: FEB_15, maxCycles: null },
        3,
        MAR_15
      )
    ).toBe(true)
  })

  it('returns false when the next run lands exactly on endAt', () => {
    expect(
      isRecurringScheduleExhausted(
        { endAt: FEB_15, maxCycles: null },
        3,
        FEB_15
      )
    ).toBe(false)
  })

  it('returns false when neither limit is set', () => {
    expect(
      isRecurringScheduleExhausted({ endAt: null, maxCycles: null }, 40, MAR_15)
    ).toBe(false)
  })
})
