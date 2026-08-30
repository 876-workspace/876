import { isError } from '@876/core'
import { createWorkCalendarExportInputSchema } from '@876/work'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../alerts/index.js', () => ({
  list: vi.fn(),
}))
vi.mock('../events/index.js', () => ({
  list: vi.fn(),
}))
vi.mock('../recurrence-rules/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('../tasks/index.js', () => ({
  list: vi.fn(),
}))

import * as alerts from '../alerts/index.js'
import * as events from '../events/index.js'
import * as recurrence from '../recurrence-rules/index.js'
import * as tasks from '../tasks/index.js'
import * as service from './exports.service.js'

/**
 * Narrows a service result to the export document.
 *
 * `create` returns `WorkCalendarExport | AppErrorValue`. Casting to
 * `{ content: string }` typechecks the one property a test happens to read
 * while hiding both the error case and every other field, so the whole
 * envelope is asserted here instead.
 */
function exportOf(result: Awaited<ReturnType<typeof service.create>>) {
  if (isError(result))
    throw new Error(`expected a calendar export, received ${result.code}`)
  return result
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'task' as const,
    id: 'task_kingston_1',
    uid: 'task_kingston_1@work.876',
    organizationId: 'org_kingston_1',
    title: 'Follow up, with comma; and \\ backslash\nnewline',
    description: null,
    status: 'OPEN' as const,
    importance: 'NORMAL' as const,
    assigneeId: null,
    startAt: Math.floor(new Date('2026-09-01T09:00:00.000Z').getTime() / 1000),
    startTimeZone: 'America/Jamaica',
    dueAt: Math.floor(new Date('2026-09-02T09:00:00.000Z').getTime() / 1000),
    dueTimeZone: 'America/Jamaica',
    completedAt: null,
    percentComplete: 0,
    recurrenceRuleId: null,
    assignments: [],
    createdAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    updatedAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    ...overrides,
  }
}
function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'event' as const,
    id: 'event_mandeville_1',
    uid: 'event_mandeville_1@work.876',
    organizationId: 'org_kingston_1',
    calendarId: 'cal_1',
    title: 'Sprint Review',
    description: null,
    location: null,
    status: 'CONFIRMED' as const,
    busyStatus: 'BUSY' as const,
    allDay: false,
    startAt: Math.floor(new Date('2026-09-01T09:00:00.000Z').getTime() / 1000),
    endAt: Math.floor(new Date('2026-09-01T10:00:00.000Z').getTime() / 1000),
    timeZone: 'America/Jamaica',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_kingston_1',
    createdAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    updatedAt: Math.floor(
      new Date('2026-08-30T12:00:00.000Z').getTime() / 1000
    ),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tasks.list).mockResolvedValue({ data: [], hasMore: false } as never)
  vi.mocked(events.list).mockResolvedValue({
    data: [],
    hasMore: false,
  } as never)
  vi.mocked(alerts.list).mockResolvedValue({
    data: [],
    hasMore: false,
  } as never)
})

describe('Work exports service', () => {
  it('includes both tasks and events when both are requested', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    vi.mocked(events.list).mockResolvedValue({
      data: [eventRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
      includeEvents: true,
    })
    expect(exportOf(result).content).toContain('BEGIN:VEVENT')
    expect(exportOf(result).content).toContain('BEGIN:VTODO')
  })

  it('includeTasks false excludes tasks', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [eventRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: false,
    })
    expect(exportOf(result).content).not.toContain('BEGIN:VTODO')
    expect(exportOf(result).content).toContain('BEGIN:VEVENT')
    expect(tasks.list).not.toHaveBeenCalled()
  })

  it('includeEvents false excludes events', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeEvents: false,
      includeTasks: true,
    })
    expect(exportOf(result).content).not.toContain('BEGIN:VEVENT')
    expect(exportOf(result).content).toContain('BEGIN:VTODO')
    expect(events.list).not.toHaveBeenCalled()
  })

  it('taskListId true implies includeTasks', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    await service.create('org_kingston_1', {
      format: 'ics',
      taskListId: 'tasklist_1',
    })
    expect(tasks.list).toHaveBeenCalled()
  })

  it('calendarId alone implies includeEvents when includeTasks false', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [eventRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      calendarId: 'cal_1',
      includeTasks: false,
    })
    expect(exportOf(result).content).toContain('BEGIN:VEVENT')
  })

  it('empty export still produces valid VCALENDAR envelope', async () => {
    const result = await service.create('org_kingston_1', { format: 'ics' })
    expect(exportOf(result).content).toContain('BEGIN:VCALENDAR')
    expect(exportOf(result).content).toContain('END:VCALENDAR')
    expect(exportOf(result).object).toBe('calendar_export')
    expect(exportOf(result).format).toBe('ics')
    expect(exportOf(result).filename).toBe('876-work.ics')
  })

  it('ics escapes comma semicolon backslash and newline in summary', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    expect(exportOf(result).content).toContain('\\,')
    expect(exportOf(result).content).toContain('\\;')
    expect(exportOf(result).content).toContain('\\\\')
    expect(exportOf(result).content).toContain('\\n')
  })

  it('all-day event serializes as DATE not DATE-TIME', async () => {
    const allDay = eventRow({
      allDay: true,
      startAt: null,
      endAt: null,
      timeZone: null,
      startDate: '2026-09-02',
      endDate: '2026-09-03',
    })
    vi.mocked(events.list).mockResolvedValue({
      data: [allDay],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', { format: 'ics' })
    expect(exportOf(result).content).toContain('DTSTART;VALUE=DATE:20260902')
    expect(exportOf(result).content).toContain('DTEND;VALUE=DATE:20260903')
    expect(exportOf(result).content).not.toContain('DTSTART:20260902T')
  })

  it('timed event serializes as DATE-TIME', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [eventRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', { format: 'ics' })
    expect(exportOf(result).content).toMatch(/DTSTART(;TZID=[^:]+)?:/)
    expect(exportOf(result).content).toMatch(/DTEND(;TZID=[^:]+)?:/)
  })

  it('RRULE line appears for recurring task', async () => {
    vi.mocked(recurrence.retrieve).mockResolvedValue({
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    } as never)
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow({ recurrenceRuleId: 'rrule_1' })],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    expect(exportOf(result).content).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO')
  })

  it('VALARM appears for scheduled alert', async () => {
    const at = Math.floor(new Date('2026-09-01T08:00:00.000Z').getTime() / 1000)
    vi.mocked(alerts.list).mockResolvedValue({
      data: [
        {
          triggerType: 'ABSOLUTE',
          triggerAt: at,
          offsetSeconds: null,
          action: 'NOTIFICATION',
          status: 'SCHEDULED',
        },
      ],
      hasMore: false,
    } as never)
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    expect(exportOf(result).content).toContain('BEGIN:VALARM')
    expect(exportOf(result).content).toContain('TRIGGER')
  })

  it('jscalendar format returns json contentType', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'jscalendar',
      includeTasks: true,
    })
    expect(exportOf(result).contentType).toBe(
      'application/jscalendar+json; charset=utf-8'
    )
    expect(() => JSON.parse(exportOf(result).content)).not.toThrow()
    expect(exportOf(result).filename).toBe('876-work.json')
  })

  it('jscalendar entries keyed by uid', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow({ uid: 'task_uid@work.876' })],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'jscalendar',
      includeTasks: true,
    })
    const parsed = JSON.parse(exportOf(result).content)
    expect(parsed.entries['task_uid@work.876']).toBeDefined()
  })

  it('propagates task list error as value', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.list).mockResolvedValue(err as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    expect(result).toEqual(err)
  })

  it('propagates event list error as value', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [],
      hasMore: false,
    } as never)
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(events.list).mockResolvedValue(err as never)
    const result = await service.create('org_kingston_1', { format: 'ics' })
    expect(result).toEqual(err)
  })

  it('ics content uses CRLF line endings', async () => {
    const result = await service.create('org_kingston_1', { format: 'ics' })
    expect(exportOf(result).content).toContain('\r\n')
  })

  it('accepts a jscalendar export payload via the real schema', () => {
    const parsed = createWorkCalendarExportInputSchema.parse({
      format: 'jscalendar',
      calendarId: 'cal_1',
      taskListId: 'tasklist_1',
      includeTasks: true,
      includeEvents: false,
    })
    expect(parsed).toEqual({
      format: 'jscalendar',
      calendarId: 'cal_1',
      taskListId: 'tasklist_1',
      includeTasks: true,
      includeEvents: false,
    })
  })

  it('rejects an export payload with an unknown format via the real schema', () => {
    expect(() =>
      createWorkCalendarExportInputSchema.parse({ format: 'csv' })
    ).toThrow()
  })

  it('VTODO carries STATUS, PRIORITY, and PERCENT-COMPLETE lines', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [
        taskRow({ status: 'DONE', importance: 'URGENT', percentComplete: 100 }),
      ],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    const content = exportOf(result).content
    expect(content).toContain('STATUS:COMPLETED')
    expect(content).toContain('PRIORITY:1')
    expect(content).toContain('PERCENT-COMPLETE:100')
  })

  it('VEVENT carries STATUS and TRANSP derived from busyStatus', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [eventRow({ status: 'TENTATIVE', busyStatus: 'FREE' })],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', { format: 'ics' })
    const content = exportOf(result).content
    expect(content).toContain('STATUS:TENTATIVE')
    expect(content).toContain('TRANSP:TRANSPARENT')
  })

  it('VTODO serializes DTSTART and DUE with TZID in the event time zone', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow()],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    const content = exportOf(result).content
    expect(content).toContain('DTSTART;TZID=America/Jamaica:')
    expect(content).toContain('DUE;TZID=America/Jamaica:')
  })

  it('skips DTSTART and DUE when the time zone is absent even though dates exist', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [
        taskRow({
          startAt: 1_788_282_000,
          startTimeZone: null,
          dueAt: 1_788_291_600,
          dueTimeZone: null,
        }),
      ],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    const content = exportOf(result).content
    expect(content).not.toContain('DTSTART;')
    expect(content).not.toContain('DUE;')
  })

  it('VEVENT carries ATTENDEE lines for participants', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [
        eventRow({
          participants: [
            {
              id: 'part_1',
              kind: 'EMAIL',
              email: 'claudia@example.test',
              name: null,
              role: 'REQUIRED',
              status: 'ACCEPTED',
              participantId: null,
            },
            {
              id: 'part_2',
              kind: 'USER',
              participantId: 'user_kingston_1',
              email: null,
              name: null,
              role: 'CHAIR',
              status: 'NEEDS_ACTION',
            },
          ],
        }),
      ],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', { format: 'ics' })
    const content = exportOf(result).content
    expect(content).toContain(
      'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:claudia@example.test'
    )
    expect(content).toContain(
      'ATTENDEE;ROLE=CHAIR;PARTSTAT=NEEDS-ACTION:urn:876:user:user_kingston_1'
    )
  })

  it('emits X-876-CONTEXT for contextual events', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [
        eventRow({
          context: { service: 'crm', resource: 'request', id: 'req_1' },
        }),
      ],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', { format: 'ics' })
    expect(exportOf(result).content).toContain(
      'X-876-CONTEXT:crm/request/req_1'
    )
  })

  it('emits COMPLETED for finished tasks', async () => {
    const completedAt = Math.floor(
      new Date('2026-09-01T10:00:00.000Z').getTime() / 1000
    )
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow({ status: 'DONE', completedAt })],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'ics',
      includeTasks: true,
    })
    expect(exportOf(result).content).toContain(
      `COMPLETED:${new Date(completedAt * 1000)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z')}`
    )
  })

  it('jscalendar tasks use progress derived from status', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [taskRow({ status: 'IN_PROGRESS' })],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'jscalendar',
      includeTasks: true,
    })
    const parsed = JSON.parse(exportOf(result).content)
    expect(parsed.entries['task_kingston_1@work.876']).toMatchObject({
      '@type': 'Task',
      progress: 'in-process',
    })
  })

  it('jscalendar events use showWithoutTime for all-day events', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [
        eventRow({
          allDay: true,
          startAt: null,
          endAt: null,
          timeZone: null,
          startDate: '2026-09-02',
          endDate: '2026-09-03',
        }),
      ],
      hasMore: false,
    } as never)
    const result = await service.create('org_kingston_1', {
      format: 'jscalendar',
    })
    const parsed = JSON.parse(exportOf(result).content)
    expect(parsed.entries['event_mandeville_1@work.876']).toMatchObject({
      '@type': 'Event',
      showWithoutTime: true,
      start: '2026-09-02',
    })
  })
})
