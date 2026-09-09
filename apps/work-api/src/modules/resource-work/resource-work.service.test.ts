import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../events/index.js', () => ({ list: vi.fn() }))
vi.mock('../reminders/index.js', () => ({ list: vi.fn() }))
vi.mock('../tasks/index.js', () => ({ list: vi.fn() }))

import * as events from '../events/index.js'
import * as reminders from '../reminders/index.js'
import * as tasks from '../tasks/index.js'
import * as service from './resource-work.service.js'

const ORG = 'org_1'
const CONTEXT = {
  service: 'billing',
  resource: 'invoice',
  id: 'inv_1',
} as const
const FROM = 1_800_000_000
const TO = FROM + 86_400

function task(id: string, overrides: Record<string, unknown> = {}) {
  return {
    object: 'task',
    id,
    status: 'OPEN',
    startAt: FROM + 100,
    dueAt: FROM + 200,
    assigneeId: 'user_other',
    ...overrides,
  }
}

function reminder(id: string, overrides: Record<string, unknown> = {}) {
  return {
    object: 'reminder',
    id,
    status: 'SCHEDULED',
    remindAt: FROM + 300,
    userId: 'user_other',
    ...overrides,
  }
}

function event(id: string, overrides: Record<string, unknown> = {}) {
  return {
    object: 'event',
    id,
    calendarId: 'cal_other',
    allDay: false,
    startAt: FROM + 400,
    endAt: FROM + 500,
    startDate: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tasks.list).mockResolvedValue({ data: [], hasMore: false } as never)
  vi.mocked(reminders.list).mockResolvedValue({
    data: [],
    hasMore: false,
  } as never)
  vi.mocked(events.list).mockResolvedValue({ data: [], hasMore: false } as never)
})

describe('Work resource-work service', () => {
  it('queries every Work resource by the exact opaque context', async () => {
    await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(tasks.list).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ context: CONTEXT, limit: 100 })
    )
    expect(reminders.list).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ context: CONTEXT, limit: 100 })
    )
    expect(events.list).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ context: CONTEXT, from: FROM, to: TO, limit: 100 })
    )
  })

  it('keeps resource work resource-centric instead of filtering to an assignee', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [task('task_other')],
      hasMore: false,
    } as never)

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(tasks.list).toHaveBeenCalledWith(
      ORG,
      expect.not.objectContaining({ assigneeId: expect.anything() })
    )
    expect('tasks' in result ? result.tasks.map((item) => item.id) : []).toEqual([
      'task_other',
    ])
  })

  it('returns only scheduled reminders inside the requested range', async () => {
    vi.mocked(reminders.list).mockResolvedValue({
      data: [
        reminder('inside'),
        reminder('dismissed', { status: 'DISMISSED' }),
        reminder('outside', { remindAt: TO }),
      ],
      hasMore: false,
    } as never)

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect('reminders' in result ? result.reminders.map((item) => item.id) : []).toEqual([
      'inside',
    ])
  })

  it('returns overdue open tasks separately from the current range', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [
        task('overdue', { startAt: null, dueAt: FROM - 1 }),
        task('done', { startAt: null, dueAt: FROM - 1, status: 'DONE' }),
      ],
      hasMore: false,
    } as never)

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(
      'overdueTasks' in result
        ? result.overdueTasks.map((item) => item.id)
        : []
    ).toEqual(['overdue'])
  })

  it('returns the canonical externalId projection without copying host schema', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [event('event_1')],
      hasMore: false,
    } as never)

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(result).toMatchObject({
      object: 'resource_work',
      organizationId: ORG,
      context: {
        service: 'billing',
        resource: 'invoice',
        externalId: 'inv_1',
      },
      events: [{ id: 'event_1' }],
    })
    expect(result).not.toHaveProperty('invoice')
    expect(result).not.toHaveProperty('customer')
  })
})
