import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenants, priorities, repository } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  priorities: { requireActiveForTenant: vi.fn() },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    retrieveSub: vi.fn(),
    createSub: vi.fn(),
    updateSub: vi.fn(),
    removeSub: vi.fn(),
  },
}))
vi.mock('../tenants/tenants.service.js', () => tenants)
vi.mock('../priorities/index.js', () => priorities)
vi.mock('./categories.repository.js', () => repository)

const service = await import('./categories.service.js')

const tenantActive = { id: 't1', organizationId: 'org_1', status: 'ACTIVE' }
const categoryRow = {
  id: 'cat_1', tenantId: 't1', name: 'Billing', slug: 'billing', description: null, color: null, icon: null, isActive: true, defaultPriorityId: null,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'), subcategories: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenantActive)
  priorities.requireActiveForTenant.mockResolvedValue(null)
  repository.list.mockResolvedValue([categoryRow] as unknown as Awaited<ReturnType<typeof repository.list>>)
  repository.retrieve.mockResolvedValue(categoryRow as unknown as Awaited<ReturnType<typeof repository.retrieve>>)
  repository.create.mockResolvedValue(categoryRow as unknown as Awaited<ReturnType<typeof repository.create>>)
  repository.update.mockResolvedValue(categoryRow as unknown as Awaited<ReturnType<typeof repository.update>>)
  repository.remove.mockResolvedValue({ id: 'cat_1', deleted: true } as unknown as ReturnType<typeof repository.remove> extends Promise<infer T> ? T : never)
})

describe('categories.service - tenant value propagation', () => {
  it('list returns tenant-not-found value when tenant missing', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1')
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-not-found', httpStatus: 404 })
    expect(repository.list).not.toHaveBeenCalled()
  })

  it('list returns tenant-inactive value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({ ...tenantActive, status: 'INACTIVE' })
    const res = await service.list('org_1')
    expect(res).toMatchObject({ code: 'crm/tenant-inactive' })
  })

  it('retrieve returns tenant error as value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.retrieve('org_1', 'cat_1')
    expect(isError(res)).toBe(true)
  })

  it('create propagates priority error as value', async () => {
    const err = { code: 'crm/priority-not-found', message: 'x', httpStatus: 404 }
    priorities.requireActiveForTenant.mockResolvedValue(err as unknown as null)
    const res = await service.create('org_1', { name: 'New', defaultPriorityId: 'bad' } as Parameters<typeof service.create>[1])
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/priority-not-found' })
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('list success maps to serialized categories', async () => {
    const res = await service.list('org_1')
    expect(Array.isArray(res)).toBe(true)
    expect((res as unknown as Array<Record<string, unknown>>)[0].object).toBe('request_category')
  })

  it('retrieve returns null when not found (not error)', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.retrieve('org_1', 'missing')
    expect(res).toBeNull()
  })

  it('error values are plain not Error instances', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1')
    expect(res).not.toBeInstanceOf(Error)
    expect(isError(res)).toBe(true)
  })

  it('update returns null when category not found', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.update('org_1', 'missing', { name: 'Renamed' } as Parameters<typeof service.update>[2])
    expect(res).toBeNull()
  })

  it('remove returns tenant error without touching repository', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.remove('org_1', 'cat_1', { deletedBy: 'u1' } as Parameters<typeof service.remove>[2])
    expect(isError(res)).toBe(true)
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('concurrent tenant failures are isolated', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const [a, b] = await Promise.all([service.list('org_1'), service.list('org_2')])
    expect(isError(a) && isError(b)).toBe(true)
  })
})
