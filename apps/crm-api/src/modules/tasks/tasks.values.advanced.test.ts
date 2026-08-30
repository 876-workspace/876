import { getError, isError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  retrieveForTenant: vi.fn(),
  tasks: { list: vi.fn() },
}))

vi.mock('../requests/index.js', () => ({
  requireRequestContext: mocks.requireRequestContext,
}))
vi.mock('../priorities/index.js', () => ({
  retrieveForTenant: mocks.retrieveForTenant,
}))
vi.mock('../../providers/work.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../providers/work.js')>()),
  workClient: () => ({ tasks: mocks.tasks }),
}))

const service = await import('./tasks.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRequestContext.mockResolvedValue({
    tenantId: 'crm_tnt_1',
    requestId: 'req_1',
  })
  mocks.tasks.list.mockResolvedValue({
    data: {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/tasks',
    },
    error: null,
  })
})

describe('tasks service value propagation after Work extraction', () => {
  it('keeps request errors as values', async () => {
    mocks.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    const result = await service.list('org_1', 'req_1')
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({ code: 'crm/request-not-found' })
  })

  it('keeps Work outages as a registered CRM value', async () => {
    mocks.tasks.list.mockResolvedValue({
      data: null,
      error: { code: 'work/internal', message: 'Internal server error.' },
    })
    const result = await service.list('org_1', 'req_1')
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({ code: 'crm/work-unavailable' })
    expect(result).not.toBeInstanceOf(Error)
  })
})
