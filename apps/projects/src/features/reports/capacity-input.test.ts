import { describe, expect, it } from 'vitest'

import {
  formatDateInput,
  formatMinutesAsHours,
  parseDateInput,
  parseHoursToMinutes,
} from './capacity-input'

describe('parseHoursToMinutes', () => {
  it('converts whole hours to minutes', () => {
    expect(parseHoursToMinutes('40')).toBe(2400)
  })

  it('converts half hours to minutes', () => {
    expect(parseHoursToMinutes('37.5')).toBe(2250)
  })

  it('converts quarter hours to minutes', () => {
    expect(parseHoursToMinutes('37.25')).toBe(2235)
    expect(parseHoursToMinutes('0.05')).toBe(3)
  })

  it('rejects a fraction that is not a whole number of minutes', () => {
    expect(parseHoursToMinutes('37.33')).toBeNull()
    expect(parseHoursToMinutes('1.01')).toBeNull()
  })

  it('rejects blank, zero, negative, and non-numeric input', () => {
    expect(parseHoursToMinutes('')).toBeNull()
    expect(parseHoursToMinutes('0')).toBeNull()
    expect(parseHoursToMinutes('-8')).toBeNull()
    expect(parseHoursToMinutes('forty')).toBeNull()
  })

  it('rejects more than a seven-day week', () => {
    expect(parseHoursToMinutes('168')).toBe(10080)
    expect(parseHoursToMinutes('168.5')).toBeNull()
  })

  it('ignores surrounding whitespace', () => {
    expect(parseHoursToMinutes(' 30 ')).toBe(1800)
  })
})

describe('formatMinutesAsHours', () => {
  it('renders whole hours without a fraction', () => {
    expect(formatMinutesAsHours(2400)).toBe('40')
  })

  it('renders the fraction the form accepts', () => {
    expect(formatMinutesAsHours(2250)).toBe('37.5')
    expect(formatMinutesAsHours(2235)).toBe('37.25')
  })

  it('renders nothing for a missing value', () => {
    expect(formatMinutesAsHours(null)).toBe('')
    expect(formatMinutesAsHours(undefined)).toBe('')
  })

  it('round-trips a value the form accepts', () => {
    const minutes = parseHoursToMinutes(formatMinutesAsHours(2235))

    expect(minutes).toBe(2235)
  })
})

describe('parseDateInput', () => {
  it('reads a date input as unix seconds', () => {
    expect(parseDateInput('2026-09-01')).toBe(1788220800)
  })

  it('rejects a malformed date', () => {
    expect(parseDateInput('')).toBeNull()
    expect(parseDateInput('01/09/2026')).toBeNull()
    expect(parseDateInput('2026-13-40')).toBeNull()
  })
})

describe('formatDateInput', () => {
  it('renders unix seconds as a date input value', () => {
    expect(formatDateInput(1788220800)).toBe('2026-09-01')
  })

  it('renders nothing for a missing timestamp', () => {
    expect(formatDateInput(null)).toBe('')
  })
})
