import { describe, expect, it } from 'vitest'

import {
  defaultTimePeriod,
  formatTimePeriod,
  resolveTimePeriod,
  shiftTimePeriod,
  timePeriodQuery,
} from './time-period'

// Wednesday 2024-01-03 12:00 UTC, in the week that starts Monday 2024-01-01.
const WEDNESDAY = 1704283200
const MONDAY = 1704067200
const WEEK_END = 1704671999

describe('defaultTimePeriod', () => {
  it('covers the UTC week that starts on Monday', () => {
    expect(defaultTimePeriod(WEDNESDAY)).toEqual({
      from: MONDAY,
      to: WEEK_END,
    })
  })

  it('keeps Sunday in the week that started six days earlier', () => {
    expect(defaultTimePeriod(MONDAY + 6 * 86400)).toEqual({
      from: MONDAY,
      to: WEEK_END,
    })
  })
})

describe('resolveTimePeriod', () => {
  it('keeps a well-formed range the page asked for', () => {
    expect(
      resolveTimePeriod({ from: '1704067200', to: '1704153600' }, WEDNESDAY)
    ).toEqual({ from: 1704067200, to: 1704153600 })
  })

  it('falls back to the current week when the range runs backwards', () => {
    expect(
      resolveTimePeriod({ from: '1704153600', to: '1704067200' }, WEDNESDAY)
    ).toEqual(defaultTimePeriod(WEDNESDAY))
  })

  it('falls back to the current week when only one bound is given', () => {
    expect(resolveTimePeriod({ from: '1704067200' }, WEDNESDAY)).toEqual(
      defaultTimePeriod(WEDNESDAY)
    )
  })

  it('falls back to the current week on a non-numeric bound', () => {
    expect(
      resolveTimePeriod({ from: 'last-week', to: '1704153600' }, WEDNESDAY)
    ).toEqual(defaultTimePeriod(WEDNESDAY))
  })
})

describe('shiftTimePeriod', () => {
  it('steps back and forward by the span it was given', () => {
    const week = defaultTimePeriod(WEDNESDAY)

    expect(shiftTimePeriod(week, -1)).toEqual({
      from: MONDAY - 604800,
      to: WEEK_END - 604800,
    })
    expect(shiftTimePeriod(week, 1)).toEqual({
      from: MONDAY + 604800,
      to: WEEK_END + 604800,
    })
  })
})

describe('timePeriodQuery', () => {
  it('names both bounds for a link', () => {
    expect(timePeriodQuery({ from: MONDAY, to: WEEK_END })).toBe(
      `from=${MONDAY}&to=${WEEK_END}`
    )
  })
})

describe('formatTimePeriod', () => {
  it('reads the range in UTC so the server and the browser agree', () => {
    expect(formatTimePeriod({ from: MONDAY, to: WEEK_END })).toBe(
      'Jan 1 – Jan 7'
    )
  })
})
