import type { CalendarEntry } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import {
  CALENDAR_KIND_STYLES,
  CALENDAR_LEGEND,
  calendarEntriesByDay,
  calendarEntryDays,
  calendarEntryHref,
  sortCalendarEntries,
} from './calendar-entries'

const DAY = 86_400
const DAY_START = Date.UTC(2026, 8, 14) / 1000

function entry(overrides: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    object: 'calendar-entry',
    kind: 'event',
    id: 'evt_1',
    occurrenceStart: DAY_START + 9 * 3_600,
    occurrenceEnd: null,
    allDay: false,
    title: 'Design review',
    projectId: 'prj_1',
    ...overrides,
  }
}

describe('calendarEntryHref', () => {
  it('links a work item to its identifier', () => {
    expect(
      calendarEntryHref(
        entry({ kind: 'work-item', id: 'iss_1', issueIdentifier: 'PROJ-12' })
      )
    ).toBe('/issues/PROJ-12')
  })

  it('falls back to the record id when a work item carries no identifier', () => {
    expect(calendarEntryHref(entry({ kind: 'work-item', id: 'iss_1' }))).toBe(
      '/issues/iss_1'
    )
  })

  it('links a phase to its phase route', () => {
    expect(calendarEntryHref(entry({ kind: 'phase', id: 'phs_1' }))).toBe(
      '/phases/phs_1'
    )
  })

  it('links a project to its project route', () => {
    expect(calendarEntryHref(entry({ kind: 'project', id: 'prj_9' }))).toBe(
      '/projects/prj_9'
    )
  })

  it('opens the event panel for both events and meetings', () => {
    expect(calendarEntryHref(entry({ kind: 'event', id: 'evt_1' }))).toBe(
      '/calendar/events/evt_1'
    )
    expect(calendarEntryHref(entry({ kind: 'meeting', id: 'evt_2' }))).toBe(
      '/calendar/events/evt_2'
    )
  })
})

describe('calendarEntryDays', () => {
  it('places a single-day entry on one day', () => {
    expect(calendarEntryDays(entry())).toEqual([DAY_START])
  })

  it('repeats a multi-day entry in every day it spans', () => {
    const spanning = entry({
      occurrenceStart: DAY_START,
      occurrenceEnd: DAY_START + 2 * DAY + 3_600,
    })

    expect(calendarEntryDays(spanning)).toEqual([
      DAY_START,
      DAY_START + DAY,
      DAY_START + 2 * DAY,
    ])
  })

  it('caps a runaway span instead of filling every day', () => {
    const runaway = entry({
      occurrenceStart: DAY_START,
      occurrenceEnd: DAY_START + 400 * DAY,
    })

    expect(calendarEntryDays(runaway, 10)).toHaveLength(10)
  })
})

describe('sortCalendarEntries', () => {
  it('puts all-day entries above timed ones and sorts the rest by start', () => {
    const allDay = entry({
      id: 'evt_allday',
      allDay: true,
      occurrenceStart: DAY_START + 15 * 3_600,
    })
    const late = entry({
      id: 'evt_late',
      occurrenceStart: DAY_START + 14 * 3_600,
    })
    const early = entry({ id: 'evt_early', occurrenceStart: DAY_START + 3_600 })

    expect(
      sortCalendarEntries([late, early, allDay]).map((item) => item.id)
    ).toEqual(['evt_allday', 'evt_early', 'evt_late'])
  })
})

describe('calendarEntriesByDay', () => {
  it('buckets entries per visible day and drops entries outside the window', () => {
    const days = [DAY_START, DAY_START + DAY]
    const inside = entry({ id: 'evt_inside' })
    const outside = entry({
      id: 'evt_outside',
      occurrenceStart: DAY_START + 9 * DAY,
    })

    const byDay = calendarEntriesByDay([inside, outside], days)

    expect(byDay.get(DAY_START)?.map((item) => item.id)).toEqual(['evt_inside'])
    expect(byDay.get(DAY_START + DAY)).toEqual([])
  })

  it('shows a spanning entry on each day of the window it covers', () => {
    const days = [DAY_START, DAY_START + DAY, DAY_START + 2 * DAY]
    const spanning = entry({
      id: 'evt_span',
      occurrenceStart: DAY_START,
      occurrenceEnd: DAY_START + 2 * DAY,
    })

    const byDay = calendarEntriesByDay([spanning], days)

    for (const day of days)
      expect(byDay.get(day)?.map((item) => item.id)).toEqual(['evt_span'])
  })
})

describe('calendar legend', () => {
  it('has a label and a colour for every kind it advertises', () => {
    for (const kind of CALENDAR_LEGEND) {
      expect(CALENDAR_KIND_STYLES[kind].dot).toBeTruthy()
      expect(CALENDAR_KIND_STYLES[kind].chip).toBeTruthy()
    }
  })
})
