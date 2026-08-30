import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ workRequest: vi.fn() }))

vi.mock('../request', () => mocks)

import { createRemindersResource } from './reminders'
import { createTasksResource } from './tasks'
import {
  workReminderListSchema,
  workReminderSchema,
  workTaskListSchema,
  workTaskSchema,
} from '../types'

const runtime = {
  baseUrl: 'https://work.example.test',
  credential: { header: 'x-internal-key' as const, value: 'work-internal-key' },
  fetch: vi.fn() as unknown as typeof globalThis.fetch,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.workRequest.mockResolvedValue({ data: null, error: null })
})

describe('Work resource client paths', () => {
  it('retrieves a task through its item path', async () => {
    const resource = createTasksResource(runtime)

    await resource.retrieve('org_876', 'task_876/one')

    expect(mocks.workRequest).toHaveBeenCalledTimes(1)
    expect(mocks.workRequest).toHaveBeenCalledWith(
      runtime,
      {
        method: 'GET',
        path: '/v1/organizations/org_876/tasks/task_876%2Fone',
      },
      workTaskSchema
    )
  })

  it('threads task pagination through the list query', async () => {
    const resource = createTasksResource(runtime)

    await resource.list('org_876', {
      context: { service: 'crm', resource: 'request', id: 'crm_req_1' },
      priorityId: 'crm_pri_1',
      limit: 25,
      startingAfter: 'task_1',
    })

    expect(mocks.workRequest).toHaveBeenCalledTimes(1)
    expect(mocks.workRequest).toHaveBeenCalledWith(
      runtime,
      {
        method: 'GET',
        path: '/v1/organizations/org_876/tasks?context_service=crm&context_resource=request&context_id=crm_req_1&priority_id=crm_pri_1&limit=25&starting_after=task_1',
      },
      workTaskListSchema
    )
  })

  it('retrieves a reminder through its item path', async () => {
    const resource = createRemindersResource(runtime)

    await resource.retrieve('org_876', 'reminder_876/one')

    expect(mocks.workRequest).toHaveBeenCalledTimes(1)
    expect(mocks.workRequest).toHaveBeenCalledWith(
      runtime,
      {
        method: 'GET',
        path: '/v1/organizations/org_876/reminders/reminder_876%2Fone',
      },
      workReminderSchema
    )
  })

  it('threads reminder pagination through the list query', async () => {
    const resource = createRemindersResource(runtime)

    await resource.list('org_876', {
      context: { service: 'crm', resource: 'request', id: 'crm_req_1' },
      userId: 'usr_1',
      limit: 100,
      endingBefore: 'reminder_2',
    })

    expect(mocks.workRequest).toHaveBeenCalledTimes(1)
    expect(mocks.workRequest).toHaveBeenCalledWith(
      runtime,
      {
        method: 'GET',
        path: '/v1/organizations/org_876/reminders?context_service=crm&context_resource=request&context_id=crm_req_1&user_id=usr_1&limit=100&ending_before=reminder_2',
      },
      workReminderListSchema
    )
  })
})
