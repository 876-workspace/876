import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  memberCapacityListSchema,
  memberCapacitySchema,
} from '../types'
import { createCapacityResource } from './capacity'

describe('capacity resource', () => {
  const resource = createCapacityResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists capacities with an optional user filter', async () => {
    await resource.list('org 1', { userId: 'usr_1' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/capacity?userId=usr_1',
        signal: undefined,
      },
      memberCapacityListSchema
    )
  })

  it('creates capacity with the weekly minutes and range', async () => {
    const input = {
      userId: 'usr_1',
      minutesPerWeek: 2400,
      effectiveFrom: 1787800000,
      effectiveTo: null,
    }
    await resource.create('org 1', input)
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org%201/capacity',
        body: input,
      }),
      memberCapacitySchema
    )
  })

  it('updates capacity by id', async () => {
    await resource.update('org 1', 'cap_1', { minutesPerWeek: 1200 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org%201/capacity/cap_1',
        body: { minutesPerWeek: 1200 },
      }),
      memberCapacitySchema
    )
  })

  it('deletes capacity by id', async () => {
    await resource.delete('org 1', 'cap_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/capacity/cap_1',
        signal: undefined,
      },
      deletedSchema
    )
  })

  it('validates the canonical member capacity contract', () => {
    const parsed = memberCapacitySchema.safeParse({
      object: 'projects.member-capacity',
      id: 'cap_1',
      tenantId: 'prjten_1',
      userId: 'usr_1',
      minutesPerWeek: 2400,
      effectiveFrom: 1787800000,
      effectiveTo: null,
      createdAt: 1787800000,
      updatedAt: 1787800000,
    })
    expect(parsed.success).toBe(true)
  })

  it('exposes the new contracts through the contracts entrypoint', async () => {
    const contracts = await import('../contracts')
    expect(contracts.workReportSchema).toBeDefined()
    expect(contracts.healthReportSchema).toBeDefined()
    expect(contracts.timeReportSchema).toBeDefined()
    expect(contracts.budgetVarianceReportSchema).toBeDefined()
    expect(contracts.workloadReportSchema).toBeDefined()
    expect(contracts.memberCapacitySchema).toBeDefined()
  })
})
