import { describe, expect, it } from 'vitest'

import { formatDateInput, parseDateInput, todaySeconds } from '../date-input'

describe('parseDateInput', () => {
  it('parses a calendar date as UTC midnight in unix seconds', () => {
    expect(parseDateInput('2026-09-01')).toBe(Date.UTC(2026, 8, 1) / 1000)
  })

  it('trims surrounding whitespace', () => {
    expect(parseDateInput('  2026-09-01\n')).toBe(Date.UTC(2026, 8, 1) / 1000)
  })

  it('rejects values that are not YYYY-MM-DD', () => {
    expect(parseDateInput('09/01/2026')).toBeNull()
    expect(parseDateInput('2026-9-1')).toBeNull()
    expect(parseDateInput('')).toBeNull()
  })

  it('rejects impossible calendar dates', () => {
    expect(parseDateInput('2026-13-01')).toBeNull()
    expect(parseDateInput('2026-02-30')).toBeNull()
  })
})

describe('formatDateInput', () => {
  it('formats unix seconds as YYYY-MM-DD', () => {
    expect(formatDateInput(Date.UTC(2026, 8, 1) / 1000)).toBe('2026-09-01')
  })

  it('formats a missing timestamp as an empty control value', () => {
    expect(formatDateInput(null)).toBe('')
    expect(formatDateInput(undefined)).toBe('')
  })

  it('round-trips through the parser', () => {
    const timestamp = Date.UTC(2026, 0, 15) / 1000

    expect(parseDateInput(formatDateInput(timestamp))).toBe(timestamp)
  })
})

describe('todaySeconds', () => {
  it('returns UTC midnight for the given moment', () => {
    const noon = Date.UTC(2026, 8, 16, 12, 30)

    expect(todaySeconds(noon)).toBe(Date.UTC(2026, 8, 16) / 1000)
  })
})
