import { getError, isError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRequestContext: vi.fn(),
  reminders: { list: vi.fn() },
}))

vi.mock('../requests/index.js', () => ({
  requireRequestContext: mocks.requireRequestContext,
}))
vi.mock('../../providers/work.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../providers/work.js')>()),
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

  it('surfaces a missing Work connection as a registered CRM value', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: {
        code: 'work/connection-forbidden',
        message: 'The app Work connection lacks the required scope.',
      },
    })

    const result = await service.list('org_1', 'req_1')

    expect(result).toEqual({
      code: 'crm/work-not-connected',
      message:
        'Connect the CRM app to this organization’s Work workspace with the required scopes to continue.',
      httpStatus: 403,
    })
    expect(mocks.reminders.list).toHaveBeenCalledTimes(1)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
  })

  it('surfaces a missing Work workspace as a registered CRM value', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: {
        code: 'work/tenant-not-found',
        message: 'This organization has no Work workspace yet.',
      },
    })

    const result = await service.list('org_1', 'req_1')

    expect(result).toEqual({
      code: 'crm/work-workspace-missing',
      message: 'Provision this organization’s Work workspace to continue.',
      httpStatus: 404,
    })
    expect(mocks.reminders.list).toHaveBeenCalledTimes(1)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
  })

  it('surfaces an acting-user Work denial as a registered CRM value', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: {
        code: 'work/session-forbidden',
        message: 'You do not have permission to perform this Work action.',
      },
    })

    const result = await service.list('org_1', 'req_1')

    expect(result).toEqual({
      code: 'crm/work-forbidden',
      message:
        'The acting user is not permitted to perform this Work operation; grant the required permission to continue.',
      httpStatus: 403,
    })
    expect(mocks.reminders.list).toHaveBeenCalledTimes(1)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
  })

  it('surfaces an invalid Work request as a registered CRM value', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: { code: 'work/invalid-request', message: 'Invalid Work request.' },
    })

    const result = await service.list('org_1', 'req_1')

    expect(result).toEqual({
      code: 'crm/invalid-request',
      message: 'Invalid request.',
      httpStatus: 422,
    })
    expect(mocks.reminders.list).toHaveBeenCalledTimes(1)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
  })

  it('surfaces an internal Work failure as crm/work-unavailable', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: { code: 'work/internal', message: 'Internal server error.' },
    })

    const result = await service.list('org_1', 'req_1')

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
    expect(mocks.reminders.list).toHaveBeenCalledTimes(1)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
  })

  it('surfaces a code-less Work transport failure as crm/work-unavailable', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: { message: 'Fetch failed.' },
    })

    const result = await service.list('org_1', 'req_1')

    expect(result).toEqual({
      code: 'crm/work-unavailable',
      message: 'The shared Work service could not be reached.',
      httpStatus: 502,
    })
    expect(mocks.reminders.list).toHaveBeenCalledTimes(1)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
  })
})
