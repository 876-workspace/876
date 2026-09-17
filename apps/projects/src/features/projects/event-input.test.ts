import { describe, expect, it } from 'vitest'

import {
  buildRecurrenceInput,
  dateFieldTimestamp,
  dateFieldValue,
  describeRecurrence,
  EMPTY_RECURRENCE_DRAFT,
  recurrenceDraftFromRule,
} from './event-input'
import type { RecurrenceDraft } from '@/types/events'

const SEPTEMBER_30_2026 = Date.UTC(2026, 8, 30) / 1000

function draft(overrides: Partial<RecurrenceDraft> = {}): RecurrenceDraft {
  return { ...EMPTY_RECURRENCE_DRAFT, enabled: true, ...overrides }
}

describe('buildRecurrenceInput', () => {
  it('returns null when the section is off, so the event simply does not repeat', () => {
    expect(buildRecurrenceInput(EMPTY_RECURRENCE_DRAFT)).toBeNull()
  })

  it('builds a weekly rule with the chosen weekdays', () => {
    expect(
      buildRecurrenceInput(
        draft({ freq: 'weekly', interval: '2', byWeekday: [2, 0, 0] })
      )
    ).toEqual({ freq: 'weekly', interval: 2, byWeekday: [0, 2] })
  })

  it('omits weekdays for a non-weekly frequency', () => {
    expect(
      buildRecurrenceInput(draft({ freq: 'daily', byWeekday: [1] }))
    ).toEqual({ freq: 'daily', interval: 1 })
  })

  it('carries an end date as the timestamp the contracts expect', () => {
    expect(
      buildRecurrenceInput(
        draft({ freq: 'monthly', ends: 'on', until: '2026-09-30' })
      )
    ).toEqual({
      freq: 'monthly',
      interval: 1,
      until: SEPTEMBER_30_2026,
    })
  })

  it('carries an occurrence count', () => {
    expect(
      buildRecurrenceInput(draft({ freq: 'yearly', ends: 'after', count: '5' }))
    ).toEqual({ freq: 'yearly', interval: 1, count: 5 })
  })

  it('ignores an unusable interval, end date or count instead of sending junk', () => {
    expect(
      buildRecurrenceInput(draft({ interval: '0', ends: 'on', until: '' }))
    ).toEqual({ freq: 'weekly', interval: 1 })

    expect(
      buildRecurrenceInput(
        draft({ interval: 'soon', ends: 'after', count: '-3' })
      )
    ).toEqual({ freq: 'weekly', interval: 1 })
  })
})

describe('recurrenceDraftFromRule', () => {
  it('starts off and weekly for an event with no rule', () => {
    expect(recurrenceDraftFromRule(null)).toEqual(EMPTY_RECURRENCE_DRAFT)
  })

  it('rebuilds the section from a stored rule', () => {
    expect(
      recurrenceDraftFromRule({
        freq: 'weekly',
        interval: 3,
        byWeekday: [1, 3],
        until: SEPTEMBER_30_2026,
        count: null,
      })
    ).toEqual({
      enabled: true,
      freq: 'weekly',
      interval: '3',
      byWeekday: [1, 3],
      ends: 'on',
      until: '2026-09-30',
      count: '',
    })
  })

  it('round-trips through the builder', () => {
    const source = draft({
      freq: 'daily',
      interval: '4',
      ends: 'after',
      count: '6',
    })
    const built = buildRecurrenceInput(source)

    expect(built).not.toBeNull()
    if (!built) throw new Error('expected a recurrence rule')

    expect(recurrenceDraftFromRule(built)).toEqual(source)
  })
})

describe('describeRecurrence', () => {
  it('says nothing about an event that does not repeat', () => {
    expect(describeRecurrence(null)).toBeNull()
  })

  it('reads as a cadence in words', () => {
    expect(
      describeRecurrence({
        freq: 'daily',
        interval: 1,
        byWeekday: [],
        until: null,
        count: null,
      })
    ).toBe('Repeats every day')
  })

  it('lists the weekdays of a weekly rule', () => {
    expect(
      describeRecurrence({
        freq: 'weekly',
        interval: 2,
        byWeekday: [0, 2],
        until: null,
        count: null,
      })
    ).toBe('Repeats every 2 weeks on Mon, Wed')
  })

  it('states how the series ends', () => {
    expect(
      describeRecurrence({
        freq: 'monthly',
        interval: 1,
        byWeekday: [],
        until: SEPTEMBER_30_2026,
        count: null,
      })
    ).toBe('Repeats every month · until 2026-09-30')

    expect(
      describeRecurrence({
        freq: 'daily',
        interval: 3,
        byWeekday: [],
        until: null,
        count: 4,
      })
    ).toBe('Repeats every 3 days · 4 times')
  })
})

describe('date field helpers', () => {
  it('round-trips a day between the input and the contract', () => {
    expect(dateFieldValue(dateFieldTimestamp('2026-09-30'))).toBe('2026-09-30')
  })

  it('uses UTC midnight so a date does not drift by time zone', () => {
    expect(dateFieldTimestamp('2026-09-30')).toBe(SEPTEMBER_30_2026)
  })

  it('treats an empty or malformed input as no date', () => {
    expect(dateFieldTimestamp('')).toBeNull()
    expect(dateFieldTimestamp('not-a-date')).toBeNull()
    expect(dateFieldValue(null)).toBe('')
  })
})
