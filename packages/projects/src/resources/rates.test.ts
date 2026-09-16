import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import { deletedSchema, rateListSchema, rateSchema } from '../types'
import { createRatesResource } from './rates'

describe('rates resource', () => {
  const resource = createRatesResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists rates for a project', async () => {
    await resource.list('org 1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/rates',
        signal: undefined,
      },
      rateListSchema
    )
  })

  it('creates a rate', async () => {
    await resource.create('org 1', 'prj_1', {
      scope: 'project-user',
      userId: 'usr_1',
      billRateMinor: 6000,
      costRateMinor: 3000,
    })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org%201/projects/prj_1/rates',
        body: {
          scope: 'project-user',
          userId: 'usr_1',
          billRateMinor: 6000,
          costRateMinor: 3000,
        },
        signal: undefined,
      },
      rateSchema
    )
  })

  it('retrieves a rate', async () => {
    await resource.retrieve('org 1', 'prj_1', 'rte_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org%201/projects/prj_1/rates/rte_1',
        signal: undefined,
      },
      rateSchema
    )
  })

  it('updates a rate', async () => {
    await resource.update('org 1', 'prj_1', 'rte_1', { billRateMinor: 7000 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'PATCH',
        path: '/v1/organizations/org%201/projects/prj_1/rates/rte_1',
        body: { billRateMinor: 7000 },
        signal: undefined,
      },
      rateSchema
    )
  })

  it('deletes a rate', async () => {
    await resource.delete('org 1', 'prj_1', 'rte_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org%201/projects/prj_1/rates/rte_1',
        signal: undefined,
      },
      deletedSchema
    )
  })
})
