import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tenantsRepo,
  repository,
  workStructureRepo,
  labelsRepo,
  commentsRepo,
  issuesRepo,
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
  // `projects.service.ts` reaches `tenants/index.js`, whose service now
  // calls `work-structure.service.ts` to backfill a pre-Phase-2 tenant on
  // `ensure()`. That file also imports the projects and issues modules for
  // unrelated resources, and every one of those repositories connects to
  // the DB pool at module-eval time — so each must be mocked here too.
  workStructureRepo: { seedPreset: vi.fn() },
  labelsRepo: { retrieve: vi.fn(), retrieveByName: vi.fn(), create: vi.fn() },
  commentsRepo: {
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  },
  issuesRepo: {
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
}))

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../projects.repository.js', () => repository)
vi.mock(
  '../../work-structure/work-structure.repository.js',
  () => workStructureRepo
)
vi.mock('../../labels/labels.repository.js', () => labelsRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)
vi.mock('../../issues/issues.repository.js', () => issuesRepo)

const service = await import('../projects.service.js')
const { createProjectsRouter } = await import('../projects.routes.js')

const tenant = {
  id: 'prjten_test_1',
  organizationId: 'org_test_1',
  triageProjectId: 'prj_triage_1',
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

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/projects', createProjectsRouter())
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return {
      status: response.status,
      body: await response.json(),
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.DELETION_MODE
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
})

describe('projects module', () => {
  it('create derives a key from the name when none is supplied', async () => {
    repository.retrieveByKey.mockResolvedValue(null)
    repository.retrieveBySlug.mockResolvedValue(null)
    repository.create.mockImplementation(
      async (params: { key: string; name: string }) => ({
        ...mockProjectRow,
        name: params.name,
        key: params.key,
      })
    )

    const result = await service.create('org_test_1', {
      name: 'Mobile Core Engine',
    })

    expect(result.error).toBeNull()
    expect(result.data?.key).toBe('MOBILE')
    expect(repository.retrieveByKey).toHaveBeenCalledWith(tenant.id, 'MOBILE')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        name: 'Mobile Core Engine',
        key: 'MOBILE',
      })
    )
  })

  it('create uniquifies a derived key that collides', async () => {
    repository.retrieveByKey
      .mockResolvedValueOnce(mockProjectRow) // 'MOBILE' taken
      .mockResolvedValueOnce(null) // 'MOBILE2' free
    repository.retrieveBySlug.mockResolvedValue(null)
    repository.create.mockImplementation(
      async (params: { key: string; name: string }) => ({
        ...mockProjectRow,
        name: params.name,
        key: params.key,
      })
    )

    const result = await service.create('org_test_1', {
      name: 'Mobile Core Engine',
    })

    expect(result.error).toBeNull()
    expect(result.data?.key).toBe('MOBILE2')
    expect(repository.retrieveByKey).toHaveBeenCalledWith(tenant.id, 'MOBILE')
    expect(repository.retrieveByKey).toHaveBeenCalledWith(tenant.id, 'MOBILE2')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        key: 'MOBILE2',
      })
    )
  })

  it('create rejects an explicit invalid key with projects/invalid-project-key', async () => {
    const result = await service.create('org_test_1', {
      name: 'Project With Bad Key',
      key: 'x', // too short, lowercase
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/invalid-project-key',
      message: 'A project key must be 2 to 10 uppercase letters or digits.',
      httpStatus: 400,
    })
    expect(repository.retrieveByKey).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create rejects an explicit colliding key with projects/project-key-taken', async () => {
    repository.retrieveByKey.mockResolvedValue(mockProjectRow)

    const result = await service.create('org_test_1', {
      name: 'Another Project',
      key: 'CONSOLE',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-key-taken',
      message: 'Another project already uses that key.',
      httpStatus: 409,
    })
    expect(repository.retrieveByKey).toHaveBeenCalledWith(tenant.id, 'CONSOLE')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create defaults status to planned and health to on-track', async () => {
    repository.retrieveByKey.mockResolvedValue(null)
    repository.retrieveBySlug.mockResolvedValue(null)
    repository.create.mockImplementation(
      async (params: { status: string; health: string }) => ({
        ...mockProjectRow,
        status: params.status,
        health: params.health,
      })
    )

    const result = await service.create('org_test_1', {
      name: 'New Defaults Project',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('planned')
    expect(result.data?.health).toBe('on-track')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        status: 'planned',
        health: 'on-track',
      })
    )
  })

  it('create returns the complete serialized shape including memberCount: 0', async () => {
    repository.retrieveByKey.mockResolvedValue(null)
    repository.retrieveBySlug.mockResolvedValue(null)
    repository.create.mockResolvedValue({
      ...mockProjectRow,
      id: 'prj_full_1',
      name: 'Full Shape Project',
      key: 'FULLSH',
      slug: 'full-shape-project',
      description: null,
      leadUserId: null,
      status: 'planned',
      health: 'on-track',
      startDate: null,
      targetDate: null,
      nextIssueNumber: 1,
      customerId: null,
      position: 0,
      archivedAt: null,
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
    })

    const result = await service.create('org_test_1', {
      name: 'Full Shape Project',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.project',
      id: 'prj_full_1',
      tenantId: tenant.id,
      name: 'Full Shape Project',
      key: 'FULLSH',
      slug: 'full-shape-project',
      description: null,
      leadUserId: null,
      status: 'planned',
      health: 'on-track',
      startDate: null,
      targetDate: null,
      nextIssueNumber: 1,
      customerId: null,
      position: 0,
      archivedAt: null,
      createdAt: 1787767200,
      updatedAt: 1787767200,
      memberCount: 0,
    })
  })

  it('list scopes the query by tenantId (assert the repository was called with it)', async () => {
    repository.list.mockResolvedValue([mockProjectRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', {})

    expect(result.error).toBeNull()
    expect(result.data?.items).toHaveLength(1)
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ limit: 25, includeArchived: false })
    )
    expect(repository.count).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ includeArchived: false })
    )
  })

  it('list applies the status filter and omits archived projects by default', async () => {
    repository.list.mockResolvedValue([mockProjectRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', {
      status: 'active',
    })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      status: 'active',
      lead: undefined,
      q: undefined,
      includeArchived: false,
      limit: 25,
      startingAfter: undefined,
      endingBefore: undefined,
    })
    expect(repository.count).toHaveBeenCalledWith(tenant.id, {
      status: 'active',
      lead: undefined,
      q: undefined,
      includeArchived: false,
    })
  })

  it('list includes archived projects when include_archived is true', async () => {
    repository.list.mockResolvedValue([mockProjectRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', {
      include_archived: 'true',
    })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ includeArchived: true })
    )
    expect(repository.count).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ includeArchived: true })
    )
  })

  it('list caps limit at 100', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', {
      limit: 500,
    })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ limit: 100 })
    )
  })

  it('retrieve returns projects/project-not-found for an unknown id', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.retrieve('org_test_1', 'prj_missing')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-not-found',
      message: 'The project could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'prj_missing')
  })

  it('retrieve returns projects/project-not-found for a project belonging to another tenant', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.retrieve('org_test_1', 'prj_other_tenant_id')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-not-found',
      message: 'The project could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      'prj_other_tenant_id'
    )
  })

  it('update applies only the supplied fields', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.update.mockResolvedValue({
      ...mockProjectRow,
      description: 'Brand new description',
      updatedAt: 1787823000n,
    })

    const result = await service.update('org_test_1', mockProjectRow.id, {
      description: 'Brand new description',
    })

    expect(result.error).toBeNull()
    expect(result.data?.description).toBe('Brand new description')
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.update).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id,
      expect.objectContaining({
        description: 'Brand new description',
        updatedAt: expect.any(BigInt),
      })
    )
    const updateCallArgs = repository.update.mock.calls[0][2]
    expect(updateCallArgs.name).toBeUndefined()
    expect(updateCallArgs.status).toBeUndefined()
  })

  it('update returns projects/project-not-found for an unknown id', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.update('org_test_1', 'prj_unknown', {
      name: 'New Name',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-not-found',
      message: 'The project could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'prj_unknown')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('delete archives by default and returns the tombstone shape', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.archive.mockResolvedValue({
      ...mockProjectRow,
      archivedAt: 1787767200n,
    })

    const result = await service.remove('org_test_1', mockProjectRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.project',
      id: mockProjectRow.id,
      deleted: true,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.archive).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id,
      expect.any(BigInt)
    )
    expect(repository.hardDelete).not.toHaveBeenCalled()
  })

  it("delete hard-deletes when DELETION_MODE === 'hard'", async () => {
    process.env.DELETION_MODE = 'hard'
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.hardDelete.mockResolvedValue(undefined)

    const result = await service.remove('org_test_1', mockProjectRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.project',
      id: mockProjectRow.id,
      deleted: true,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.hardDelete).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.archive).not.toHaveBeenCalled()
  })

  it('adding a member returns projects/member-exists on a duplicate', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.retrieveMember.mockResolvedValue(mockMemberRow)

    const result = await service.addMember('org_test_1', mockProjectRow.id, {
      userId: mockMemberRow.userId,
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/member-exists',
      message: 'That person is already a member of this project.',
      httpStatus: 409,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.retrieveMember).toHaveBeenCalledWith(
      mockProjectRow.id,
      mockMemberRow.userId
    )
    expect(repository.createMember).not.toHaveBeenCalled()
  })

  it('removing an absent member returns projects/member-not-found', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.retrieveMember.mockResolvedValue(null)

    const result = await service.removeMember(
      'org_test_1',
      mockProjectRow.id,
      'usr_nonexistent'
    )

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/member-not-found',
      message: 'That person is not a member of this project.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.retrieveMember).toHaveBeenCalledWith(
      mockProjectRow.id,
      'usr_nonexistent'
    )
    expect(repository.removeMember).not.toHaveBeenCalled()
  })

  it('retrieve returns complete serialized shape when found', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)

    const result = await service.retrieve('org_test_1', mockProjectRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.project',
      id: mockProjectRow.id,
      tenantId: tenant.id,
      name: 'Console Platform',
      key: 'CONSOLE',
      slug: 'console-platform',
      description: 'Main console UI project',
      leadUserId: 'usr_lead_1',
      status: 'planned',
      health: 'on-track',
      startDate: 1787767200,
      targetDate: 1788767200,
      nextIssueNumber: 1,
      customerId: null,
      position: 0,
      archivedAt: null,
      createdAt: 1787767200,
      updatedAt: 1787767200,
      memberCount: 0,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
  })

  it('list members returns list of serialized members for a project', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.listMembers.mockResolvedValue([mockMemberRow])

    const result = await service.listMembers('org_test_1', mockProjectRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        object: 'projects.project-member',
        id: mockMemberRow.id,
        projectId: mockMemberRow.projectId,
        userId: mockMemberRow.userId,
        role: 'member',
        createdAt: 1787767200,
      },
    ])
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      mockProjectRow.id
    )
    expect(repository.listMembers).toHaveBeenCalledWith(mockProjectRow.id)
  })

  it('adding a member succeeds and returns serialized member', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.retrieveMember.mockResolvedValue(null)
    repository.createMember.mockResolvedValue(mockMemberRow)

    const result = await service.addMember('org_test_1', mockProjectRow.id, {
      userId: 'usr_member_1',
      role: 'member',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.project-member',
      id: mockMemberRow.id,
      projectId: mockMemberRow.projectId,
      userId: mockMemberRow.userId,
      role: 'member',
      createdAt: 1787767200,
    })
    expect(repository.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockProjectRow.id,
        userId: 'usr_member_1',
        role: 'member',
        createdAt: expect.any(BigInt),
      })
    )
  })

  it('GET /v1/organizations/:organizationId/projects returns platform list envelope', async () => {
    repository.list.mockResolvedValue([mockProjectRow])
    repository.count.mockResolvedValue(1)

    const response = await requestJson(
      'GET',
      '/v1/organizations/org_test_1/projects'
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'projects.project',
            id: mockProjectRow.id,
            tenantId: tenant.id,
            name: 'Console Platform',
            key: 'CONSOLE',
            slug: 'console-platform',
            description: 'Main console UI project',
            leadUserId: 'usr_lead_1',
            status: 'planned',
            health: 'on-track',
            startDate: 1787767200,
            targetDate: 1788767200,
            nextIssueNumber: 1,
            customerId: null,
            position: 0,
            archivedAt: null,
            createdAt: 1787767200,
            updatedAt: 1787767200,
            memberCount: 0,
          },
        ],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_1/projects',
      },
      error: null,
    })
  })

  it('DELETE /v1/organizations/:organizationId/projects/:projectId archives project via HTTP route', async () => {
    repository.retrieve.mockResolvedValue(mockProjectRow)
    repository.archive.mockResolvedValue(mockProjectRow)

    const response = await requestJson(
      'DELETE',
      `/v1/organizations/org_test_1/projects/${mockProjectRow.id}`
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'projects.project',
        id: mockProjectRow.id,
        deleted: true,
      },
      error: null,
    })
  })

  it('rejects unauthorized HTTP requests when x-internal-key is missing or invalid', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_test_1/projects',
      undefined,
      { 'x-internal-key': 'invalid-key' }
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'projects/unauthorized',
        message: 'This request is missing valid credentials.',
      },
    })
    expect(repository.list).not.toHaveBeenCalled()
  })
})
