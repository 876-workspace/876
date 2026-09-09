import { afterEach, describe, expect, it } from 'vitest'
import type { WorkEvent, WorkMyWork, WorkReminder, WorkTask } from '@876/work'
import {
  workCalendarItemsForDay,
  workEventOccursOnDay,
} from '@876/work-ui/calendar'

import { calendarWindow } from './work-widget-time'

const originalTimeZone = process.env.TZ

afterEach(() => {
  if (originalTimeZone === undefined) delete process.env.TZ
  else process.env.TZ = originalTimeZone
})

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function task(id: string, at: number): WorkTask {
  return {
    object: 'task',
    id,
    uid: `${id}-uid`,
    organizationId: 'org_1',
    listId: 'list_1',
    parentTaskId: null,
    context: null,
    links: [],
    title: id,
    description: null,
    status: 'OPEN',
    importance: 'NORMAL',
    priorityId: null,
    assigneeId: 'user_1',
    assignments: [],
    startAt: null,
    startTimeZone: null,
    dueAt: at,
    dueTimeZone: 'America/New_York',
    estimatedDuration: null,
    percentComplete: 0,
    recurrenceRuleId: null,
    completedAt: null,
    completedBy: null,
    isOverdue: false,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: at - 60,
    updatedAt: at - 60,
  }
}

function reminder(id: string, at: number): WorkReminder {
  return {
    object: 'reminder',
    id,
    organizationId: 'org_1',
    context: null,
    title: id,
    note: null,
    remindAt: at,
    timeZone: 'America/New_York',
    recurrenceRuleId: null,
    userId: 'user_1',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_1',
    createdAt: at - 60,
    updatedAt: at - 60,
  }
}

function timedEvent(
  id: string,
  calendarId: string,
  startAt: number,
  endAt: number
): WorkEvent {
  return {
    object: 'event',
    id,
    uid: `${id}-uid`,
    organizationId: 'org_1',
    calendarId,
    title: id,
    description: null,
    location: null,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    allDay: false,
    startAt,
    endAt,
    timeZone: 'America/New_York',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_1',
    createdAt: startAt - 60,
    updatedAt: startAt - 60,
  }
}

function allDayEvent(
  id: string,
  calendarId: string,
  startDate: string,
  endDate: string
): WorkEvent {
  return {
    object: 'event',
    id,
    uid: `${id}-uid`,
    organizationId: 'org_1',
    calendarId,
    title: id,
    description: null,
    location: null,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    allDay: true,
    startAt: null,
    endAt: null,
    timeZone: null,
    startDate,
    endDate,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_1',
    createdAt: 1,
    updatedAt: 1,
  }
}

function work(
  from: number,
  to: number,
  values: {
    tasks?: WorkTask[]
    reminders?: WorkReminder[]
    events?: WorkEvent[]
  } = {}
): WorkMyWork {
  return {
    object: 'my_work',
    organizationId: 'org_1',
    userId: 'user_1',
    from,
    to,
    tasks: values.tasks ?? [],
    reminders: values.reminders ?? [],
    events: values.events ?? [],
    overdueTasks: [],
  }
}

describe('calendarWindow', () => {
  it('uses an exclusive end for the local day', () => {
    const anchor = new Date(2026, 8, 9, 12)

    expect(calendarWindow('day', anchor)).toEqual({
      from: unix(new Date(2026, 8, 9)),
      to: unix(new Date(2026, 8, 10)),
    })
  })

  it('covers Sunday through the next Sunday for week view', () => {
    const anchor = new Date(2026, 8, 9, 12)

    expect(calendarWindow('week', anchor)).toEqual({
      from: unix(new Date(2026, 8, 6)),
      to: unix(new Date(2026, 8, 13)),
    })
  })

  it('covers the complete 42-day month grid including spillover days', () => {
    const anchor = new Date(2026, 8, 15, 12)

    expect(calendarWindow('month', anchor)).toEqual({
      from: unix(new Date(2026, 7, 30)),
      to: unix(new Date(2026, 9, 11)),
    })
  })

  it('uses local calendar arithmetic across the spring DST transition', () => {
    process.env.TZ = 'America/New_York'
    const window = calendarWindow('day', new Date(2026, 2, 8, 12))

    expect(window.to - window.from).toBe(23 * 60 * 60)
  })

  it('uses local calendar arithmetic across the fall DST transition', () => {
    process.env.TZ = 'America/New_York'
    const window = calendarWindow('day', new Date(2026, 10, 1, 12))

    expect(window.to - window.from).toBe(25 * 60 * 60)
  })
})

describe('Work calendar occurrence semantics', () => {
  it('shows a timed cross-midnight event on every overlapped local day', () => {
    process.env.TZ = 'America/New_York'
    const event = timedEvent(
      'event_cross_midnight',
      'calendar_1',
      unix(new Date(2026, 8, 9, 23, 30)),
      unix(new Date(2026, 8, 10, 0, 30))
    )

    expect(workEventOccursOnDay(event, new Date(2026, 8, 9))).toBe(true)
    expect(workEventOccursOnDay(event, new Date(2026, 8, 10))).toBe(true)
    expect(workEventOccursOnDay(event, new Date(2026, 8, 11))).toBe(false)
  })

  it('treats all-day event endDate as exclusive', () => {
    const event = allDayEvent(
      'event_all_day',
      'calendar_1',
      '2026-09-09',
      '2026-09-11'
    )

    expect(workEventOccursOnDay(event, new Date(2026, 8, 9))).toBe(true)
    expect(workEventOccursOnDay(event, new Date(2026, 8, 10))).toBe(true)
    expect(workEventOccursOnDay(event, new Date(2026, 8, 11))).toBe(false)
  })

  it('filters only events by selected calendar and keeps tasks and reminders', () => {
    process.env.TZ = 'America/New_York'
    const day = new Date(2026, 8, 9, 12)
    const at = unix(new Date(2026, 8, 9, 10))
    const data = work(unix(new Date(2026, 8, 9)), unix(new Date(2026, 8, 10)), {
      tasks: [task('task_1', at)],
      reminders: [reminder('reminder_1', at)],
      events: [
        timedEvent('event_1', 'calendar_1', at, at + 1800),
        timedEvent('event_2', 'calendar_2', at, at + 1800),
      ],
    })

    expect(
      workCalendarItemsForDay(data, day, 'calendar_1').map(
        (item) => `${item.type}:${item.id}`
      )
    ).toEqual(['event:event_1', 'reminder:reminder_1', 'task:task_1'])
  })
})
