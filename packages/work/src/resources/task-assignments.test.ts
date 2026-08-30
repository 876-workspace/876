import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTaskAssignmentsResource } from './task-assignments'
import type { WorkRuntime } from '../runtime'

describe('createTaskAssignmentsResource', () => {
  const fetchMock = vi.fn()
  const runtime: WorkRuntime = {
    baseUrl: 'https://work.example.test',
    credential: { header: 'x-876-api-key', value: '876_app_secret_crm' },
    fetch: fetchMock as unknown as typeof globalThis.fetch,
  }
  const taskAssignments = createTaskAssignmentsResource(runtime)

  function createAssignmentFixture(overrides: Record<string, unknown> = {}) {
    return {
      object: 'task_assignment',
      id: 'assign_kin_01',
      taskId: 'task_kin_01',
      targetType: 'USER',
      assigneeId: 'usr_tariq_01',
      role: 'OWNER',
      status: 'PENDING',
      assignedBy: 'usr_supervisor_01',
      assignedAt: 1_788_080_400,
      respondedAt: null,
      completedAt: null,
      delegatedFromAssignmentId: null,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists task assignments with organization and task path', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [createAssignmentFixture()],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_kingston_central/tasks/task_kin_01/assignments',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskAssignments.list(
      'org_kingston_central',
      'task_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/assignments',
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

  it('creates task assignment with POST payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createAssignmentFixture(),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const input = {
      targetType: 'USER' as const,
      assigneeId: 'usr_tariq_01',
      role: 'OWNER' as const,
      assignedBy: 'usr_supervisor_01',
    }
    const result = await taskAssignments.create(
      'org_kingston_central',
      'task_kin_01',
      input
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/assignments',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      })
    )
    expect(result.data?.assigneeId).toBe('usr_tariq_01')
  })

  it('updates task assignment status via PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: createAssignmentFixture({
            status: 'ACCEPTED',
            respondedAt: 1_788_084_000,
          }),
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskAssignments.update(
      'org_kingston_central',
      'task_kin_01',
      'assign_kin_01',
      { status: 'ACCEPTED' }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/assignments/assign_kin_01',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })
    )
    expect(result.data?.status).toBe('ACCEPTED')
  })

  it('deletes task assignment via DELETE', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'task_assignment',
            id: 'assign_kin_01',
            deleted: true,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskAssignments.delete(
      'org_kingston_central',
      'task_kin_01',
      'assign_kin_01'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_kingston_central/tasks/task_kin_01/assignments/assign_kin_01',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({
      data: { object: 'task_assignment', id: 'assign_kin_01', deleted: true },
      error: null,
    })
  })

  it('encodes path parameters safely', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: null,
            url: '',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await taskAssignments.list('org/1', 'task/1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org%2F1/tasks/task%2F1/assignments',
      expect.any(Object)
    )
  })

  it('propagates error response without throwing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: {
            code: 'work/task-assignment-not-found',
            message: 'Assignment not found.',
          },
        }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    )

    const result = await taskAssignments.delete(
      'org_kingston_central',
      'task_kin_01',
      'assign_missing'
    )

    expect(result).toEqual({
      data: null,
      error: {
        code: 'work/task-assignment-not-found',
        message: 'Assignment not found.',
      },
    })
  })
})
