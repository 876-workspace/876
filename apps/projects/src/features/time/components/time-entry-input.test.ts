import { describe, expect, it } from 'vitest'

import {
  entryDateValue,
  entryTimeValue,
  entryTimestamps,
} from './time-entry-input'

// Wednesday 2024-01-03 09:15 UTC.
const MORNING = 1704273300

describe('entryDateValue', () => {
  it('renders the day in UTC', () => {
    expect(entryDateValue(MORNING)).toBe('2024-01-03')
  })

  it('renders nothing for an entry that never started', () => {
    expect(entryDateValue(null)).toBe('')
  })
})

describe('entryTimeValue', () => {
  it('renders the clock time in UTC', () => {
    expect(entryTimeValue(MORNING)).toBe('09:15')
  })

  it('renders nothing for an entry that never started', () => {
    expect(entryTimeValue(null)).toBe('')
  })
})

describe('entryTimestamps', () => {
  it('combines the day and both clock times into instants', () => {
    expect(entryTimestamps('2024-01-03', '09:15', '11:45')).toEqual({
      ok: true,
      startedAt: MORNING,
      endedAt: MORNING + 9000,
    })
  })

  it('refuses an end that is not after the start', () => {
    expect(entryTimestamps('2024-01-03', '11:45', '09:15')).toEqual({
      ok: false,
      reason: 'range',
    })
    expect(entryTimestamps('2024-01-03', '09:15', '09:15')).toEqual({
      ok: false,
      reason: 'range',
    })
  })

  it('refuses a form that is not filled in yet', () => {
    expect(entryTimestamps('2024-01-03', '', '11:45')).toEqual({
      ok: false,
      reason: 'incomplete',
    })
    expect(entryTimestamps('', '09:15', '11:45')).toEqual({
      ok: false,
      reason: 'incomplete',
    })
  })

  it('refuses a time outside the clock', () => {
    expect(entryTimestamps('2024-01-03', '25:00', '26:00')).toEqual({
      ok: false,
      reason: 'incomplete',
    })
  })
})
