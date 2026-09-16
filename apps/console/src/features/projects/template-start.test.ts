import { describe, expect, it } from 'vitest'

import { parseTemplateStartDate, utcMidnightToday } from './template-start'

describe('utcMidnightToday', () => {
  it('truncates a timestamp to UTC midnight', () => {
    expect(utcMidnightToday(1719964800 + 3600)).toBe(1719964800)
  })

  it('keeps a timestamp already at midnight', () => {
    expect(utcMidnightToday(1719964800)).toBe(1719964800)
  })
})

describe('parseTemplateStartDate', () => {
  it('accepts a valid Unix-seconds start', () => {
    expect(parseTemplateStartDate('1720086400', 1719968400)).toBe(1720086400)
  })

  it('falls back to today at UTC midnight when missing', () => {
    expect(parseTemplateStartDate(undefined, 1719968400)).toBe(1719964800)
  })

  it('falls back for blank, negative, and fractional values', () => {
    const fallback = parseTemplateStartDate(undefined, 1719968400)
    expect(parseTemplateStartDate('', 1719968400)).toBe(fallback)
    expect(parseTemplateStartDate('   ', 1719968400)).toBe(fallback)
    expect(parseTemplateStartDate('-5', 1719968400)).toBe(fallback)
    expect(parseTemplateStartDate('1720000000.5', 1719968400)).toBe(fallback)
    expect(parseTemplateStartDate('next-monday', 1719968400)).toBe(fallback)
  })
})
