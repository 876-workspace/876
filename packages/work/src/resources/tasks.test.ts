import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTasksResource } from './tasks'
import type { WorkRuntime } from '../runtime'

describe('createTasksResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const tasks = createTasksResource(runtime)

  function createTaskFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'task',
      id: 'task_kin_01',
      uid: 'task_kin_01@work.876',
      organizationId: 'org_kingston_central',
      listId: 'tasklist_kin_01',
      parentTaskId: null,
      context: { service: 'crm', resource: 'request', id: 'req_kin_01' },
      links: [],
      title: 'Inspect Depot Generator',
      description: null,
      status: 'OPEN',
      importance: 'NORMAL',
      priorityId: null,
      assigneeId: 'usr_tariq_01',
      assignments: [],
      startAt: null,
      startTimeZone: null,
      dueAt: 1_788_271_200,
      dueTimeZone: 'America/Jamaica',
      estimatedDuration: null,
      percentComplete: 0,
      recurrenceRuleId: null,
      completedAt: null,
      completedBy: null,
      isOverdue: false,
      sortOrder: 0,
      createdBy: 'usr_tariq_01',
      createdAt: 1_788_080_400,
      updatedAt: 1_788_080_400,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists tasks with query filters and CRM context parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createTaskFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/tasks',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await tasks.list('org_kingston_central', {
      context: { service: 'crm', resource: 'request', id: 'req_kin_01' },
      listId: 'tasklist_kin_01',
      assigneeId: 'usr_tariq_01',
      status: 'OPEN',
      limit: 25,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks?context_service=crm&context_resource=request&context_id=req_kin_01&list_id=tasklist_kin_01&assignee_id=usr_tariq_01&status=OPEN&limit=25',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('retrieves single task by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createTaskFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await tasks.retrieve('org_kingston_central', 'task_kin_01')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('task_kin_01')
  })

  it('creates task with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createTaskFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      title: 'Inspect Depot Generator',
      context: { service: 'crm', resource: 'request', id: 'req_kin_01' },
      createdBy: 'usr_tariq_01',
    }
    const result = await tasks.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.title).toBe('Inspect Depot Generator')
  })

  it('updates task status and completion via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createTaskFixture({
            status: 'DONE',
            percentComplete: 100,
            completedAt: 1_788_084_000,
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await tasks.update('org_kingston_central', 'task_kin_01', {
      status: 'DONE',
      percentComplete: 100,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE', percentComplete: 100 }),
      })
    )
    expect(result.data?.status).toBe('DONE')
  })

  it('deletes task via DELETE with deletedBy payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'task', id: 'task_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await tasks.delete(
      'org_kingston_central',
      'task_kin_01',
      'usr_tariq_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ deletedBy: 'usr_tariq_01' }),
      })
    )
    expect(result).toEqual({
      data: { object: 'task', id: 'task_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: 'work/task-not-found', message: 'Task not found.' },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await tasks.retrieve('org_kingston_central', 'task_missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'work/task-not-found', message: 'Task not found.' },
    })
  })
})
