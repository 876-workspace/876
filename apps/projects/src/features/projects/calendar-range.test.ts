import { describe, expect, it } from 'vitest'

import {
  calendarDays,
  calendarHref,
  calendarNavHref,
  calendarWindowLabel,
  parseCalendarView,
  parseCalendarTimestamp,
  resolveCalendarWindow,
  startOfMonthUtc,
  startOfWeekUtc,
} from './calendar-range'

const DAY = 86_400
const SEPTEMBER_15_2026 = Date.UTC(2026, 8, 15) / 1000

function iso(timestamp: number) {
  return new Date(timestamp * 1000).toISOString()
}

describe('parseCalendarView', () => {
  it('defaults to the month grid for an absent view', () => {
    expect(parseCalendarView(undefined)).toBe('month')
  })

  it('defaults to the month grid for an unknown view', () => {
    expect(parseCalendarView('quarter')).toBe('month')
  })

  it('accepts the week and list views', () => {
    expect(parseCalendarView('week')).toBe('week')
    expect(parseCalendarView('list')).toBe('list')
  })
})

describe('parseCalendarTimestamp', () => {
  it('reads a positive whole-second timestamp', () => {
    expect(parseCalendarTimestamp('1789430400')).toBe(1789430400)
  })

  it('rejects a missing or malformed value rather than defaulting to zero', () => {
    expect(parseCalendarTimestamp(undefined)).toBeNull()
    expect(parseCalendarTimestamp('next-week')).toBeNull()
    expect(parseCalendarTimestamp('0')).toBeNull()
  })
})

describe('resolveCalendarWindow', () => {
  it('starts the grid and week windows on a Monday', () => {
    for (const view of ['month', 'week'] as const) {
      const window = resolveCalendarWindow({
        view,
        from: SEPTEMBER_15_2026,
      })
      expect(new Date(window.from * 1000).getUTCDay()).toBe(1)
    }
  })

  it('covers whole weeks around the anchor month so the grid has no gaps', () => {
    const window = resolveCalendarWindow({
      view: 'month',
      from: SEPTEMBER_15_2026,
    })

    expect(iso(window.from)).toBe('2026-08-31T00:00:00.000Z')
    expect(iso(window.to)).toBe('2026-10-04T23:59:59.000Z')
    expect((window.to - window.from + 1) / DAY).toBe(35)
  })

  it('gives the week view exactly seven days from the anchor week', () => {
    const window = resolveCalendarWindow({
      view: 'week',
      from: SEPTEMBER_15_2026,
    })

    expect(iso(window.from)).toBe('2026-09-14T00:00:00.000Z')
    expect(iso(window.to)).toBe('2026-09-20T23:59:59.000Z')
  })

  it('gives the list view the anchor month exactly', () => {
    const window = resolveCalendarWindow({
      view: 'list',
      from: SEPTEMBER_15_2026,
    })

    expect(iso(window.from)).toBe('2026-09-01T00:00:00.000Z')
    expect(iso(window.to)).toBe('2026-09-30T23:59:59.000Z')
  })

  it('falls back to now when no anchor was requested', () => {
    const now = Date.UTC(2026, 2, 17, 12, 30) / 1000
    const window = resolveCalendarWindow({ view: 'week', now })

    expect(iso(window.from)).toBe('2026-03-16T00:00:00.000Z')
  })
})

describe('calendarDays', () => {
  it('lists one entry per day in the window, including both ends', () => {
    const window = resolveCalendarWindow({
      view: 'week',
      from: SEPTEMBER_15_2026,
    })

    const days = calendarDays(window)

    expect(days).toHaveLength(7)
    expect(iso(days[0])).toBe('2026-09-14T00:00:00.000Z')
    expect(iso(days[6])).toBe('2026-09-20T00:00:00.000Z')
  })
})

describe('calendar period navigation', () => {
  it('steps a week view forward to the next whole week', () => {
    const window = resolveCalendarWindow({
      view: 'week',
      from: SEPTEMBER_15_2026,
    })

    expect(
      calendarNavHref({
        view: 'week',
        anchor: window.anchor,
        direction: 'next',
      })
    ).toBe(
      calendarHref({
        view: 'week',
        from: Date.UTC(2026, 8, 21) / 1000,
        to: Date.UTC(2026, 8, 27, 23, 59, 59) / 1000,
      })
    )
  })

  it('steps a month view back to the previous month without drifting into it', () => {
    const window = resolveCalendarWindow({
      view: 'month',
      from: SEPTEMBER_15_2026,
    })
    const target = resolveCalendarWindow({
      view: 'month',
      from: Date.UTC(2026, 7, 1) / 1000,
    })

    const href = calendarNavHref({
      view: 'month',
      anchor: window.anchor,
      direction: 'previous',
    })

    expect(href).toBe(
      calendarHref({ view: 'month', from: target.anchor, to: target.to })
    )
    // The anchor is the first of the month, never the grid's leading day.
    expect(href).toContain(`from=${Date.UTC(2026, 7, 1) / 1000}`)
    expect(
      resolveCalendarWindow({ view: 'month', from: target.anchor }).anchor
    ).toBe(target.anchor)
  })

  it('lets today drop the anchor so the server resolves the current period', () => {
    expect(
      calendarNavHref({
        view: 'month',
        anchor: SEPTEMBER_15_2026,
        direction: 'today',
      })
    ).toBe('/calendar?view=month')
  })

  it('carries the project filter through the switch and the navigation', () => {
    expect(calendarHref({ view: 'list', project: 'prj_1' })).toBe(
      '/calendar?view=list&project=prj_1'
    )
    expect(
      calendarNavHref({
        view: 'week',
        anchor: SEPTEMBER_15_2026,
        project: 'prj_1',
        direction: 'today',
      })
    ).toBe('/calendar?view=week&project=prj_1')
  })
})

describe('an explicit window from the URL', () => {
  it('renders the period a shared link asked for', () => {
    const window = resolveCalendarWindow({
      view: 'week',
      from: SEPTEMBER_15_2026,
      to: Date.UTC(2026, 8, 16, 23, 59, 59) / 1000,
    })

    expect(iso(window.to)).toBe('2026-09-16T23:59:59.000Z')
  })

  it('ignores a window that ends before it starts', () => {
    const window = resolveCalendarWindow({
      view: 'week',
      from: SEPTEMBER_15_2026,
      to: Date.UTC(2026, 8, 1) / 1000,
    })

    expect(iso(window.to)).toBe('2026-09-20T23:59:59.000Z')
  })
})

describe('calendarWindowLabel', () => {
  it('names the month for the grid and list views', () => {
    expect(
      calendarWindowLabel(
        'month',
        resolveCalendarWindow({ view: 'month', from: SEPTEMBER_15_2026 })
      )
    ).toBe('September 2026')
  })

  it('names both ends of a week', () => {
    expect(
      calendarWindowLabel(
        'week',
        resolveCalendarWindow({ view: 'week', from: SEPTEMBER_15_2026 })
      )
    ).toBe('Sep 14 – Sep 20, 2026')
  })
})

describe('week and month boundaries', () => {
  it('treats a Monday as its own week start', () => {
    expect(iso(startOfWeekUtc(Date.UTC(2026, 8, 14) / 1000))).toBe(
      '2026-09-14T00:00:00.000Z'
    )
  })

  it('rolls a Sunday back to the preceding Monday', () => {
    expect(iso(startOfWeekUtc(Date.UTC(2026, 8, 20) / 1000))).toBe(
      '2026-09-14T00:00:00.000Z'
    )
  })

  it('normalises any day of the month to the first', () => {
    expect(iso(startOfMonthUtc(Date.UTC(2026, 8, 30, 23) / 1000))).toBe(
      '2026-09-01T00:00:00.000Z'
    )
  })
})
