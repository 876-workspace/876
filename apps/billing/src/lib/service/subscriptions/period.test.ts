import { describe, expect, it } from 'vitest'

import { addInterval, resolveCalendarBillingAnchor } from './period'

const START = Date.UTC(2024, 0, 15, 12, 30, 0) / 1000

describe('addInterval', () => {
  it.each([
    ['DAY', 2, Date.UTC(2024, 0, 17, 12, 30, 0) / 1000],
    ['WEEK', 2, Date.UTC(2024, 0, 29, 12, 30, 0) / 1000],
    ['MONTH', 2, Date.UTC(2024, 2, 15, 12, 30, 0) / 1000],
    ['YEAR', 2, Date.UTC(2026, 0, 15, 12, 30, 0) / 1000],
  ] as const)('adds %s x%s in UTC', (unit, count, expected) => {
    expect(addInterval(START, unit, count)).toBe(expected)
  })

  it('supports a zero interval count without changing the timestamp', () => {
    expect(addInterval(START, 'DAY', 0)).toBe(START)
  })

  it('supports negative interval counts', () => {
    expect(addInterval(START, 'WEEK', -1)).toBe(
      Date.UTC(2024, 0, 8, 12, 30, 0) / 1000
    )
  })

  it('clamps month-end billing anchors instead of skipping February', () => {
    const january31 = Date.UTC(2024, 0, 31, 12, 30, 0) / 1000

    expect(addInterval(january31, 'MONTH', 1)).toBe(
      Date.UTC(2024, 1, 29, 12, 30, 0) / 1000
    )
  })

  it('preserves the original month-end anchor across successive cycles', () => {
    const january31 = Date.UTC(2024, 0, 31, 12, 30, 0) / 1000

    expect(addInterval(january31, 'MONTH', 2)).toBe(
      Date.UTC(2024, 2, 31, 12, 30, 0) / 1000
    )
  })

  it('clamps leap-day annual billing to the last valid day', () => {
    const leapDay = Date.UTC(2024, 1, 29, 12, 30, 0) / 1000

    expect(addInterval(leapDay, 'YEAR', 1)).toBe(
      Date.UTC(2025, 1, 28, 12, 30, 0) / 1000
    )
  })
})

describe('resolveCalendarBillingAnchor', () => {
  it('chooses the next configured day without moving backwards', () => {
    const january10 = Date.UTC(2024, 0, 10, 9) / 1000

    expect(resolveCalendarBillingAnchor(january10, [1, 15], [])).toBe(
      Date.UTC(2024, 0, 15, 9) / 1000
    )
  })

  it('clamps configured month-end days and honors allowed months', () => {
    const january31 = Date.UTC(2024, 0, 31, 9) / 1000

    expect(resolveCalendarBillingAnchor(january31, [31], [2, 5])).toBe(
      Date.UTC(2024, 1, 29, 9) / 1000
    )
  })
})
