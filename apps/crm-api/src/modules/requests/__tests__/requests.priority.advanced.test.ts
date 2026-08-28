import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, priorities, repo } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  priorities: {
    requireActiveForTenant: vi.fn(),
    retrieveDefaultForTenant: vi.fn(),
    serialize: vi.fn((p: unknown) => p),
  },
  repo: {
    retrieve: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    categoryExists: vi.fn(),
    subcategoryExists: vi.fn(),
    teamExists: vi.fn(),
    customerExists: vi.fn(),
    teamMemberExists: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../requests.repository.js', () => repo)
vi.mock('../../priorities/index.js', () => priorities)

const service = await import('../requests.service.js')

const tenant = {
  id: 'crm_tnt_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
}
const normal = {
  id: 'crm_pri_normal',
  name: 'Normal',
  weight: 20,
  object: 'request_priority',
}
const urgent = {
  id: 'crm_pri_urgent',
  name: 'Urgent',
  weight: 40,
  object: 'request_priority',
}
const at = new Date('2026-08-26T18:00:00.000Z')
function requestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'crm_req_1',
    tenantId: tenant.id,
    customerId: 'crm_cus_1',
    number: 1,
    subject: 'Need help',
    categoryId: null,
    subcategoryId: null,
    teamId: null,
    assigneeId: null,
    ownerId: null,
    status: 'OPEN' as const,
    priorityId: normal.id,
    priority: normal,
    source: 'CRM' as const,
    requesterUserId: null,
    requesterContactId: null,
    createdBy: 'usr_1',
    resolvedAt: null,
    closedAt: null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  priorities.requireActiveForTenant.mockImplementation(
    async (_tid: string, pid: string) => {
      if (pid === normal.id)
        return normal as unknown as ReturnType<
          typeof priorities.requireActiveForTenant
        >
      if (pid === urgent.id)
        return urgent as unknown as ReturnType<
          typeof priorities.requireActiveForTenant
        >
      throw { code: 'crm/priority-not-found' }
    }
  )
  priorities.retrieveDefaultForTenant.mockResolvedValue(
    normal as unknown as ReturnType<typeof priorities.retrieveDefaultForTenant>
  )
  priorities.serialize.mockImplementation(
    (p) => p as unknown as ReturnType<typeof priorities.serialize>
  )
  repo.retrieve.mockResolvedValue(requestRow())
  repo.list.mockResolvedValue([requestRow()])
  repo.create.mockResolvedValue(requestRow())
  repo.update.mockResolvedValue(requestRow())
  repo.remove.mockResolvedValue({
    object: 'request',
    id: 'crm_req_1',
    deleted: true,
  })
  repo.categoryExists.mockResolvedValue(null)
  repo.subcategoryExists.mockResolvedValue(null)
  repo.teamExists.mockResolvedValue(null)
  repo.customerExists.mockResolvedValue({ id: 'crm_cus_1' })
})

describe('requests.priority.advanced - create uses hierarchy: explicit > subcategory > category > default', () => {
  it('uses explicit priorityId when supplied even if category has default', async () => {
    repo.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultPriorityId: urgent.id,
      defaultTeamId: null,
    } as unknown as Awaited<ReturnType<typeof repo.categoryExists>>)
    await service.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'hi',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      priorityId: normal.id,
    })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      normal.id
    )
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: normal.id })
    )
  })

  it('falls back to subcategory default when no explicit', async () => {
    repo.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultPriorityId: urgent.id,
      defaultTeamId: null,
    } as unknown as ReturnType<typeof repo.categoryExists>)
    repo.subcategoryExists.mockResolvedValue({
      id: 'crm_sub_1',
      categoryId: 'crm_cat_1',
      defaultPriorityId: normal.id,
      defaultTeamId: null,
    } as unknown as ReturnType<typeof repo.subcategoryExists>)
    await service.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'hi',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      subcategoryId: 'crm_sub_1',
    })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      normal.id
    )
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: normal.id })
    )
  })

  it('falls back to category default when no subcategory', async () => {
    repo.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultPriorityId: urgent.id,
      defaultTeamId: null,
    } as unknown as ReturnType<typeof repo.categoryExists>)
    await service.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'hi',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
    })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      urgent.id
    )
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: urgent.id })
    )
  })

  it('uses tenant default when neither category nor explicit', async () => {
    await service.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'hi',
      createdBy: 'usr_1',
    })
    expect(priorities.retrieveDefaultForTenant).toHaveBeenCalledWith(tenant.id)
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ priorityId: normal.id })
    )
  })

  it('throws priority-not-found when tenant has no default', async () => {
    priorities.retrieveDefaultForTenant.mockResolvedValue(null)
    await expect(
      service.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/priority-not-found' })
  })

  it('throws when explicit priority is not active', async () => {
    priorities.requireActiveForTenant.mockRejectedValue({
      code: 'crm/priority-not-found',
    })
    await expect(
      service.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
        priorityId: 'bad',
      })
    ).rejects.toMatchObject({ code: 'crm/priority-not-found' })
  })
})

describe('requests.priority.advanced - assertRouting validates priorityId', () => {
  it('passes when priority exists', async () => {
    await expect(
      service.assertRouting('org_1', { priorityId: normal.id })
    ).resolves.toBeUndefined()
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      normal.id
    )
  })

  it('throws when priority missing', async () => {
    priorities.requireActiveForTenant.mockRejectedValue({
      code: 'crm/priority-not-found',
    })
    await expect(
      service.assertRouting('org_1', { priorityId: 'bad' })
    ).rejects.toMatchObject({ code: 'crm/priority-not-found' })
  })

  it('does not validate when priorityId is null or undefined', async () => {
    await service.assertRouting('org_1', {})
    expect(priorities.requireActiveForTenant).not.toHaveBeenCalled()
    await service.assertRouting('org_1', { priorityId: null })
    expect(priorities.requireActiveForTenant).not.toHaveBeenCalled()
  })
})

describe('requests.priority.advanced - update validates priorityId', () => {
  it('validates priorityId on update', async () => {
    repo.retrieve.mockResolvedValue(requestRow())
    await service.update('org_1', 'crm_req_1', { priorityId: urgent.id })
    expect(priorities.requireActiveForTenant).toHaveBeenCalledWith(
      tenant.id,
      urgent.id
    )
    expect(repo.update).toHaveBeenCalledWith(
      'crm_req_1',
      expect.objectContaining({ priorityId: urgent.id })
    )
  })

  it('throws when new priority not found', async () => {
    repo.retrieve.mockResolvedValue(requestRow())
    priorities.requireActiveForTenant.mockRejectedValue({
      code: 'crm/priority-not-found',
    })
    await expect(
      service.update('org_1', 'crm_req_1', { priorityId: 'bad' })
    ).rejects.toMatchObject({ code: 'crm/priority-not-found' })
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('returns null when request missing', async () => {
    repo.retrieve.mockResolvedValue(null)
    expect(
      await service.update('org_1', 'missing', { priorityId: urgent.id })
    ).toBeNull()
  })

  it('serializes priority via priorities.serialize', async () => {
    priorities.serialize.mockReturnValue(
      urgent as unknown as ReturnType<typeof priorities.serialize>
    )
    repo.retrieve.mockResolvedValue(
      requestRow({ priority: urgent, priorityId: urgent.id })
    )
    repo.update.mockResolvedValue(
      requestRow({ priority: urgent, priorityId: urgent.id })
    )
    const result = await service.update('org_1', 'crm_req_1', {
      subject: 'new',
    })
    expect(result?.priority).toMatchObject({ id: urgent.id })
  })
})

describe('requests.priority.advanced - list filters and serialization', () => {
  it('passes priorityId filter through to repository? actually service.list forwards filters', async () => {
    // service.list just maps serialize, but filter validation happens in controller;
    // ensure list serializes priority correctly
    repo.list.mockResolvedValue([
      requestRow({ priority: urgent, priorityId: urgent.id }),
    ])
    priorities.serialize.mockReturnValue(
      urgent as unknown as ReturnType<typeof priorities.serialize>
    )
    const rows = await service.list('org_1', {
      priorityId: urgent.id,
    } as unknown as Parameters<typeof service.list>[1])
    expect(rows[0].priorityId).toBe(urgent.id)
  })

  it('serializes timestamps', async () => {
    const rows = await service.list('org_1')
    expect(rows[0].createdAt).toBe(Math.floor(at.getTime() / 1000))
    expect(rows[0].updatedAt).toBe(Math.floor(at.getTime() / 1000))
  })
})
