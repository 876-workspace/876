import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { budgetListSchema, budgetSchema, deletedSchema } from '../types'
import { createBudgetsResource } from './budgets'

describe('budgets resource', () => {
  const resource = createBudgetsResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists budgets for a project', async () => {
    await resource.list('org 1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/budgets',
        signal: undefined,
      },
      budgetListSchema
    )
  })

  it('creates a budget', async () => {
    await resource.create('org 1', 'prj_1', {
      scope: 'project',
      amountMinor: 10000,
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/projects/prj_1/budgets',
        body: { scope: 'project', amountMinor: 10000 },
        signal: undefined,
      },
      budgetSchema
    )
  })

  it('retrieves a budget', async () => {
    await resource.retrieve('org 1', 'prj_1', 'bdg_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/budgets/bdg_1',
        signal: undefined,
      },
      budgetSchema
    )
  })

  it('updates a budget', async () => {
    await resource.update('org 1', 'prj_1', 'bdg_1', { thresholdPercent: 90 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/projects/prj_1/budgets/bdg_1',
        body: { thresholdPercent: 90 },
        signal: undefined,
      },
      budgetSchema
    )
  })

  it('deletes a budget', async () => {
    await resource.delete('org 1', 'prj_1', 'bdg_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/projects/prj_1/budgets/bdg_1',
        signal: undefined,
      },
      deletedSchema
    )
  })
})
