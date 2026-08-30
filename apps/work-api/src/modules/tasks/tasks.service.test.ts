import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../tenants/index.js', () => ({
  retrieveByOrganization: vi.fn(),
}))
vi.mock('./tasks.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

import * as tenants from '../tenants/index.js'
import * as repository from './tasks.repository.js'
import * as service from './tasks.service.js'

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
    id: 'task_1',
    tenantId: tenant.id,
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'req_1',
    title: 'Follow up',
    description: null,
    status: 'OPEN' as const,
    priorityId: 'crm_pri_1',
    assigneeId: null,
    dueAt: null,
    completedAt: null,
    completedBy: null,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

describe('Work tasks service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns workspace missing as a value', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(null)
    const result = await service.list('org_1')
    expect(result).toMatchObject({ code: 'work/tenant-not-found' })
  })

  it('stores CRM request context as opaque values', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant)
    vi.mocked(repository.create).mockResolvedValue(row() as never)
    await service.create('org_1', {
      title: 'Follow up',
      priorityId: 'crm_pri_1',
      createdBy: 'user_1',
      context: { service: 'crm', resource: 'request', id: 'req_1' },
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService: 'crm',
        contextResource: 'request',
        contextId: 'req_1',
        priorityId: 'crm_pri_1',
      })
    )
  })

  it('allows general tasks with no source context', async () => {
    vi.mocked(tenants.retrieveByOrganization).mockResolvedValue(tenant)
    vi.mocked(repository.create).mockResolvedValue(
      row({ contextService: null, contextResource: null, contextId: null }) as never
    )
    const result = await service.create('org_1', {
      title: 'Prepare rota',
      createdBy: 'user_1',
    })
    expect('code' in result).toBe(false)
    if (!('code' in result)) expect(result.context).toBeNull()
  })
})
