import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tenantsRepo,
  repository,
  workStructureRepo,
  milestoneDetailsRepo,
  milestoneListRepo,
  typeAccess,
  issuesRepo,
  labelsRepo,
  commentsRepo,
} = vi.hoisted(() => ({
  tenantsRepo: {
    retrieveByOrganization: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    retrieveByKey: vi.fn(),
    retrieveBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    hardDelete: vi.fn(),
    listMembers: vi.fn(),
    retrieveMember: vi.fn(),
    createMember: vi.fn(),
    removeMember: vi.fn(),
  },
  workStructureRepo: { seedPreset: vi.fn() },
  // Phase-2 added milestone detail/list repositories that connect to the DB
  // pool at module-eval time via `work-structure.routes.ts`. Mock them here
  // too, or importing `projects.service.js` throws
  // `PROJECTS_DATABASE_URL is not configured` before a single test runs.
  milestoneDetailsRepo: {
    milestoneProgress: vi.fn(),
    listMilestoneComments: vi.fn(),
    retrieveMilestoneComment: vi.fn(),
    createMilestoneComment: vi.fn(),
    updateMilestoneComment: vi.fn(),
    deleteMilestoneComment: vi.fn(),
    listMilestoneEvents: vi.fn(),
    createMilestoneEvent: vi.fn(),
    listMilestoneCustomFields: vi.fn(),
    retrieveMilestoneCustomField: vi.fn(),
    retrieveMilestoneCustomFieldByKey: vi.fn(),
    createMilestoneCustomField: vi.fn(),
    updateMilestoneCustomField: vi.fn(),
    archiveMilestoneCustomField: vi.fn(),
    listMilestoneCustomFieldValues: vi.fn(),
    upsertMilestoneCustomFieldValue: vi.fn(),
    clearMilestoneCustomFieldValue: vi.fn(),
  },
  milestoneListRepo: { listOrganizationMilestones: vi.fn() },
  typeAccess: { resolveOwnedWorkItemType: vi.fn() },
  issuesRepo: {
    buildWhereClause: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    retrieveByIdentifier: vi.fn(),
    retrieveByRef: vi.fn(),
    listEvents: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    getBatchEnrichment: vi.fn(),
    transaction: vi.fn(),
  },
  labelsRepo: {
    list: vi.fn(),
    retrieve: vi.fn(),
    retrieveByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
  },
  commentsRepo: {
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../projects.repository.js', () => repository)
vi.mock(
  '../../work-structure/work-structure.repository.js',
  () => workStructureRepo
)
vi.mock(
  '../../work-structure/milestone-details.repository.js',
  () => milestoneDetailsRepo
)
vi.mock(
  '../../work-structure/milestone-list.repository.js',
  () => milestoneListRepo
)
vi.mock('../../work-structure/work-item-type-access.js', () => typeAccess)
vi.mock('../../issues/issues.repository.js', () => issuesRepo)
vi.mock('../../labels/labels.repository.js', () => labelsRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)

const service = await import('../projects.service.js')
const schemas = await import('../projects.schemas.js')

const tenant = {
  id: 'prjten_test_1',
  organizationId: 'org_test_1',
  triageProjectId: 'prj_triage_1',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const workItemType = {
  id: 'wit_task_1',
  tenantId: tenant.id,
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const mockProjectRow = {
  id: 'prj_alpha_1',
  tenantId: tenant.id,
  name: 'Console Platform',
  key: 'CONSOLE',
  slug: 'console-platform',
  description: 'Main console UI project',
  leadUserId: 'usr_lead_1',
  status: 'planned',
  health: 'on-track',
  startDate: 1787767200n,
  targetDate: 1788767200n,
  nextIssueNumber: 1,
  customerId: null,
  defaultWorkItemTypeId: workItemType.id,
  position: 0,
  archivedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
  _count: { members: 0 },
}

const mockMemberRow = {
  id: 'prjmem_1',
  projectId: 'prj_alpha_1',
  userId: 'usr_member_1',
  role: 'member',
  createdAt: 1787767200n,
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.DELETION_MODE
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  typeAccess.resolveOwnedWorkItemType.mockResolvedValue(workItemType)
})

describe('project schemas', () => {
  it('accepts a project-level default work item type on create and update', () => {
    expect(
      schemas.createProjectBodySchema.parse({
        name: 'Console',
        defaultWorkItemTypeId: 'wit_task_1',
      })
    ).toMatchObject({ defaultWorkItemTypeId: 'wit_task_1' })

    expect(
      schemas.updateProjectBodySchema.parse({ defaultWorkItemTypeId: null })
    ).toEqual({ defaultWorkItemTypeId: null })
  })

  it('still rejects empty project updates', () => {
    expect(schemas.updateProjectBodySchema.safeParse({}).success).toBe(false)
  })
})

describe('projects service', () => {
  it('derives and uniquifies keys when no explicit key is supplied', async () => {
    repository.retrieveByKey
      .mockResolvedValueOnce(mockProjectRow)
      .mockResolvedValueOnce(null)
    repository.retrieveBySlug.mockResolvedValue(null)
    repository.create.mockImplementation(async (params) => ({
      ...mockProjectRow,
      name: params.name,
      key: params.key,
      defaultWorkItemTypeId: params.defaultWorkItemTypeId ?? null,
    }))

    const result = await service.create('org_test_1', {
      name: 'Mobile Core Engine',
    })

    expect(result.error).toBeNull()
    expect(result.data?.key).toBe('MOBILE2')
    expect(repository.retrieveByKey).toHaveBeenNthCalledWith(
      1,
      tenant.id,
      'MOBILE'
    )
    expect(repository.retrieveByKey).toHaveBeenNthCalledWith(
      2,
      tenant.id,
      'MOBILE2'
    )
  })

  it('persists and serializes a tenant-owned project default work item type', async () => {
    repository.retrieveByKey.mockResolvedValue(null)
    repository.retrieveBySlug.mockResolvedValue(null)
    repository.create.mockResolvedValue(mockProjectRow)

    const result = await service.create('org_test_1', {
      name: 'Console Platform',
      key: 'CONSOLE',
      defaultWorkItemTypeId: workItemType.id,
    })

    expect(typeAccess.resolveOwnedWorkItemType).toHaveBeenCalledWith(
      tenant.id,
      workItemType.id
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        defaultWorkItemTypeId: workItemType.id,
      })
    )
    expect(result.data?.defaultWorkItemTypeId).toBe(workItemType.id)
  })

  it('rejects a project default work item type outside the tenant', async () => {
    typeAccess.resolveOwnedWorkItemType.mockResolvedValueOnce(null)

    const result = await service.create('org_test_1', {
      name: 'Console Platform',
      defaultWorkItemTypeId: 'wit_other_tenant',
    })

    expect(result.error?.code).toBe('projects/work-item-type-not-found')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('allows clearing the project default work item type', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.update.mockResolvedValue({
      ...mockProjectRow,
      defaultWorkItemTypeId: null,
    })

    const result = await service.update('org_test_1', mockProjectRow.id, {
      defaultWorkItemTypeId: null,
    })

    expect(typeAccess.resolveOwnedWorkItemType).not.toHaveBeenCalled()
    expect(repository.update).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id,
      expect.objectContaining({ defaultWorkItemTypeId: null })
    )
    expect(result.data?.defaultWorkItemTypeId).toBeNull()
  })

  it('validates a non-null project default before updating', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    typeAccess.resolveOwnedWorkItemType.mockResolvedValueOnce(null)

    const result = await service.update('org_test_1', mockProjectRow.id, {
      defaultWorkItemTypeId: 'wit_missing',
    })

    expect(result.error?.code).toBe('projects/work-item-type-not-found')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('rejects invalid and colliding explicit project keys', async () => {
    const invalid = await service.create('org_test_1', {
      name: 'Bad key',
      key: 'x',
    })
    expect(invalid.error?.code).toBe('projects/invalid-project-key')

    repository.retrieveByKey.mockResolvedValueOnce(mockProjectRow)
    const collision = await service.create('org_test_1', {
      name: 'Another Console',
      key: 'CONSOLE',
    })
    expect(collision.error?.code).toBe('projects/project-key-taken')
  })

  it('lists projects within the resolved tenant and serializes defaults', async () => {
    repository.list.mockResolvedValue([mockProjectRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', { limit: 25 })

    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ limit: 25 })
    )
    expect(result.data?.items[0]?.defaultWorkItemTypeId).toBe(workItemType.id)
    expect(result.data?.totalCount).toBe(1)
  })

  it('resolves projects by opaque id or uppercase key', async () => {
    repository.retrieve.mockResolvedValueOnce(mockProjectRow)
    expect(await service.resolveProject(tenant.id, mockProjectRow.id)).toEqual(
      mockProjectRow
    )

    repository.retrieveByKey.mockResolvedValueOnce(mockProjectRow)
    expect(await service.resolveProject(tenant.id, 'console')).toEqual(
      mockProjectRow
    )
    expect(repository.retrieveByKey).toHaveBeenCalledWith(tenant.id, 'CONSOLE')
  })

  it('soft archives by default and hard deletes in hard mode', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.archive.mockResolvedValue(mockProjectRow)

    const soft = await service.remove('org_test_1', mockProjectRow.id)
    expect(soft.data?.deleted).toBe(true)
    expect(repository.archive).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id,
      expect.any(BigInt)
    )

    vi.clearAllMocks()
    tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
    repository.retrieve.mockResolvedValue(mockProjectRow)
    process.env.DELETION_MODE = 'hard'
    const hard = await service.remove('org_test_1', mockProjectRow.id)
    expect(hard.data?.deleted).toBe(true)
    expect(repository.hardDelete).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
  })

  it('lists, creates, and removes members only after resolving the project', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.listMembers.mockResolvedValue([mockMemberRow])
    repository.retrieveMember.mockResolvedValueOnce(null)
    repository.createMember.mockResolvedValue(mockMemberRow)

    const list = await service.listMembers('org_test_1', mockProjectRow.id)
    expect(list.data?.[0]?.userId).toBe('usr_member_1')

    const add = await service.addMember('org_test_1', mockProjectRow.id, {
      userId: 'usr_member_1',
    })
    expect(add.data?.role).toBe('member')

    repository.retrieveMember.mockResolvedValueOnce(mockMemberRow)
    const remove = await service.removeMember(
      'org_test_1',
      mockProjectRow.id,
      'usr_member_1'
    )
    expect(remove.data?.deleted).toBe(true)
    expect(repository.removeMember).toHaveBeenCalledWith(
      mockProjectRow.id,
      'usr_member_1'
    )
  })

  it('returns tenant-not-found without touching project storage', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValueOnce(null)

    const result = await service.retrieve('org_missing', mockProjectRow.id)
    expect(result.error?.code).toBe('projects/tenant-not-found')
    expect(repository.retrieve).not.toHaveBeenCalled()
  })
})
