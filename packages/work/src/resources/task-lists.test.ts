import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTaskListsResource } from './task-lists'
import type { WorkRuntime } from '../runtime'

describe('createTaskListsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-internal-key', value: 'work-internal-key' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const taskLists = createTaskListsResource(runtime)

  function createTaskListFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'task_list',
      id: 'tasklist_kin_01',
      organizationId: 'org_kingston_central',
      name: 'General Tasks',
      description: 'Default depot task list',
      ownerUserId: null,
      isDefault: true,
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

  it('lists task lists with query filter parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createTaskListFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/task-lists',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLists.list('org_kingston_central', {
      ownerUserId: 'usr_tariq_01',
      limit: 15,
      startingAfter: 'tl_anchor',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/task-lists?owner_user_id=usr_tariq_01&limit=15&starting_after=tl_anchor',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-internal-key': 'work-internal-key',
        }),
      })
    )
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()
  })

  it('retrieves single task list by id', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createTaskListFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLists.retrieve(
      'org_kingston_central',
      'tasklist_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/task-lists/tasklist_kin_01',
      expect.objectContaining({ method: 'GET' })
    )
    expect(result.data?.id).toBe('tasklist_kin_01')
  })

  it('creates task list with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createTaskListFixture({
            isDefault: false,
            name: 'Custom List',
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      name: 'Custom List',
      description: 'Custom list description',
      createdBy: 'usr_tariq_01',
    }
    const result = await taskLists.create('org_kingston_central', input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/task-lists',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.name).toBe('Custom List')
  })

  it('updates task list via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createTaskListFixture({ name: 'Renamed General' }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLists.update(
      'org_kingston_central',
      'tasklist_kin_01',
      {
        name: 'Renamed General',
      }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/task-lists/tasklist_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Renamed General' }),
      })
    )
    expect(result.data?.name).toBe('Renamed General')
  })

  it('deletes task list via DELETE with deletedBy payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { object: 'task_list', id: 'tasklist_kin_01', deleted: true },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLists.delete(
      'org_kingston_central',
      'tasklist_kin_01',
      'usr_tariq_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/task-lists/tasklist_kin_01',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ deletedBy: 'usr_tariq_01' }),
      })
    )
    expect(result).toEqual({
      data: { object: 'task_list', id: 'tasklist_kin_01', deleted: true },
      error: null,
    })
  })

  it('propagates error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/task-list-not-found',
            message: 'Task list not found.',
          },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskLists.retrieve(
      'org_kingston_central',
      'list_missing'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/task-list-not-found',
        message: 'Task list not found.',
      },
    })
  })
})
