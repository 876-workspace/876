import { describe, expect, it } from 'vitest'

import {
  formatBucketLabel,
  resolveCustomRange,
  resolveReportPreset,
  REPORT_PRESETS,
  validateReportRange,
  zonedMidnightToUnixSeconds,
} from './report-range'

const TIME_ZONE = 'America/Jamaica'

/** 2026-09-11 12:00 Jamaica time (UTC-5, no DST). */
const NOW = Date.UTC(2026, 8, 11, 17, 0, 0) / 1000

describe('resolveReportPreset', () => {
  it('resolves today to the Jamaica midnight boundary', () => {
    const range = resolveReportPreset('today', TIME_ZONE, NOW)
    expect(range).toEqual({
      from: Date.UTC(2026, 8, 11, 5, 0, 0) / 1000,
      to: Date.UTC(2026, 8, 12, 5, 0, 0) / 1000,
    })
  })

  it('starts this week on Monday in Jamaica time', () => {
    // Friday 2026-09-11 Jamaica -> week Mon Sep 7 .. Mon Sep 14 Jamaica.
    const range = resolveReportPreset('this-week', TIME_ZONE, NOW)
    expect(range).toEqual({
      from: Date.UTC(2026, 8, 7, 5, 0, 0) / 1000,
      to: Date.UTC(2026, 8, 14, 5, 0, 0) / 1000,
    })
  })

  it('starts this week on Monday when today is Sunday', () => {
    // Sunday 2026-09-13 12:00 Jamaica belongs to the Mon Sep 7 week.
    const sunday = Date.UTC(2026, 8, 13, 17, 0, 0) / 1000
    const range = resolveReportPreset('this-week', TIME_ZONE, sunday)
    expect(range.from).toBe(Date.UTC(2026, 8, 7, 5, 0, 0) / 1000)
  })

  it('resolves this month to the calendar month in Jamaica time', () => {
    const range = resolveReportPreset('this-month', TIME_ZONE, NOW)
    expect(range).toEqual({
      from: Date.UTC(2026, 8, 1, 5, 0, 0) / 1000,
      to: Date.UTC(2026, 9, 1, 5, 0, 0) / 1000,
    })
  })

  it('keeps a late-night Jamaica sale inside its calendar month', () => {
    // 23:30 Jamaica on Sep 30 is Oct 1 04:30 UTC; the September range must
    // still contain it while the October range must not.
    const late = Date.UTC(2026, 9, 1, 4, 30, 0) / 1000
    const september = resolveReportPreset(
      'this-month',
      TIME_ZONE,
      Date.UTC(2026, 8, 15, 12, 0, 0) / 1000
    )
    const october = resolveReportPreset(
      'this-month',
      TIME_ZONE,
      Date.UTC(2026, 9, 15, 12, 0, 0) / 1000
    )
    expect(late >= september.from && late < september.to).toBe(true)
    expect(late >= october.from && late < october.to).toBe(false)
  })

  it('resolves last month across the year boundary', () => {
    // 2026-01-10 Jamaica -> December 2025.
    const january = Date.UTC(2026, 0, 10, 17, 0, 0) / 1000
    const range = resolveReportPreset('last-month', TIME_ZONE, january)
    expect(range).toEqual({
      from: Date.UTC(2025, 11, 1, 5, 0, 0) / 1000,
      to: Date.UTC(2026, 0, 1, 5, 0, 0) / 1000,
    })
  })

  it('resolves this quarter to the calendar quarter', () => {
    const range = resolveReportPreset('this-quarter', TIME_ZONE, NOW)
    expect(range).toEqual({
      from: Date.UTC(2026, 6, 1, 5, 0, 0) / 1000,
      to: Date.UTC(2026, 9, 1, 5, 0, 0) / 1000,
    })
  })

  it('resolves this year to the calendar year', () => {
    const range = resolveReportPreset('this-year', TIME_ZONE, NOW)
    expect(range).toEqual({
      from: Date.UTC(2026, 0, 1, 5, 0, 0) / 1000,
      to: Date.UTC(2027, 0, 1, 5, 0, 0) / 1000,
    })
  })

  it('exposes every preset the control renders', () => {
    expect([...REPORT_PRESETS]).toEqual([
      'today',
      'this-week',
      'this-month',
      'last-month',
      'this-quarter',
      'this-year',
      'custom',
    ])
  })
})

describe('resolveCustomRange', () => {
  it('resolves a valid custom range with an exclusive end', () => {
    const result = resolveCustomRange('2026-09-01', '2026-09-10', TIME_ZONE)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      from: Date.UTC(2026, 8, 1, 5, 0, 0) / 1000,
      to: Date.UTC(2026, 8, 11, 5, 0, 0) / 1000,
    })
  })

  it('rejects a custom range whose start is not before its end', () => {
    const result = resolveCustomRange('2026-09-10', '2026-09-01', TIME_ZONE)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('reports/invalid-range')
  })

  it('rejects malformed custom dates', () => {
    expect(resolveCustomRange('09/01/2026', '2026-09-10', TIME_ZONE).data).toBeNull()
    expect(resolveCustomRange('2026-02-30', '2026-09-10', TIME_ZONE).data).toBeNull()
  })
})

describe('validateReportRange', () => {
  it('accepts a bounded range and rejects oversized or inverted ranges', () => {
    expect(validateReportRange({ from: 1, to: 2 })).toBe(true)
    expect(validateReportRange({ from: 2, to: 1 })).toBe(false)
    expect(validateReportRange({ from: 0, to: 400 * 86400 + 1 })).toBe(false)
  })
})

describe('formatBucketLabel', () => {
  it('labels day buckets with month and day in Jamaica time', () => {
    expect(
      formatBucketLabel(Date.UTC(2026, 8, 11, 5, 0, 0) / 1000, 'day', TIME_ZONE)
    ).toBe('Sep 11')
  })

  it('labels month buckets compactly', () => {
    expect(
      formatBucketLabel(Date.UTC(2026, 8, 1, 5, 0, 0) / 1000, 'month', TIME_ZONE)
    ).toBe('Sep ’26')
  })

  it('labels week buckets by their Monday', () => {
    expect(
      formatBucketLabel(Date.UTC(2026, 8, 7, 5, 0, 0) / 1000, 'week', TIME_ZONE)
    ).toBe('Sep 7')
  })
})

describe('zonedMidnightToUnixSeconds', () => {
  it('is stable across repeated calls', () => {
    const first = zonedMidnightToUnixSeconds(
      { year: 2026, month: 9, day: 11 },
      TIME_ZONE
    )
    const second = zonedMidnightToUnixSeconds(
      { year: 2026, month: 9, day: 11 },
      TIME_ZONE
    )
    expect(first).toBe(second)
  })
})
