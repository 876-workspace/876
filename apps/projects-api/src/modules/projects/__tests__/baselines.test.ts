import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const {
  tenantsRepo,
  projectsRepo,
  workStructureRepo,
  milestoneDetailsRepo,
  milestoneListRepo,
  taskListsRepo,
  cyclesRepo,
  typeAccess,
  issuesRepo,
  issueLinksRepo,
  labelsRepo,
  commentsRepo,
  ganttRepo,
  baselinesRepo,
} = vi.hoisted(() => ({
  tenantsRepo: { retrieveByOrganization: vi.fn() },
  projectsRepo: {
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
  ganttRepo: {
    listGanttMilestones: vi.fn(),
    listGanttTaskLists: vi.fn(),
    listGanttIssues: vi.fn(),
    listGanttDependencies: vi.fn(),
  },
  baselinesRepo: {
    listBaselines: vi.fn(),
    retrieveBaseline: vi.fn(),
    countBaselineItems: vi.fn(),
    countBaselineItemsMany: vi.fn(),
    listBaselineItems: vi.fn(),
    createBaseline: vi.fn(),
    createBaselineItems: vi.fn(),
    deleteBaseline: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../projects.repository.js', () => projectsRepo)
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
vi.mock('../../work-structure/work-item-type-access.js', () => typeAccess)
vi.mock('../../issues/issues.repository.js', () => issuesRepo)
vi.mock('../../issues/issue-links.repository.js', () => issueLinksRepo)
vi.mock('../../labels/labels.repository.js', () => labelsRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)
vi.mock('../gantt.repository.js', () => ganttRepo)
vi.mock('../baselines.repository.js', () => baselinesRepo)

const service = await import('../baselines.service.js')
const schemas = await import('../baselines.schemas.js')
const { createProjectsRouter } = await import('../projects.routes.js')

const tenant = {
  id: 'prjten_base_1',
  organizationId: 'org_base_1',
  triageProjectId: 'prj_triage_base',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const project = {
  id: 'prj_base_1',
  tenantId: tenant.id,
  name: 'Baseline Project',
  key: 'BASE',
  slug: 'baseline-project',
  description: null,
  leadUserId: null,
  status: 'active',
  health: 'on-track',
  startDate: null,
  targetDate: null,
  nextIssueNumber: 10,
  customerId: null,
  defaultWorkItemTypeId: null,
  position: 0,
  archivedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
  _count: { members: 0 },
}

function baselineRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prjbl_1',
    tenantId: tenant.id,
    projectId: project.id,
    name: 'Sprint 1 baseline',
    capturedBy: 'usr_1',
    capturedAt: 1788000000n,
    note: null,
    ...overrides,
  }
}

function baselineItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prjbli_1',
    tenantId: tenant.id,
    baselineId: 'prjbl_1',
    issueId: 'iss_base_a',
    plannedStartDate: 1788000000n,
    plannedFinishDate: 1788086400n,
    plannedDurationMinutes: 1440,
    status: 'todo',
    ...overrides,
  }
}

function issueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iss_base_a',
    tenantId: tenant.id,
    projectId: project.id,
    identifier: 'BASE-1',
    title: 'Baseline work item',
    status: 'todo',
    taskListId: null,
    milestoneId: null,
    parentIssueId: null,
    plannedStartDate: 1788000000n,
    plannedFinishDate: 1788086400n,
    plannedDurationMinutes: 1440,
    position: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    ...overrides,
  }
}

async function requestJson(method: string, path: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/projects', createProjectsRouter())
  app.use(errorHandler)
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
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  projectsRepo.retrieve.mockResolvedValue(project)
  projectsRepo.retrieveByKey.mockResolvedValue(null)
  baselinesRepo.listBaselines.mockResolvedValue([])
  baselinesRepo.countBaselineItemsMany.mockResolvedValue(new Map())
  baselinesRepo.listBaselineItems.mockResolvedValue([])
  baselinesRepo.retrieveBaseline.mockResolvedValue(null)
  ganttRepo.listGanttIssues.mockResolvedValue([])
})

describe('project baselines', () => {
  it('lists baselines for a project with item counts', async () => {
    baselinesRepo.listBaselines.mockResolvedValue([baselineRow()])
    baselinesRepo.countBaselineItemsMany.mockResolvedValue(
      new Map([['prjbl_1', 3]])
    )
    const result = await service.listBaselines('org_base_1', project.id)
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toMatchObject({
      object: 'projects.baseline',
      id: 'prjbl_1',
      itemCount: 3,
    })
    expect(baselinesRepo.listBaselines).toHaveBeenCalledWith(
      tenant.id,
      project.id
    )
  })

  it('captures a snapshot of every work item with planned dates', async () => {
    const dated = issueRow()
    const undated = issueRow({
      id: 'iss_base_u',
      identifier: 'BASE-2',
      title: 'Undated',
      plannedStartDate: null,
      plannedFinishDate: null,
      plannedDurationMinutes: null,
    })
    ganttRepo.listGanttIssues.mockResolvedValue([dated, undated])
    baselinesRepo.createBaseline.mockImplementation(
      async (params: Record<string, unknown>) => ({
        ...baselineRow(),
        ...params,
      })
    )
    baselinesRepo.createBaselineItems.mockResolvedValue(1)
    baselinesRepo.listBaselineItems.mockResolvedValue([baselineItemRow()])
    const result = await service.createBaseline('org_base_1', project.id, {
      name: 'Sprint 1 baseline',
    })
    expect(result.error).toBeNull()
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.items[0].issueId).toBe('iss_base_a')
    const createdItems = baselinesRepo.createBaselineItems.mock
      .calls[0]?.[0] as Array<{ issueId: string }>
    expect(createdItems.map((item) => item.issueId)).toEqual(['iss_base_a'])
  })

  it('stores the snapshot dates and status at capture time', async () => {
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({ status: 'in-progress' }),
    ])
    baselinesRepo.createBaseline.mockImplementation(
      async (params: Record<string, unknown>) => ({
        ...baselineRow(),
        ...params,
      })
    )
    baselinesRepo.createBaselineItems.mockResolvedValue(1)
    baselinesRepo.listBaselineItems.mockResolvedValue([
      baselineItemRow({ status: 'in-progress' }),
    ])
    const result = await service.createBaseline('org_base_1', project.id, {
      name: 'Capture',
      note: 'before sprint',
      capturedBy: 'usr_1',
    })
    expect(result.data?.name).toBe('Capture')
    expect(baselinesRepo.createBaseline).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        projectId: project.id,
        name: 'Capture',
      })
    )
    const stored = baselinesRepo.createBaselineItems.mock
      .calls[0]?.[0] as Array<Record<string, unknown>>
    expect(stored[0]).toMatchObject({
      issueId: 'iss_base_a',
      status: 'in-progress',
    })
  })

  it('retrieves a baseline with its items', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    baselinesRepo.listBaselineItems.mockResolvedValue([baselineItemRow()])
    const result = await service.retrieveBaseline('org_base_1', 'prjbl_1')
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('prjbl_1')
    expect(result.data?.items).toHaveLength(1)
  })

  it('returns baseline-not-found for an unknown baseline', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(null)
    const result = await service.retrieveBaseline('org_base_1', 'prjbl_missing')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/baseline-not-found')
  })

  it('deletes a baseline and returns a tombstone', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    baselinesRepo.deleteBaseline.mockResolvedValue(undefined)
    const result = await service.removeBaseline('org_base_1', 'prjbl_1')
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.baseline',
      id: 'prjbl_1',
      deleted: true,
    })
    expect(baselinesRepo.deleteBaseline).toHaveBeenCalledWith(
      tenant.id,
      'prjbl_1'
    )
  })

  it('returns baseline-not-found when deleting an unknown baseline', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(null)
    const result = await service.removeBaseline('org_base_1', 'prjbl_missing')
    expect(result.error?.code).toBe('projects/baseline-not-found')
  })

  it('computes positive variance when work slips later than baseline', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    baselinesRepo.listBaselineItems.mockResolvedValue([baselineItemRow()])
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({
        plannedStartDate: 1788000000n + 3600n,
        plannedFinishDate: 1788086400n + 7200n,
      }),
    ])
    const result = await service.compareBaseline(
      'org_base_1',
      project.id,
      'prjbl_1'
    )
    expect(result.error).toBeNull()
    expect(result.data?.items[0].startVarianceMinutes).toBe(60)
    expect(result.data?.items[0].finishVarianceMinutes).toBe(120)
  })

  it('computes negative variance when work moves earlier than baseline', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    baselinesRepo.listBaselineItems.mockResolvedValue([baselineItemRow()])
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({
        plannedStartDate: 1788000000n - 1800n,
        plannedFinishDate: 1788086400n - 3600n,
      }),
    ])
    const result = await service.compareBaseline(
      'org_base_1',
      project.id,
      'prjbl_1'
    )
    expect(result.data?.items[0].startVarianceMinutes).toBe(-30)
    expect(result.data?.items[0].finishVarianceMinutes).toBe(-60)
  })

  it('returns null variance when either side has no date', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    baselinesRepo.listBaselineItems.mockResolvedValue([
      baselineItemRow({ plannedStartDate: null, plannedFinishDate: null }),
    ])
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({
        plannedStartDate: 1788000000n,
        plannedFinishDate: 1788086400n,
      }),
    ])
    const result = await service.compareBaseline(
      'org_base_1',
      project.id,
      'prjbl_1'
    )
    expect(result.data?.items[0].startVarianceMinutes).toBeNull()
  })

  it('returns baseline-not-found when the baseline belongs to another project', async () => {
    baselinesRepo.retrieveBaseline.mockResolvedValue(
      baselineRow({ projectId: 'prj_other' })
    )
    const result = await service.compareBaseline(
      'org_base_1',
      project.id,
      'prjbl_1'
    )
    expect(result.error?.code).toBe('projects/baseline-not-found')
  })

  it('returns project-not-found for an unknown project on list', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    projectsRepo.retrieveByKey.mockResolvedValue(null)
    const result = await service.listBaselines('org_base_1', 'prj_missing')
    expect(result.error?.code).toBe('projects/project-not-found')
  })

  it('returns tenant-not-found when the organization has no workspace', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValue(null)
    const result = await service.listBaselines('org_missing', project.id)
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('does not leak baselines across tenants', async () => {
    tenantsRepo.retrieveByOrganization.mockImplementation(
      async (org: string) => (org === 'org_base_1' ? tenant : null)
    )
    const result = await service.retrieveBaseline('org_other', 'prjbl_1')
    expect(result.error?.code).toBe('projects/tenant-not-found')
    expect(baselinesRepo.retrieveBaseline).not.toHaveBeenCalled()
  })

  it('validates baseline creation input', () => {
    expect(() => schemas.createBaselineBodySchema.parse({ name: '' })).toThrow()
    expect(schemas.createBaselineBodySchema.parse({ name: 'Valid' }).name).toBe(
      'Valid'
    )
  })

  it('serves baseline list and comparison over HTTP', async () => {
    baselinesRepo.listBaselines.mockResolvedValue([baselineRow()])
    baselinesRepo.countBaselineItemsMany.mockResolvedValue(
      new Map([['prjbl_1', 1]])
    )
    const list = await requestJson(
      'GET',
      `/v1/organizations/org_base_1/projects/${project.id}/baselines`
    )
    expect(list.status).toBe(200)
    expect(list.body.data.data[0].id).toBe('prjbl_1')

    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    baselinesRepo.listBaselineItems.mockResolvedValue([baselineItemRow()])
    ganttRepo.listGanttIssues.mockResolvedValue([issueRow()])
    const comparison = await requestJson(
      'GET',
      `/v1/organizations/org_base_1/projects/${project.id}/baselines/prjbl_1/comparison`
    )
    expect(comparison.status).toBe(200)
    expect(comparison.body.data.object).toBe('baseline-comparison')
  })

  it('creates and deletes baselines over HTTP', async () => {
    ganttRepo.listGanttIssues.mockResolvedValue([issueRow()])
    baselinesRepo.createBaseline.mockImplementation(
      async (params: Record<string, unknown>) => ({
        ...baselineRow(),
        ...params,
      })
    )
    baselinesRepo.createBaselineItems.mockResolvedValue(1)
    baselinesRepo.listBaselineItems.mockResolvedValue([baselineItemRow()])
    const created = await requestJson(
      'POST',
      `/v1/organizations/org_base_1/projects/${project.id}/baselines`,
      { name: 'HTTP baseline' }
    )
    expect(created.status).toBe(201)

    baselinesRepo.retrieveBaseline.mockResolvedValue(baselineRow())
    const removed = await requestJson(
      'DELETE',
      '/v1/organizations/org_base_1/projects/baselines/prjbl_1'
    )
    expect(removed.status).toBe(200)
    expect(removed.body.data.deleted).toBe(true)
  })
})
