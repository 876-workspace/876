import { expectValue } from '../../../test/expect-value.js'
import { getError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, priorities, repo } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  priorities: { requireActiveForTenant: vi.fn() },
  repo: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    used: vi.fn(),
    retrieveSub: vi.fn(),
    createSub: vi.fn(),
    updateSub: vi.fn(),
    removeSub: vi.fn(),
    usedSub: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../categories.repository.js', () => repo)
vi.mock('../../priorities/index.js', () => priorities)

const service = await import('../categories.service.js')

const tenant = {
  id: 'crm_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
}
function categoryRow(overrides: Record<string, unknown> = {}) {
  const at = new Date('2026-08-26T00:00:00.000Z')
  return {
    id: 'crm_cat_1',
    tenantId: tenant.id,
    name: 'Delivery',
    slug: 'delivery',
    description: null,
    color: null,
    icon: null,
    sortOrder: 0,
    isActive: true,
    defaultTeamId: null,
    defaultPriorityId: null,
    createdBy: 'usr_1',
    createdAt: at,
    updatedAt: at,
    subcategories: [],
    ...overrides,
  }
}
function subcategoryRow(overrides: Record<string, unknown> = {}) {
  const at = new Date('2026-08-26T00:00:00.000Z')
  return {
    id: 'crm_sub_1',
    tenantId: tenant.id,
    categoryId: 'crm_cat_1',
    name: 'Sub',
    slug: 'sub',
    description: null,
    icon: null,
    sortOrder: 0,
    isActive: true,
    defaultTeamId: null,
    defaultPriorityId: null,
    createdBy: 'usr_1',
    createdAt: at,
    updatedAt: at,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  priorities.requireActiveForTenant.mockResolvedValue({
    id: 'crm_pri_1',
  } as unknown as Awaited<ReturnType<typeof priorities.requireActiveForTenant>>)
  repo.list.mockResolvedValue([])
  repo.retrieve.mockResolvedValue(categoryRow())
  repo.create.mockResolvedValue(categoryRow())
  repo.update.mockResolvedValue(categoryRow())
  repo.remove.mockResolvedValue({
    object: 'request_category',
    id: 'crm_cat_1',
    deleted: true,
  })
  repo.used.mockResolvedValue(false)
  repo.retrieveSub.mockResolvedValue(subcategoryRow())
  repo.createSub.mockResolvedValue(subcategoryRow())
  repo.updateSub.mockResolvedValue(subcategoryRow())
})

describe('categories.service.advanced - slugify', () => {
  it('slugifies names with special chars and caps at 60', async () => {
    repo.create.mockImplementation(async (args: Record<string, unknown>) =>
      categoryRow({ slug: args.slug })
    )
    const longName =
      'A Very Long Category Name With Many Words And Special / Characters & Symbols That Exceeds Sixty Chars'
    const res = expectValue(
      await service.create('org_1', {
        name: longName,
        createdBy: 'usr_1',
      })
    )
    expect(res.slug.length).toBeLessThanOrEqual(60)
    expect(res.slug).not.toContain('/')
    expect(res.slug).not.toContain(' ')
  })

  it('falls back to category when slugify produces empty', async () => {
    repo.create.mockResolvedValue(categoryRow({ slug: 'category' }))
    const res = expectValue(
      await service.create('org_1', {
        name: '!!!',
        createdBy: 'usr_1',
      })
    )
    expect(res.slug).toBe('category')
  })
})

describe('categories.service.advanced - tenant checks', () => {
  it('throws tenant-not-found when no tenant', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    await expect(service.list('missing')).resolves.toMatchObject({
      code: 'crm/tenant-not-found',
    })
  })

  it('throws tenant-inactive', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({
      ...tenant,
      status: 'INACTIVE',
    })
    await expect(service.list('org_1')).resolves.toMatchObject({
      code: 'crm/tenant-inactive',
    })
  })
})

describe('categories.service.advanced - priority validation', () => {
  it('validates defaultPriorityId on create', async () => {
    await service.create('org_1', {
      name: 'Ops',
      createdBy: 'usr_1',
      defaultPriorityId: 'crm_pri_1',
    })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      'crm_pri_1'
    )
  })

  it('does not validate when defaultPriorityId is null or undefined', async () => {
    await service.create('org_1', { name: 'Ops', createdBy: 'usr_1' })
    expect(priorities.requireActiveForTenant).not.toHaveBeenCalled()
    await service.create('org_1', {
      name: 'Ops',
      createdBy: 'usr_1',
      defaultPriorityId: null,
    })
    expect(priorities.requireActiveForTenant).not.toHaveBeenCalled()
  })

  it('propagates priority-not-found on invalid priority', async () => {
    priorities.requireActiveForTenant.mockResolvedValue(
      getError('crm/priority-not-found')
    )
    await expect(
      service.create('org_1', {
        name: 'Ops',
        createdBy: 'usr_1',
        defaultPriorityId: 'bad',
      })
    ).resolves.toMatchObject({ code: 'crm/priority-not-found' })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('validates defaultPriorityId on update', async () => {
    repo.retrieve.mockResolvedValue(categoryRow())
    await service.update('org_1', 'crm_cat_1', {
      defaultPriorityId: 'crm_pri_1',
    })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      'crm_pri_1'
    )
  })

  it('returns null when category not found on update', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(await service.update('org_1', 'missing', { name: 'X' })).toBeNull()
    expect(priorities.requireActiveForTenant).not.toHaveBeenCalled()
  })

  it('validates defaultPriorityId on subcategory create', async () => {
    repo.retrieve.mockResolvedValue(categoryRow())
    await service.createSub('org_1', 'crm_cat_1', {
      name: 'Sub',
      createdBy: 'usr_1',
      defaultPriorityId: 'crm_pri_1',
    })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      'crm_pri_1'
    )
  })

  it('throws category-not-found for unknown category on subcategory create', async () => {
    repo.retrieve.mockResolvedValue(null)
    await expect(
      service.createSub('org_1', 'bad', { name: 'Sub', createdBy: 'usr_1' })
    ).resolves.toMatchObject({ code: 'crm/category-not-found' })
  })
})

describe('categories.service.advanced - serialization and remove guards', () => {
  it('serializes category timestamps to unix seconds', async () => {
    const at = new Date('2026-08-26T18:00:00.000Z')
    repo.list.mockResolvedValue([
      categoryRow({
        createdAt: at,
        updatedAt: at,
        subcategories: [subcategoryRow({ createdAt: at, updatedAt: at })],
      }),
    ])
    const [cat] = expectValue(await service.list('org_1'))
    expect(cat.createdAt).toBe(Math.floor(at.getTime() / 1000))
    expect(cat.subcategories[0].createdAt).toBe(Math.floor(at.getTime() / 1000))
    expect(cat.object).toBe('request_category')
    expect(cat.subcategories[0].object).toBe('request_subcategory')
  })

  it('blocks removal when category is in use', async () => {
    repo.retrieve.mockResolvedValue(categoryRow())
    repo.used.mockResolvedValue(true)
    await expect(
      service.remove('org_1', 'crm_cat_1', { deletedBy: 'usr_1' })
    ).resolves.toMatchObject({ code: 'crm/category-in-use' })
    expect(repo.remove).not.toHaveBeenCalled()
  })

  it('allows removal when not in use', async () => {
    repo.retrieve.mockResolvedValue(categoryRow())
    repo.used.mockResolvedValue(false)
    const res = expectValue(
      await service.remove('org_1', 'crm_cat_1', {
        deletedBy: 'usr_1',
      })
    )
    expect(res).toMatchObject({ deleted: true })
    expect(repo.remove).toHaveBeenCalled()
  })

  it('returns null when category missing on remove', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(
      await service.remove('org_1', 'missing', { deletedBy: 'usr_1' })
    ).toBeNull()
  })
})
