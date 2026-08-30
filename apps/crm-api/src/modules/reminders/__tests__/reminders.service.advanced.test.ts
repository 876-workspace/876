import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: { requireRequestContext: vi.fn() },
  reminders: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../requests/index.js', () => mocks.context)
vi.mock('../../../providers/work.js', () => ({
  crmRequestWorkContext: (requestId: string) => ({
    service: 'crm',
    resource: 'request',
    id: requestId,
  }),
  workClient: () => ({ reminders: mocks.reminders }),
}))

const service = await import('../reminders.service.js')

const tenantId = 'crm_tnt_1'
const requestId = 'crm_req_1'

function workReminder(overrides: Record<string, unknown> = {}) {
  return {
    object: 'reminder' as const,
    id: 'crm_rem_1',
    organizationId: 'org_1',
    context: { service: 'crm', resource: 'request', id: requestId },
    title: 'Follow up',
    note: null,
    remindAt: 1_800_100_000,
    userId: 'usr_1',
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_1',
    createdAt: 1_800_000_000,
    updatedAt: 1_800_000_001,
    ...overrides,
  }
}

function listResult(data = [workReminder()]) {
  return {
    data: {
      object: 'list' as const,
      data,
      has_more: false,
      total_count: data.length,
      url: '/v1/organizations/org_1/reminders',
    },
    error: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.context.requireRequestContext.mockResolvedValue({ tenantId, requestId })
  mocks.reminders.list.mockResolvedValue(listResult())
  mocks.reminders.create.mockResolvedValue({
    data: workReminder(),
    error: null,
  })
  mocks.reminders.update.mockResolvedValue({
    data: workReminder(),
    error: null,
  })
  mocks.reminders.delete.mockResolvedValue({
    data: { object: 'reminder', id: 'crm_rem_1', deleted: true },
    error: null,
  })
})

describe('CRM reminder adapter over Work', () => {
  it('lists only the request context and restores CRM response fields', async () => {
    const result = await service.list('org_1', requestId)
    expect(mocks.reminders.list).toHaveBeenCalledWith('org_1', {
      context: { service: 'crm', resource: 'request', id: requestId },
    })
    expect(result).toEqual([
      expect.objectContaining({
        object: 'request_reminder',
        tenantId,
        requestId,
        remindAt: 1_800_100_000,
      }),
    ])
  })

  it('creates a Work reminder with opaque CRM context and unix seconds unchanged', async () => {
    await service.create('org_1', requestId, {
      title: 'Follow up',
      remindAt: 1_800_100_000,
      userId: 'usr_1',
      createdBy: 'usr_1',
    })
    expect(mocks.reminders.create).toHaveBeenCalledWith(
      'org_1',
      expect.objectContaining({
        context: { service: 'crm', resource: 'request', id: requestId },
        remindAt: 1_800_100_000,
      })
    )
  })

  it('will not mutate a reminder outside this request context', async () => {
    mocks.reminders.list.mockResolvedValue(listResult([]))
    await expect(
      service.update('org_1', requestId, 'other_reminder', { title: 'No' })
    ).resolves.toBeNull()
    expect(mocks.reminders.update).not.toHaveBeenCalled()
  })

  it('maps Work outages to crm/work-unavailable', async () => {
    mocks.reminders.list.mockResolvedValue({
      data: null,
      error: { code: 'work/internal', message: 'Internal server error.' },
    })
    await expect(service.list('org_1', requestId)).resolves.toMatchObject({
      code: 'crm/work-unavailable',
    })
  })

  it('preserves the CRM tombstone contract', async () => {
    await expect(
      service.remove('org_1', requestId, 'crm_rem_1', 'usr_1')
    ).resolves.toEqual({
      object: 'request_reminder',
      id: 'crm_rem_1',
      deleted: true,
    })
  })

  it('propagates request failures before touching Work', async () => {
    mocks.context.requireRequestContext.mockResolvedValue(
      getError('crm/request-not-found')
    )
    await expect(service.list('org_1', requestId)).resolves.toMatchObject({
      code: 'crm/request-not-found',
    })
    expect(mocks.reminders.list).not.toHaveBeenCalled()
  })
})
