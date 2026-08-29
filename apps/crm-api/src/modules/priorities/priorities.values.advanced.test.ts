import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    retrieveDefault: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setDefault: vi.fn(),
  },
}))
vi.mock('../tenants/tenants.service.js', () => tenants)
vi.mock('./priorities.repository.js', () => repository)

const service = await import('./priorities.service.js')

const tenantActive = { id: 't1', organizationId: 'org_1', status: 'ACTIVE' }
const priorityRow = {
  id: 'pri_1', tenantId: 't1', provisioningKey: null, name: 'High', slug: 'high', description: null, color: null, icon: null, weight: 10, sortOrder: 1, isDefault: false, isActive: true, createdBy: 'u1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenantActive)
  repository.list.mockResolvedValue([priorityRow] as unknown as ReturnType<typeof repository.list>)
  repository.retrieve.mockResolvedValue(priorityRow as unknown as ReturnType<typeof repository.retrieve>)
  repository.retrieveDefault.mockResolvedValue(priorityRow as unknown as ReturnType<typeof repository.retrieveDefault>)
  repository.create.mockResolvedValue(priorityRow as unknown as ReturnType<typeof repository.create>)
  repository.update.mockResolvedValue(priorityRow as unknown as ReturnType<typeof repository.update>)
  repository.remove.mockResolvedValue(priorityRow as unknown as ReturnType<typeof repository.remove>)
  repository.setDefault.mockResolvedValue({ ...priorityRow, isDefault: true } as unknown as ReturnType<typeof repository.setDefault>)
})

describe('priorities.service - value propagation advanced', () => {
  it('list returns tenant-not-found value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1')
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-not-found' })
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('retrieve returns tenant-inactive value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({ ...tenantActive, status: 'INACTIVE' })
    const res = await service.retrieve('org_1', 'pri_1')
    expect(res).toMatchObject({ code: 'crm/tenant-inactive' })
  })

  it('retrieve returns null when not found', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.retrieve('org_1', 'missing')
    expect(res).toBeNull()
  })

  it('update returns priority-default-required when demoting default', async () => {
    repository.retrieve.mockResolvedValue({ ...priorityRow, isDefault: true } as unknown as ReturnType<typeof repository.retrieve>)
    const res = await service.update('org_1', 'pri_1', { isDefault: false } as Parameters<typeof service.update>[2])
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/priority-default-required' })
  })

  it('update returns null when priority not found', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.update('org_1', 'missing', { name: 'New' } as Parameters<typeof service.update>[2])
    expect(res).toBeNull()
  })

  it('create propagates tenant error', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.create('org_1', { name: 'Urgent', createdBy: 'u1' } as Parameters<typeof service.create>[1])
    expect(isError(res)).toBe(true)
  })

  it('error values are plain not Error', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1')
    expect(res).not.toBeInstanceOf(Error)
  })

  it('concurrent tenant failures isolated', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const [a, b] = await Promise.all([service.list('org_1'), service.retrieve('org_1', 'pri_1')])
    expect(isError(a) && isError(b)).toBe(true)
  })
})
