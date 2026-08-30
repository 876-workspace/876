import { getError, isError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  reminders: { list: vi.fn() },
}))

vi.mock('../requests/index.js', () => ({
  requireRequestContext: mocks.requireRequestContext,
}))
vi.mock('../../providers/work.js', () => ({
  crmRequestWorkContext: (id: string) => ({
    service: 'crm',
    resource: 'request',
    id,
  }),
  workClient: () => ({ reminders: mocks.reminders }),
}))

const service = await import('./reminders.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRequestContext.mockResolvedValue({
    tenantId: 'crm_tnt_1',
    requestId: 'req_1',
  })
  mocks.reminders.list.mockResolvedValue({
    data: {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/reminders',
    },
    error: null,
  })
})

describe('reminders service value propagation after Work extraction', () => {
  it('keeps request errors as values', async () => {
    mocks.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    const result = await service.list('org_1', 'req_1')
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({ code: 'crm/request-not-found' })
  })

  it('keeps Work outages as a registered CRM value', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: { code: 'work/internal', message: 'Internal server error.' },
    })
    const result = await service.list('org_1', 'req_1')
    expect(isError(result)).toBe(true)
    expect(result).toMatchObject({ code: 'crm/work-unavailable' })
    expect(result).not.toBeInstanceOf(Error)
  })
})
