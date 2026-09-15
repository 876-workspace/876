import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { cycleListSchema, cycleSchema, deletedSchema } from '../types'
import { createCyclesResource } from './cycles'

describe('cycles resource', () => {
  const resource = createCyclesResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists cycles with project and status filters', async () => {
    await resource.list('org 1')
    await resource.list('org 1', { projectId: 'prj_1', status: 'active' })

    expect(requestMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/cycles',
        signal: undefined,
      },
      cycleListSchema
    )
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/cycles?projectId=prj_1&status=active',
        signal: undefined,
      },
      cycleListSchema
    )
  })

  it('creates a cycle', async () => {
    const input = { name: 'Sprint 1', startsAt: 100, endsAt: 200 }
    await resource.create('org 1', input)

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/cycles',
        body: input,
      }),
      cycleSchema
    )
  })

  it('retrieves a cycle with progress and throughput', async () => {
    await resource.retrieve('org 1', 'cyc/1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org%201/cycles/cyc%2F1',
      }),
      cycleSchema
    )
  })

  it('updates a cycle', async () => {
    await resource.update('org 1', 'cyc_1', { name: 'Sprint 2' })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' }),
      cycleSchema
    )
  })

  it('deletes a cycle', async () => {
    await resource.delete('org 1', 'cyc_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'DELETE' }),
      deletedSchema
    )
  })

  it('assigns issues to a cycle', async () => {
    await resource.assignIssues('org 1', 'cyc_1', { issueIds: ['iss_1'] })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/cycles/cyc_1/issues',
      }),
      cycleSchema
    )
  })

  it('unassigns an issue from a cycle', async () => {
    await resource.unassignIssue('org 1', 'cyc_1', 'iss_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/organizations/org%201/cycles/cyc_1/issues/iss_1',
      }),
      cycleSchema
    )
  })
})
