import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tenantsRepo,
  repository,
  workStructureRepo,
  milestoneDetailsRepo,
  milestoneListRepo,
  taskListsRepo,
  cyclesRepo,
  projectsRepo,
  commentsRepo,
  issuesRepo,
  issueLinksRepo,
} = vi.hoisted(() => ({
  tenantsRepo: {
    retrieveByOrganization: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    retrieveByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
  },
  // `labels.service.ts` reaches `tenants/index.js`, whose service now calls
  // `work-structure.service.ts` to backfill a pre-Phase-2 tenant on
  // `ensure()`. That file also imports the projects and issues modules for
  // unrelated resources, and every one of those repositories connects to
  // the DB pool at module-eval time — so each must be mocked here too.
  workStructureRepo: { seedPreset: vi.fn() },
  // Phase-2 added milestone detail/list repositories that connect to the DB
  // pool at module-eval time via `work-structure.routes.ts`. Mock them here
  // too, or importing `labels.service.js` throws
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
  taskListsRepo: {
    listTaskLists: vi.fn(),
    retrieveTaskList: vi.fn(),
    createTaskList: vi.fn(),
    updateTaskList: vi.fn(),
    softDeleteTaskList: vi.fn(),
    taskListProgress: vi.fn(),
    countProjectTaskLists: vi.fn(),
    listProjectIssuesForBreakdown: vi.fn(),
    assignIssuesToTaskList: vi.fn(),
  },
  cyclesRepo: {
    listCycles: vi.fn(),
    retrieveCycle: vi.fn(),
    retrieveCycleByNumber: vi.fn(),
    maxCycleNumber: vi.fn(),
    createCycle: vi.fn(),
    updateCycle: vi.fn(),
    softDeleteCycle: vi.fn(),
    cycleProgress: vi.fn(),
    cycleThroughput: vi.fn(),
    assignIssuesToCycle: vi.fn(),
    unassignIssueFromCycle: vi.fn(),
  },
  projectsRepo: { retrieve: vi.fn(), retrieveByKey: vi.fn() },
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
  issueLinksRepo: {
    listRelations: vi.fn(),
    findRelation: vi.fn(),
    findRelationBetween: vi.fn(),
    findUnorderedRelation: vi.fn(),
    createRelation: vi.fn(),
    deleteRelation: vi.fn(),
    listPredecessorLinks: vi.fn(),
    listSuccessorLinks: vi.fn(),
    listSuccessorDependencies: vi.fn(),
    findDependency: vi.fn(),
    findDependencyBetween: vi.fn(),
    createDependency: vi.fn(),
    updateDependency: vi.fn(),
    deleteDependency: vi.fn(),
    listSuccessorIds: vi.fn(),
    listRelationsForIssues: vi.fn(),
    listDependenciesForIssues: vi.fn(),
    listIssueStatuses: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../labels.repository.js', () => repository)
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
vi.mock('../../work-structure/task-lists.repository.js', () => taskListsRepo)
vi.mock('../../work-structure/cycles.repository.js', () => cyclesRepo)
vi.mock('../../projects/projects.repository.js', () => projectsRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)
vi.mock('../../issues/issues.repository.js', () => issuesRepo)
vi.mock('../../issues/issue-links.repository.js', () => issueLinksRepo)

const service = await import('../labels.service.js')
const { createLabelsRouter } = await import('../labels.routes.js')

const tenant = {
  id: 'prjten_test_1',
  organizationId: 'org_test_1',
  triageProjectId: 'prj_triage_1',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const mockLabelRow = {
  id: 'lbl_alpha_1',
  tenantId: tenant.id,
  name: 'bug',
  color: '#e11d48',
  description: 'Something broken',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/labels', createLabelsRouter())
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
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
})

describe('labels module', () => {
  it('create rejects a duplicate name with projects/label-name-taken (complete error object)', async () => {
    repository.retrieveByName.mockResolvedValue(mockLabelRow)

    const result = await service.create('org_test_1', {
      name: 'bug',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/label-name-taken',
      message: 'Another label already uses that name.',
      httpStatus: 409,
    })
    expect(repository.retrieveByName).toHaveBeenCalledWith(tenant.id, 'bug')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('create defaults the colour', async () => {
    repository.retrieveByName.mockResolvedValue(null)
    repository.create.mockImplementation(
      async (params: {
        id: string
        tenantId: string
        name: string
        color: string
        description?: string | null
        createdAt: bigint
        updatedAt: bigint
      }) => ({
        id: params.id,
        tenantId: params.tenantId,
        name: params.name,
        color: params.color,
        description: params.description ?? null,
        createdAt: params.createdAt,
        updatedAt: params.updatedAt,
      })
    )

    const result = await service.create('org_test_1', {
      name: 'feature',
    })

    expect(result.error).toBeNull()
    expect(result.data?.color).toBe('#6b7280')
    expect(repository.retrieveByName).toHaveBeenCalledWith(tenant.id, 'feature')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        name: 'feature',
        color: '#6b7280',
        description: null,
      })
    )
  })

  it('list is tenant-scoped and name-ascending', async () => {
    repository.list.mockResolvedValue([mockLabelRow])

    const result = await service.list('org_test_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        object: 'projects.label',
        id: mockLabelRow.id,
        tenantId: tenant.id,
        name: 'bug',
        color: '#e11d48',
        description: 'Something broken',
        createdAt: 1787767200,
        updatedAt: 1787767200,
      },
    ])
    expect(repository.list).toHaveBeenCalledWith(tenant.id)
  })

  it('update applies only supplied fields', async () => {
    repository.retrieve.mockResolvedValue(mockLabelRow)
    repository.update.mockResolvedValue({
      ...mockLabelRow,
      color: '#10b981',
      updatedAt: 1787823000n,
    })

    const result = await service.update('org_test_1', mockLabelRow.id, {
      color: '#10b981',
    })

    expect(result.error).toBeNull()
    expect(result.data?.color).toBe('#10b981')
    expect(result.data?.name).toBe('bug')
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, mockLabelRow.id)
    expect(repository.update).toHaveBeenCalledWith(
      tenant.id,
      mockLabelRow.id,
      expect.objectContaining({
        color: '#10b981',
        updatedAt: expect.any(BigInt),
      })
    )
    const updateCallArgs = repository.update.mock.calls[0][2]
    expect(updateCallArgs.name).toBeUndefined()
    expect(updateCallArgs.description).toBeUndefined()
  })

  it('update of an unknown label returns projects/label-not-found', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.update('org_test_1', 'lbl_missing', {
      name: 'new-name',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/label-not-found',
      message: 'The label could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'lbl_missing')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('delete removes the label', async () => {
    repository.retrieve.mockResolvedValue(mockLabelRow)
    repository.hardDelete.mockResolvedValue(undefined)

    const result = await service.remove('org_test_1', mockLabelRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.label',
      id: mockLabelRow.id,
      deleted: true,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, mockLabelRow.id)
    expect(repository.hardDelete).toHaveBeenCalledWith(
      tenant.id,
      mockLabelRow.id
    )
  })

  it('retrieve returns complete serialized shape when found', async () => {
    repository.retrieve.mockResolvedValue(mockLabelRow)

    const result = await service.retrieve('org_test_1', mockLabelRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.label',
      id: mockLabelRow.id,
      tenantId: tenant.id,
      name: 'bug',
      color: '#e11d48',
      description: 'Something broken',
      createdAt: 1787767200,
      updatedAt: 1787767200,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, mockLabelRow.id)
  })

  it('retrieve returns projects/label-not-found for an unknown id', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.retrieve('org_test_1', 'lbl_missing')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/label-not-found',
      message: 'The label could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'lbl_missing')
  })

  it('GET /v1/organizations/:organizationId/labels returns platform list envelope', async () => {
    repository.list.mockResolvedValue([mockLabelRow])

    const response = await requestJson(
      'GET',
      '/v1/organizations/org_test_1/labels'
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'projects.label',
            id: mockLabelRow.id,
            tenantId: tenant.id,
            name: 'bug',
            color: '#e11d48',
            description: 'Something broken',
            createdAt: 1787767200,
            updatedAt: 1787767200,
          },
        ],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_1/labels',
      },
      error: null,
    })
  })

  it('rejects unauthorized HTTP requests when x-internal-key is missing or invalid', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_test_1/labels',
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
