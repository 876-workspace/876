import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenants, repository, priorities } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    customerExists: vi.fn(),
    categoryExists: vi.fn(),
    subcategoryExists: vi.fn(),
    teamExists: vi.fn(),
    isTeamMember: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  priorities: { requireActiveForTenant: vi.fn(), retrieveDefaultForTenant: vi.fn(), serialize: vi.fn(x => x) },
}))
vi.mock('../tenants/tenants.service.js', () => tenants)
vi.mock('./requests.repository.js', () => repository)
vi.mock('../priorities/index.js', () => priorities)

const service = await import('./requests.service.js')

const tenantActive = { id: 't1', organizationId: 'org_1', status: 'ACTIVE' }
const baseRow = {
  id: 'req_1', tenantId: 't1', customerId: 'cus_1', number: 1, subject: 'Hi', status: 'OPEN' as const,
  priorityId: 'pri_1', priority: { id: 'pri_1', name: 'Normal' }, source: 'CRM' as const,
  categoryId: null, subcategoryId: null, teamId: null, assigneeId: null,
  ownerId: null, requesterUserId: null, requesterContactId: null, createdBy: 'u1',
  resolvedAt: null, closedAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'), deletedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenantActive)
  repository.list.mockResolvedValue([baseRow] as unknown as ReturnType<typeof repository.list>)
  repository.retrieve.mockResolvedValue(baseRow as unknown as ReturnType<typeof repository.retrieve>)
  repository.customerExists.mockResolvedValue({ id: 'cus_1' })
  repository.categoryExists.mockResolvedValue(null)
  repository.subcategoryExists.mockResolvedValue(null)
  repository.teamExists.mockResolvedValue(null)
  repository.create.mockResolvedValue(baseRow as unknown as ReturnType<typeof repository.create>)
  priorities.requireActiveForTenant.mockResolvedValue({ id: 'pri_1' } as unknown as ReturnType<typeof priorities.requireActiveForTenant>)
  priorities.retrieveDefaultForTenant.mockResolvedValue({ id: 'pri_default' } as unknown as ReturnType<typeof priorities.retrieveDefaultForTenant>)
})

describe('requests.service - value errors advanced', () => {
  it('list returns tenant-not-found value without calling repository', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1')
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-not-found' })
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('retrieve returns tenant-inactive value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({ ...tenantActive, status: 'INACTIVE' })
    const res = await service.retrieve('org_1', 'req_1')
    expect(res).toMatchObject({ code: 'crm/tenant-inactive' })
  })

  it('assertRouting propagates tenant error', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.assertRouting('org_1', { categoryId: 'cat_1' })
    expect(isError(res)).toBe(true)
  })

  it('assertRouting returns category-not-found as value', async () => {
    repository.categoryExists.mockResolvedValue(null)
    const res = await service.assertRouting('org_1', { categoryId: 'bad' })
    expect(res).toMatchObject({ code: 'crm/category-not-found' })
  })

  it('assertRouting returns subcategory-category-mismatch as value', async () => {
    repository.categoryExists.mockResolvedValue({ id: 'cat_1' } as unknown as ReturnType<typeof repository.categoryExists>)
    repository.subcategoryExists.mockResolvedValue({ id: 'sub_1', categoryId: 'other' } as unknown as ReturnType<typeof repository.subcategoryExists>)
    const res = await service.assertRouting('org_1', { categoryId: 'cat_1', subcategoryId: 'sub_1' })
    expect(res).toMatchObject({ code: 'crm/subcategory-category-mismatch' })
  })

  it('create returns customer-not-found value', async () => {
    repository.customerExists.mockResolvedValue(null)
    const res = await service.create('org_1', { customerId: 'missing', subject: 'hi', createdBy: 'u1' } as Parameters<typeof service.create>[1])
    expect(res).toMatchObject({ code: 'crm/customer-not-found' })
  })

  it('error values are plain not Error', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1')
    expect(res).not.toBeInstanceOf(Error)
  })

  it('retrieve returns null when request not found (distinguishes from error)', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.retrieve('org_1', 'missing')
    expect(res).toBeNull()
  })

  it('priority error propagates via assertRouting', async () => {
    const err = { code: 'crm/priority-not-found', message: 'x', httpStatus: 404 }
    priorities.requireActiveForTenant.mockResolvedValue(err as unknown as ReturnType<typeof priorities.requireActiveForTenant>)
    const res = await service.assertRouting('org_1', { priorityId: 'bad' })
    expect(res).toMatchObject({ code: 'crm/priority-not-found' })
  })
})
