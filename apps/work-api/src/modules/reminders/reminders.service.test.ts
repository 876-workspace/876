import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('../recurrence-rules/index.js', () => ({
  retrieve: vi.fn(),
}))
vi.mock('./reminders.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './reminders.repository.js'
import * as service from './reminders.service.js'

const tenant = {
  object: 'work_tenant' as const,
  id: 'work_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reminder_1',
    tenantId: tenant.id,
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'req_1',
    title: 'Follow up',
    note: null,
    remindAt: new Date('2026-09-01T10:00:00.000Z'),
    userId: 'user_1',
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'user_1',
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

describe('Work reminders service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant)
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.update).mockResolvedValue(row() as never)
  })

  it('returns workspace missing as a value', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    await expect(service.list('org_1')).resolves.toMatchObject({
      code: 'work/tenant-not-found',
    })
  })

  it('stores a CRM request relation only as opaque context', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_1', {
      context: { service: 'crm', resource: 'request', id: 'req_1' },
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_1',
      })
    )
  })

  it('allows a general reminder with no source context', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      row({
        contextService: null,
        contextResource: null,
        contextId: null,
      }) as never
    )
    const result = await service.create('org_1', {
      title: 'Submit timesheet',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect('code' in result).toBe(false)
    if (!('code' in result)) expect(result.context).toBeNull()
  })

  it('owns unix-seconds conversion instead of the CRM adapter', async () => {
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_1', {
      title: 'Follow up',
      remindAt: 1_788_256_800,
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ remindAt: expect.any(Date) })
    )
  })
})
