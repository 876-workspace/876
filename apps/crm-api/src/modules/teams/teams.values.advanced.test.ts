import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: {
    list: vi.fn(),
    listWithMembers: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listMembers: vi.fn(),
  },
}))
vi.mock('../tenants/tenants.service.js', () => tenants)
vi.mock('./teams.repository.js', () => repository)

const service = await import('./teams.service.js')

const tenantActive = { id: 't1', organizationId: 'org_1', status: 'ACTIVE' }
const teamRow = { id: 'team_1', tenantId: 't1', name: 'Support', slug: 'support', description: null, color: null, isDefault: false, autoAssign: false, status: 'ACTIVE' as const, createdBy: 'u1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') }

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenantActive)
  repository.list.mockResolvedValue([teamRow] as unknown as ReturnType<typeof repository.list>)
  repository.retrieve.mockResolvedValue(teamRow as unknown as ReturnType<typeof repository.retrieve>)
  repository.create.mockResolvedValue(teamRow as unknown as ReturnType<typeof repository.create>)
  repository.update.mockResolvedValue(teamRow as unknown as ReturnType<typeof repository.update>)
})

describe('teams.service - value propagation advanced', () => {
  it('list returns tenant-not-found value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1', { includeMembers: false })
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-not-found' })
  })

  it('retrieve returns tenant-inactive', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({ ...tenantActive, status: 'INACTIVE' })
    const res = await service.retrieve('org_1', 'team_1')
    expect(res).toMatchObject({ code: 'crm/tenant-inactive' })
  })

  it('create propagates tenant error', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.create('org_1', { name: 'New', createdBy: 'u1' } as Parameters<typeof service.create>[1])
    expect(isError(res)).toBe(true)
  })

  it('update returns null when team missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.update('org_1', 'missing', { name: 'X' } as Parameters<typeof service.update>[2])
    expect(res).toBeNull()
  })

  it('retrieve returns null when not found', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.retrieve('org_1', 'missing')
    expect(res).toBeNull()
  })

  it('error values are plain', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.list('org_1', { includeMembers: false })
    expect(res).not.toBeInstanceOf(Error)
  })
})
