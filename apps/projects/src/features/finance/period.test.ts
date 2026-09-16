import { describe, expect, it } from 'vitest'

import {
  currentMonthPeriod,
  parsePeriodQuery,
  resolvePeriod,
} from './period'

describe('currentMonthPeriod', () => {
  it('returns the UTC calendar month bounds', () => {
    expect(currentMonthPeriod(1705276800)).toEqual({
      from: 1704067200,
      to: 1706745600,
    })
  })
})

describe('parsePeriodQuery', () => {
  it('parses from and to as integers', () => {
    expect(parsePeriodQuery({ from: '1', to: '2' })).toEqual({ from: 1, to: 2 })
  })

  it('returns null when either bound is missing', () => {
    expect(parsePeriodQuery({})).toBeNull()
    expect(parsePeriodQuery({ from: '1' })).toBeNull()
  })

  it('returns null for non-integer bounds', () => {
    expect(parsePeriodQuery({ from: 'a', to: '2' })).toBeNull()
  })

  it('returns null when to is not after from', () => {
    expect(parsePeriodQuery({ from: '5', to: '5' })).toBeNull()
    expect(parsePeriodQuery({ from: '6', to: '5' })).toBeNull()
  })
})

describe('resolvePeriod', () => {
  it('prefers an explicit valid period', () => {
    expect(resolvePeriod({ from: '1', to: '2' }, 1705276800)).toEqual({
      from: 1,
      to: 2,
    })
  })

  it('falls back to the current month for invalid input', () => {
    expect(resolvePeriod({}, 1705276800)).toEqual({
      from: 1704067200,
      to: 1706745600,
    })
  })
})
