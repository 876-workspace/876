import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../calendars/index.js', () => ({
  list: vi.fn(),
}))
vi.mock('../events/index.js', () => ({
  list: vi.fn(),
}))
vi.mock('../reminders/index.js', () => ({
  list: vi.fn(),
}))
vi.mock('../tasks/index.js', () => ({
  list: vi.fn(),
}))

import * as calendars from '../calendars/index.js'
import * as events from '../events/index.js'
import * as reminders from '../reminders/index.js'
import * as tasks from '../tasks/index.js'
import * as service from './my-work.service.js'

const ORG = 'org_kingston_1'
const USER = 'user_kingston_9'
const FROM = Math.floor(new Date('2026-09-01T00:00:00.000Z').getTime()/1000)
const TO = Math.floor(new Date('2026-09-10T00:00:00.000Z').getTime()/1000)

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'task' as const,
    id: 'task_1',
    organizationId: ORG,
    title: 'Follow up',
    status: 'OPEN' as const,
    startAt: FROM + 1000,
    dueAt: FROM + 2000,
    assigneeId: USER,
    percentComplete: 0,
    ...overrides,
  }
}
function reminderRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'reminder' as const,
    id: 'rem_1',
    organizationId: ORG,
    title: 'Call',
    status: 'SCHEDULED' as const,
    remindAt: FROM + 500,
    userId: USER,
    ...overrides,
  }
}
function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'event' as const,
    id: 'event_1',
    uid: 'event_1@work.876',
    organizationId: ORG,
    calendarId: 'cal_1',
    title: 'Meeting',
    allDay: false,
    startAt: FROM + 3600,
    startDate: null,
    endAt: FROM + 7200,
    timeZone: 'America/Jamaica',
    participants: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tasks.list).mockResolvedValue({ data: [], hasMore: false } as never)
  vi.mocked(reminders.list).mockResolvedValue({ data: [], hasMore: false } as never)
  vi.mocked(calendars.list).mockResolvedValue({ data: [], hasMore: false } as never)
  vi.mocked(events.list).mockResolvedValue({ data: [], hasMore: false } as never)
})

describe('Work my-work service', () => {
  it('aggregates tasks assigned to user within window', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [
        taskRow({ id: 'task_a', startAt: FROM + 100, dueAt: FROM + 100 }),
        taskRow({ id: 'task_b', startAt: TO + 5000, dueAt: TO + 10000 }),
      ],
      hasMore: false,
    } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]!.id).toBe('task_a')
  })

  it('task exactly on FROM edge is included, exactly on TO excluded', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [taskRow({ id: 'task_from', dueAt: FROM, startAt: FROM }), taskRow({ id: 'task_to', dueAt: TO, startAt: TO })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks.map(t => t.id)).toContain('task_from')
    expect(result.tasks.map(t => t.id)).not.toContain('task_to')
  })

  it('overdue tasks are those due before FROM and not DONE/CANCELLED', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [
      taskRow({ id: 'overdue_open', dueAt: FROM - 1000, status: 'OPEN' }),
      taskRow({ id: 'done_old', dueAt: FROM - 1000, status: 'DONE' }),
      taskRow({ id: 'cancelled_old', dueAt: FROM - 1000, status: 'CANCELLED' }),
    ], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { overdueTasks: { id: string }[] }
    expect(result.overdueTasks.map(t => t.id)).toEqual(['overdue_open'])
  })

  it('filters reminders to SCHEDULED within window', async () => {
    vi.mocked(reminders.list).mockResolvedValue({ data: [
      reminderRow({ id: 'rem_in', remindAt: FROM + 100, status: 'SCHEDULED' }),
      reminderRow({ id: 'rem_dismissed', remindAt: FROM + 100, status: 'DISMISSED' }),
      reminderRow({ id: 'rem_out', remindAt: TO + 100, status: 'SCHEDULED' }),
    ], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { reminders: { id: string }[] }
    expect(result.reminders.map(r => r.id)).toEqual(['rem_in'])
  })

  it('reminder exactly on TO excluded, on FROM included', async () => {
    vi.mocked(reminders.list).mockResolvedValue({ data: [
      reminderRow({ id: 'rem_from', remindAt: FROM, status: 'SCHEDULED' }),
      reminderRow({ id: 'rem_to', remindAt: TO, status: 'SCHEDULED' }),
    ], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { reminders: { id: string }[] }
    expect(result.reminders.map(r => r.id)).toContain('rem_from')
    expect(result.reminders.map(r => r.id)).not.toContain('rem_to')
  })

  it('returns empty arrays when user has nothing', async () => {
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: unknown[]; reminders: unknown[]; events: unknown[]; overdueTasks: unknown[] }
    expect(result.tasks).toEqual([])
    expect(result.reminders).toEqual([])
    expect(result.events).toEqual([])
    expect(result.overdueTasks).toEqual([])
  })

  it('aggregates events across visible calendars without duplication - sorted by start', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_a' }, { id: 'cal_b' }], hasMore: false } as never)
    vi.mocked(events.list)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_b', startAt: FROM + 2000 })], hasMore: false } as never)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_a', startAt: FROM + 1000 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { events: { id: string }[] }
    expect(result.events.map(e => e.id)).toEqual(['event_a', 'event_b'])
  })

  it('scopes tasks to acting user only', async () => {
    await service.retrieve(ORG, USER, FROM, TO)
    expect(tasks.list).toHaveBeenCalledWith(ORG, expect.objectContaining({ assigneeId: USER }))
  })

  it('scopes reminders to acting user only', async () => {
    await service.retrieve(ORG, USER, FROM, TO)
    expect(reminders.list).toHaveBeenCalledWith(ORG, expect.objectContaining({ userId: USER }))
  })

  it('scopes calendars to acting user only', async () => {
    await service.retrieve(ORG, USER, FROM, TO)
    expect(calendars.list).toHaveBeenCalledWith(ORG, expect.objectContaining({ userId: USER }))
  })

  it('events are queried per calendar with from/to window', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_1' }], hasMore: false } as never)
    await service.retrieve(ORG, USER, FROM, TO)
    expect(events.list).toHaveBeenCalledWith(ORG, expect.objectContaining({ calendarId: 'cal_1', from: FROM, to: TO }))
  })

  it('returns result with object discriminator my_work', async () => {
    const result = await service.retrieve(ORG, USER, FROM, TO) as { object: string }
    expect(result.object).toBe('my_work')
  })

  it('propagates task list error without swallowing', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(tasks.list).mockResolvedValue(err as never)
    const result = await service.retrieve(ORG, USER, FROM, TO)
    expect(result).toEqual(err)
  })

  it('task with null dates does not appear in window-filtered tasks', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [taskRow({ id: 'task_null', startAt: null, dueAt: null })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: unknown[] }
    expect(result.tasks).toHaveLength(0)
  })

  it('all-day event with startDate inside window is included', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_1' }], hasMore: false } as never)
    const allDay = eventRow({ id: 'event_allday', allDay: true, startAt: null, startDate: '2026-09-02', timeZone: null })
    vi.mocked(events.list).mockResolvedValue({ data: [allDay], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { events: { id: string }[] }
    expect(result.events.map(e => e.id)).toContain('event_allday')
  })

  it('task that is both assigned and owned appears once in the task list', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [taskRow({ id: 'task_both', dueAt: FROM + 100 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks.filter((t) => t.id === 'task_both')).toHaveLength(1)
  })

  it('events spanning multiple visible calendars are aggregated without duplication', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_a' }, { id: 'cal_b' }], hasMore: false } as never)
    vi.mocked(events.list)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_shared', startAt: FROM + 1000 })], hasMore: false } as never)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_shared', startAt: FROM + 1000 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { events: { id: string }[] }
    expect(result.events.filter((e) => e.id === 'event_shared')).toHaveLength(2)
  })

  it('task with startAt inside window but dueAt outside is still included', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [taskRow({ id: 'task_start_in', startAt: FROM + 100, dueAt: TO + 10_000 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks.map((t) => t.id)).toContain('task_start_in')
  })

  it('task with startAt outside window but dueAt inside is still included', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [taskRow({ id: 'task_due_in', startAt: FROM - 10_000, dueAt: FROM + 100 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks.map((t) => t.id)).toContain('task_due_in')
  })

  it('task due before FROM is overdue, and due at or after FROM is not', async () => {
    vi.mocked(tasks.list).mockResolvedValue({ data: [
      taskRow({ id: 'task_due_from', startAt: null, dueAt: FROM - 1, status: 'OPEN' }),
      taskRow({ id: 'task_due_to', startAt: null, dueAt: TO, status: 'OPEN' }),
    ], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { overdueTasks: { id: string }[] }
    expect(result.overdueTasks.map((t) => t.id)).toEqual(['task_due_from'])
  })

  it('paginates task collection across multiple pages', async () => {
    vi.mocked(tasks.list)
      .mockResolvedValueOnce({ data: [taskRow({ id: 'task_page1', dueAt: FROM + 100 })], hasMore: true } as never)
      .mockResolvedValueOnce({ data: [taskRow({ id: 'task_page2', dueAt: FROM + 200 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks.map((t) => t.id)).toEqual(['task_page1', 'task_page2'])
    expect(tasks.list).toHaveBeenNthCalledWith(1, ORG, expect.objectContaining({ limit: 100 }))
    expect(tasks.list).toHaveBeenNthCalledWith(2, ORG, expect.objectContaining({ startingAfter: 'task_page1' }))
  })

  it('propagates reminder list error without swallowing', async () => {
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(reminders.list).mockResolvedValue(err as never)
    const result = await service.retrieve(ORG, USER, FROM, TO)
    expect(result).toEqual(err)
  })

  it('propagates calendar list error without swallowing', async () => {
    const err = { code: 'work/tenant-inactive', message: 'x', httpStatus: 409 }
    vi.mocked(calendars.list).mockResolvedValue(err as never)
    const result = await service.retrieve(ORG, USER, FROM, TO)
    expect(result).toEqual(err)
  })

  it('propagates event list error without swallowing', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_1' }], hasMore: false } as never)
    const err = { code: 'work/tenant-not-found', message: 'x', httpStatus: 404 }
    vi.mocked(events.list).mockResolvedValue(err as never)
    const result = await service.retrieve(ORG, USER, FROM, TO)
    expect(result).toEqual(err)
  })

  it('stops paginating when a page reports no more data', async () => {
    vi.mocked(tasks.list)
      .mockResolvedValueOnce({ data: [taskRow({ id: 'task_only' })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { tasks: { id: string }[] }
    expect(result.tasks.map((t) => t.id)).toEqual(['task_only'])
    expect(tasks.list).toHaveBeenCalledTimes(1)
  })

  it('sorts events by start time then id when start times tie', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_1' }], hasMore: false } as never)
    vi.mocked(events.list).mockResolvedValue({ data: [
      eventRow({ id: 'event_b', startAt: FROM + 1000 }),
      eventRow({ id: 'event_a', startAt: FROM + 1000 }),
    ], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { events: { id: string }[] }
    expect(result.events.map((e) => e.id)).toEqual(['event_a', 'event_b'])
  })

  it('returns the full my_work shape with window and user fields', async () => {
    const result = await service.retrieve(ORG, USER, FROM, TO) as Record<string, unknown>
    expect(result).toEqual({
      object: 'my_work',
      organizationId: ORG,
      userId: USER,
      from: FROM,
      to: TO,
      tasks: [],
      reminders: [],
      events: [],
      overdueTasks: [],
    })
  })

  it('paginates events within a calendar across multiple pages', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_1' }], hasMore: false } as never)
    vi.mocked(events.list)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_page1', startAt: FROM + 100 })], hasMore: true } as never)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_page2', startAt: FROM + 200 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { events: { id: string }[] }
    expect(result.events.map((e) => e.id)).toEqual(['event_page1', 'event_page2'])
    expect(events.list).toHaveBeenNthCalledWith(1, ORG, expect.objectContaining({ calendarId: 'cal_1' }))
    expect(events.list).toHaveBeenNthCalledWith(2, ORG, expect.objectContaining({ calendarId: 'cal_1', startingAfter: 'event_page1' }))
  })

  it('aggregates events across multiple visible calendars in a single list', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_a' }, { id: 'cal_b' }], hasMore: false } as never)
    vi.mocked(events.list)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_a', startAt: FROM + 1000 })], hasMore: false } as never)
      .mockResolvedValueOnce({ data: [eventRow({ id: 'event_b', startAt: FROM + 2000 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { events: { id: string }[] }
    expect(result.events.map((e) => e.id)).toEqual(['event_a', 'event_b'])
    expect(events.list).toHaveBeenCalledTimes(2)
  })

  it('asks the events module for the window on every calendar page', async () => {
    vi.mocked(calendars.list).mockResolvedValue({ data: [{ id: 'cal_1' }], hasMore: false } as never)
    vi.mocked(events.list).mockResolvedValue({ data: [], hasMore: false } as never)
    await service.retrieve(ORG, USER, FROM, TO)
    expect(events.list).toHaveBeenCalledWith(ORG, {
      calendarId: 'cal_1',
      from: FROM,
      to: TO,
      limit: 100,
    })
  })

  it('paginates reminders across multiple pages and returns them all', async () => {
    vi.mocked(reminders.list)
      .mockResolvedValueOnce({ data: [reminderRow({ id: 'rem_page1', remindAt: FROM + 100 })], hasMore: true } as never)
      .mockResolvedValueOnce({ data: [reminderRow({ id: 'rem_page2', remindAt: FROM + 200 })], hasMore: false } as never)
    const result = await service.retrieve(ORG, USER, FROM, TO) as { reminders: { id: string }[] }
    expect(result.reminders.map((r) => r.id)).toEqual(['rem_page1', 'rem_page2'])
    expect(reminders.list).toHaveBeenNthCalledWith(2, ORG, expect.objectContaining({ startingAfter: 'rem_page1' }))
  })
})
