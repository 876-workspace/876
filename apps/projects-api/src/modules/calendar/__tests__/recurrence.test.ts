import { describe, expect, it } from 'vitest'

import {
  expandOccurrences,
  MAX_RECURRENCE_OCCURRENCES,
  type RecurrenceRule,
} from '../recurrence.js'

const DAY = 86400

function utc(
  year: number,
  month: number,
  day: number,
  hour = 10,
  minute = 0,
  second = 0
): number {
  return Math.floor(Date.UTC(year, month - 1, day, hour, minute, second) / 1000)
}

function rule(
  freq: RecurrenceRule['freq'],
  startsAt: number,
  overrides: Partial<RecurrenceRule> = {}
): RecurrenceRule {
  return {
    freq,
    interval: 1,
    byWeekday: null,
    until: null,
    count: null,
    startsAt,
    durationSeconds: 3600,
    ...overrides,
  }
}

describe('recurrence expansion', () => {
  it('expands a daily rule to one occurrence per day in the window', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt),
      startsAt,
      startsAt + 3 * DAY
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      startsAt,
      startsAt + DAY,
      startsAt + 2 * DAY,
      startsAt + 3 * DAY,
    ])
  })

  it('steps a daily rule by its interval', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt, { interval: 3 }),
      startsAt,
      startsAt + 9 * DAY
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      startsAt,
      startsAt + 3 * DAY,
      startsAt + 6 * DAY,
      startsAt + 9 * DAY,
    ])
  })

  it('repeats a weekly rule on the weekday of the first occurrence by default', () => {
    // 2026-09-01 is a Tuesday.
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('weekly', startsAt),
      startsAt,
      startsAt + 14 * DAY
    )
    expect(occurrences).toHaveLength(3)
    for (const occurrence of occurrences) {
      expect(new Date(occurrence.start * 1000).getUTCDay()).toBe(2)
    }
  })

  it('repeats a weekly rule on every weekday in the set', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('weekly', startsAt, { byWeekday: [1, 3] }),
      startsAt,
      startsAt + 14 * DAY
    )
    const weekdays = occurrences.map((occurrence) =>
      new Date(occurrence.start * 1000).getUTCDay()
    )
    expect(weekdays).toEqual([3, 1, 3, 1])
  })

  it('steps a weekly rule by whole weeks keeping the weekday set', () => {
    const startsAt = utc(2026, 9, 7)
    const occurrences = expandOccurrences(
      rule('weekly', startsAt, { interval: 2, byWeekday: [1] }),
      startsAt,
      startsAt + 28 * DAY
    )
    expect(occurrences).toHaveLength(3)
    const gaps = occurrences
      .slice(1)
      .map(
        (occurrence, index) => occurrence.start - occurrences[index].start
      )
    expect(gaps).toEqual([14 * DAY, 14 * DAY])
  })

  it('never emits a weekly occurrence before the first start', () => {
    // Starts Tuesday; Monday belongs to the same week but predates the event.
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('weekly', startsAt, { byWeekday: [1, 2] }),
      startsAt - 7 * DAY,
      startsAt + 7 * DAY
    )
    expect(occurrences[0].start).toBe(startsAt)
    expect(
      occurrences.every((occurrence) => occurrence.start >= startsAt)
    ).toBe(true)
  })

  it('expands a monthly rule on the same day-of-month', () => {
    const startsAt = utc(2026, 7, 15)
    const occurrences = expandOccurrences(
      rule('monthly', startsAt),
      startsAt,
      utc(2026, 10, 16)
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      utc(2026, 7, 15),
      utc(2026, 8, 15),
      utc(2026, 9, 15),
      utc(2026, 10, 15),
    ])
  })

  it('steps a monthly rule by its interval in months', () => {
    const startsAt = utc(2026, 1, 10)
    const occurrences = expandOccurrences(
      rule('monthly', startsAt, { interval: 2 }),
      startsAt,
      utc(2026, 7, 11)
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      utc(2026, 1, 10),
      utc(2026, 3, 10),
      utc(2026, 5, 10),
      utc(2026, 7, 10),
    ])
  })

  it('skips February for a monthly 31st and resumes in March', () => {
    const startsAt = utc(2026, 1, 31)
    const occurrences = expandOccurrences(
      rule('monthly', startsAt),
      startsAt,
      utc(2026, 4, 1)
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      utc(2026, 1, 31),
      utc(2026, 3, 31),
    ])
  })

  it('skips 30-day months for a monthly 31st instead of clamping', () => {
    const startsAt = utc(2026, 3, 31)
    const occurrences = expandOccurrences(
      rule('monthly', startsAt),
      startsAt,
      utc(2026, 6, 1)
    )
    // April has 30 days, so no occurrence lands there — and none is clamped
    // to April 30th either.
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      utc(2026, 3, 31),
      utc(2026, 5, 31),
    ])
  })

  it('keeps the UTC time-of-day on monthly occurrences', () => {
    const startsAt = utc(2026, 1, 15, 14, 30)
    const occurrences = expandOccurrences(
      rule('monthly', startsAt),
      startsAt,
      utc(2026, 3, 16)
    )
    for (const occurrence of occurrences) {
      const date = new Date(occurrence.start * 1000)
      expect(date.getUTCHours()).toBe(14)
      expect(date.getUTCMinutes()).toBe(30)
    }
  })

  it('expands a yearly rule on the same month and day', () => {
    const startsAt = utc(2024, 6, 15)
    const occurrences = expandOccurrences(
      rule('yearly', startsAt),
      startsAt,
      utc(2027, 6, 16)
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      utc(2024, 6, 15),
      utc(2025, 6, 15),
      utc(2026, 6, 15),
      utc(2027, 6, 15),
    ])
  })

  it('skips non-leap years for a yearly Feb 29th and resumes on leap years', () => {
    const startsAt = utc(2024, 2, 29)
    const occurrences = expandOccurrences(
      rule('yearly', startsAt),
      startsAt,
      utc(2029, 3, 1)
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      utc(2024, 2, 29),
      utc(2028, 2, 29),
    ])
  })

  it('treats until as an inclusive upper bound on occurrence starts', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt, { until: startsAt + 2 * DAY }),
      startsAt,
      startsAt + 10 * DAY
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      startsAt,
      startsAt + DAY,
      startsAt + 2 * DAY,
    ])
  })

  it('limits total occurrences with count even inside a wide window', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt, { count: 3 }),
      startsAt,
      startsAt + 30 * DAY
    )
    expect(occurrences).toHaveLength(3)
  })

  it('counts occurrences from the first one, not from the window start', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt, { count: 2 }),
      startsAt + 5 * DAY,
      startsAt + 30 * DAY
    )
    expect(occurrences).toEqual([])
  })

  it('caps unbounded expansion at 1000 occurrences', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt),
      startsAt,
      startsAt + 5000 * DAY
    )
    expect(occurrences).toHaveLength(MAX_RECURRENCE_OCCURRENCES)
    expect(occurrences[999].start).toBe(startsAt + 999 * DAY)
  })

  it('caps expansion at 1000 even when count allows more', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt, { count: 5000 }),
      startsAt,
      startsAt + 6000 * DAY
    )
    expect(occurrences).toHaveLength(MAX_RECURRENCE_OCCURRENCES)
  })

  it('steps daily occurrences by exact Unix days across a DST boundary', () => {
    // US daylight saving starts 2026-03-08; Unix-second maths must not shift.
    const startsAt = utc(2026, 3, 6, 12)
    const occurrences = expandOccurrences(
      rule('daily', startsAt),
      startsAt,
      startsAt + 5 * DAY
    )
    const gaps = occurrences
      .slice(1)
      .map((occurrence, index) => occurrence.start - occurrences[index].start)
    expect(gaps).toEqual([DAY, DAY, DAY, DAY, DAY])
  })

  it('includes an occurrence that ends exactly at the window start', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt),
      startsAt + 3600,
      startsAt + DAY
    )
    expect(occurrences[0].start).toBe(startsAt)
  })

  it('includes an occurrence that starts exactly at the window end', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('daily', startsAt),
      startsAt + 5 * DAY,
      startsAt + 7 * DAY
    )
    expect(occurrences.map((occurrence) => occurrence.start)).toEqual([
      startsAt + 5 * DAY,
      startsAt + 6 * DAY,
      startsAt + 7 * DAY,
    ])
  })

  it('returns nothing when the whole series sits outside the window', () => {
    const startsAt = utc(2026, 9, 1)
    expect(
      expandOccurrences(
        rule('daily', startsAt, { count: 2 }),
        startsAt + 10 * DAY,
        startsAt + 20 * DAY
      )
    ).toEqual([])
    expect(
      expandOccurrences(
        rule('daily', startsAt),
        startsAt - 10 * DAY,
        startsAt - DAY
      )
    ).toEqual([])
  })

  it('preserves the event duration on every occurrence', () => {
    const startsAt = utc(2026, 9, 1, 9)
    const occurrences = expandOccurrences(
      rule('daily', startsAt, { durationSeconds: 5400 }),
      startsAt,
      startsAt + 2 * DAY
    )
    expect(occurrences).toHaveLength(3)
    for (const occurrence of occurrences) {
      expect(occurrence.end).toBe(occurrence.start + 5400)
    }
  })

  it('leaves point-in-time occurrences without an end', () => {
    const startsAt = utc(2026, 9, 1)
    const occurrences = expandOccurrences(
      rule('weekly', startsAt, { durationSeconds: null }),
      startsAt,
      startsAt + 7 * DAY
    )
    expect(occurrences).toHaveLength(2)
    for (const occurrence of occurrences) {
      expect(occurrence.end).toBeNull()
    }
  })

  it('deduplicates and sorts an unordered weekday set', () => {
    const startsAt = utc(2026, 9, 7)
    const occurrences = expandOccurrences(
      rule('weekly', startsAt, { byWeekday: [5, 1, 5, 3] }),
      startsAt,
      startsAt + 7 * DAY
    )
    const weekdays = occurrences.map((occurrence) =>
      new Date(occurrence.start * 1000).getUTCDay()
    )
    expect(weekdays).toEqual([1, 3, 5, 1])
  })
})
