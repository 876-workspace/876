import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkEventResource, WorkReminder, WorkTask } from '@876/work'

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

function task(id: string, overrides: Partial<WorkTask> = {}): WorkTask {
  return {
    object: 'task',
    id,
    uid: `${id}@work.876`,
    organizationId: ORG,
    listId: 'list_1',
    parentTaskId: null,
    context: CONTEXT,
    links: [],
    title: id,
    description: null,
    status: 'OPEN',
    importance: 'NORMAL',
    priorityId: null,
    assigneeId: 'user_other',
    assignments: [],
    startAt: FROM + 100,
    startTimeZone: null,
    dueAt: FROM + 200,
    dueTimeZone: null,
    estimatedDuration: null,
    percentComplete: 0,
    recurrenceRuleId: null,
    completedAt: null,
    completedBy: null,
    isOverdue: false,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: FROM,
    updatedAt: FROM,
    ...overrides,
  }
}

function reminder(
  id: string,
  overrides: Partial<WorkReminder> = {}
): WorkReminder {
  return {
    object: 'reminder',
    id,
    organizationId: ORG,
    context: CONTEXT,
    title: id,
    note: null,
    status: 'SCHEDULED',
    remindAt: FROM + 300,
    timeZone: null,
    recurrenceRuleId: null,
    userId: 'user_other',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_1',
    createdAt: FROM,
    updatedAt: FROM,
    ...overrides,
  }
}

function event(
  id: string,
  overrides: Partial<WorkEventResource> = {}
): WorkEventResource {
  return {
    object: 'event',
    id,
    uid: `${id}@work.876`,
    organizationId: ORG,
    calendarId: 'cal_other',
    context: CONTEXT,
    title: id,
    description: null,
    location: null,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    allDay: false,
    startAt: FROM + 400,
    endAt: FROM + 500,
    timeZone: 'UTC',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_1',
    createdAt: FROM,
    updatedAt: FROM,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tasks.list).mockResolvedValue({ data: [], hasMore: false })
  vi.mocked(reminders.list).mockResolvedValue({
    data: [],
    hasMore: false,
  })
  vi.mocked(events.list).mockResolvedValue({
    data: [],
    hasMore: false,
  })
})

describe('Work resource-work service', () => {
  it('queries every Work resource concurrently by the exact opaque context', async () => {
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
      expect.objectContaining({
        context: CONTEXT,
        from: FROM,
        to: TO,
        limit: 100,
      })
    )
  })

  it('keeps resource work resource-centric instead of filtering to an assignee', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [task('task_other')],
      hasMore: false,
    })

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(tasks.list).toHaveBeenCalledWith(
      ORG,
      expect.not.objectContaining({ assigneeId: expect.anything() })
    )
    expect(
      'tasks' in result ? result.tasks.map((item) => item.id) : []
    ).toEqual(['task_other'])
  })

  it('returns only scheduled reminders inside the requested range', async () => {
    vi.mocked(reminders.list).mockResolvedValue({
      data: [
        reminder('inside'),
        reminder('dismissed', { status: 'DISMISSED' }),
        reminder('outside', { remindAt: TO }),
      ],
      hasMore: false,
    })

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(
      'reminders' in result ? result.reminders.map((item) => item.id) : []
    ).toEqual(['inside'])
  })

  it('returns overdue open tasks separately from the current range', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [
        task('overdue', { startAt: null, dueAt: FROM - 1 }),
        task('done', { startAt: null, dueAt: FROM - 1, status: 'DONE' }),
      ],
      hasMore: false,
    })

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(
      'overdueTasks' in result ? result.overdueTasks.map((item) => item.id) : []
    ).toEqual(['overdue'])
  })

  it('returns the canonical externalId projection without copying host schema', async () => {
    vi.mocked(events.list).mockResolvedValue({
      data: [event('event_1')],
      hasMore: false,
    })

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

  it('fails with invalid-request instead of silent truncation when exceeding the page limit', async () => {
    vi.mocked(tasks.list).mockResolvedValue({
      data: [task('task_many')],
      hasMore: true,
    })

    const result = await service.retrieve(ORG, CONTEXT, FROM, TO)

    expect(result).toMatchObject({
      code: 'work/invalid-request',
    })
  })
})
