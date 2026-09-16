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

const ganttService = await import('../gantt.service.js')
const ganttSchemas = await import('../gantt.schemas.js')
const { createProjectsRouter } = await import('../projects.routes.js')

const tenant = {
  id: 'prjten_gantt_1',
  organizationId: 'org_gantt_1',
  triageProjectId: 'prj_triage_gantt',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const project = {
  id: 'prj_gantt_1',
  tenantId: tenant.id,
  name: 'Gantt Project',
  key: 'GANTT',
  slug: 'gantt-project',
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

function milestoneRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ms_phase_1',
    tenantId: tenant.id,
    projectId: project.id,
    key: 'phase-1',
    name: 'Phase One',
    startDate: 1788000000n,
    targetDate: 1788600000n,
    position: 0,
    ...overrides,
  }
}

function taskListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tl_list_1',
    tenantId: tenant.id,
    projectId: project.id,
    milestoneId: 'ms_phase_1',
    name: 'Build tasks',
    startDate: 1788000000n,
    targetDate: 1788300000n,
    position: 0,
    ...overrides,
  }
}

function issueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iss_gantt_a',
    tenantId: tenant.id,
    projectId: project.id,
    identifier: 'GANTT-1',
    title: 'First work item',
    status: 'todo',
    taskListId: 'tl_list_1',
    milestoneId: 'ms_phase_1',
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

function dependencyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'isd_gantt_1',
    predecessorIssueId: 'iss_gantt_a',
    successorIssueId: 'iss_gantt_b',
    type: 'finish-to-start',
    lagMinutes: 0,
    ...overrides,
  }
}

async function requestJson(method: string, path: string) {
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
  ganttRepo.listGanttMilestones.mockResolvedValue([])
  ganttRepo.listGanttTaskLists.mockResolvedValue([])
  ganttRepo.listGanttIssues.mockResolvedValue([])
  ganttRepo.listGanttDependencies.mockResolvedValue([])
})

describe('gantt read model', () => {
  it('returns empty rows and null range for an empty project', async () => {
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('gantt')
    expect(result.data?.rows).toEqual([])
    expect(result.data?.edges).toEqual([])
    expect(result.data?.criticalIssueIds).toEqual([])
    expect(result.data?.range).toEqual({ start: null, end: null })
  })

  it('orders rows depth-first phase to task-list to work-item to sub-item', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([milestoneRow()])
    ganttRepo.listGanttTaskLists.mockResolvedValue([taskListRow()])
    const parent = issueRow()
    const child = issueRow({
      id: 'iss_gantt_child',
      identifier: 'GANTT-2',
      title: 'Sub work item',
      parentIssueId: parent.id,
      taskListId: null,
      milestoneId: null,
      plannedStartDate: 1788010000n,
      plannedFinishDate: 1788020000n,
    })
    ganttRepo.listGanttIssues.mockResolvedValue([parent, child])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    const kinds = (result.data?.rows ?? []).map((row) => row.kind)
    expect(kinds).toEqual(['phase', 'task-list', 'work-item', 'sub-item'])
    const sub = (result.data?.rows ?? []).find((row) => row.kind === 'sub-item')
    const work = (result.data?.rows ?? []).find(
      (row) => row.kind === 'work-item'
    )
    expect(sub?.parentRowId).toBe(work?.id)
    expect(work?.parentRowId).toBe('task-list:tl_list_1')
  })

  it('marks a linear chain as critical and returns its edges', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    const a = issueRow({
      id: 'iss_gantt_a',
      identifier: 'GANTT-1',
      taskListId: null,
      milestoneId: null,
      plannedStartDate: 1000n,
      plannedFinishDate: 2000n,
      plannedDurationMinutes: null,
    })
    const b = issueRow({
      id: 'iss_gantt_b',
      identifier: 'GANTT-2',
      title: 'Second',
      taskListId: null,
      milestoneId: null,
      plannedStartDate: 2000n,
      plannedFinishDate: 3000n,
      plannedDurationMinutes: null,
    })
    ganttRepo.listGanttIssues.mockResolvedValue([a, b])
    ganttRepo.listGanttDependencies.mockResolvedValue([dependencyRow()])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.data?.criticalIssueIds).toEqual([
      'iss_gantt_a',
      'iss_gantt_b',
    ])
    expect(result.data?.edges).toHaveLength(1)
    expect(result.data?.edges[0]).toMatchObject({
      object: 'gantt-edge',
      predecessorIssueId: 'iss_gantt_a',
      successorIssueId: 'iss_gantt_b',
    })
    const rows = result.data?.rows ?? []
    expect(rows.every((row) => row.isCritical)).toBe(true)
  })

  it('leaves a parallel branch with slack off the critical path', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    const a = issueRow({
      id: 'iss_p_a',
      identifier: 'GANTT-10',
      taskListId: null,
      milestoneId: null,
      plannedStartDate: 0n,
      plannedFinishDate: 3600n,
      plannedDurationMinutes: null,
    })
    const b = issueRow({
      id: 'iss_p_b',
      identifier: 'GANTT-11',
      title: 'Long',
      taskListId: null,
      milestoneId: null,
      plannedStartDate: 3600n,
      plannedFinishDate: 7200n,
      plannedDurationMinutes: null,
    })
    const c = issueRow({
      id: 'iss_p_c',
      identifier: 'GANTT-12',
      title: 'Short',
      taskListId: null,
      milestoneId: null,
      plannedStartDate: 3600n,
      plannedFinishDate: 4200n,
      plannedDurationMinutes: null,
    })
    ganttRepo.listGanttIssues.mockResolvedValue([a, b, c])
    ganttRepo.listGanttDependencies.mockResolvedValue([
      {
        id: 'isd_p_1',
        predecessorIssueId: 'iss_p_a',
        successorIssueId: 'iss_p_b',
        type: 'finish-to-start',
        lagMinutes: 0,
      },
      {
        id: 'isd_p_2',
        predecessorIssueId: 'iss_p_a',
        successorIssueId: 'iss_p_c',
        type: 'finish-to-start',
        lagMinutes: 0,
      },
    ])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.data?.criticalIssueIds).toContain('iss_p_a')
    expect(result.data?.criticalIssueIds).toContain('iss_p_b')
    expect(result.data?.criticalIssueIds).not.toContain('iss_p_c')
  })

  it('excludes undated work items from the critical path but keeps their rows', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    const dated = issueRow({ taskListId: null, milestoneId: null })
    const undated = issueRow({
      id: 'iss_gantt_u',
      identifier: 'GANTT-9',
      title: 'No dates',
      taskListId: null,
      milestoneId: null,
      plannedStartDate: null,
      plannedFinishDate: null,
      plannedDurationMinutes: null,
    })
    ganttRepo.listGanttIssues.mockResolvedValue([dated, undated])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.data?.criticalIssueIds).not.toContain('iss_gantt_u')
    expect(
      (result.data?.rows ?? []).some((row) => row.issueId === 'iss_gantt_u')
    ).toBe(true)
    const undatedRow = (result.data?.rows ?? []).find(
      (row) => row.issueId === 'iss_gantt_u'
    )
    expect(undatedRow?.plannedStart).toBeNull()
    expect(undatedRow?.isCritical).toBe(false)
  })

  it('hides sub-items when includeSubItems is false', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    const parent = issueRow({ taskListId: null, milestoneId: null })
    const child = issueRow({
      id: 'iss_gantt_c2',
      identifier: 'GANTT-3',
      title: 'Child',
      taskListId: null,
      milestoneId: null,
      parentIssueId: parent.id,
    })
    ganttRepo.listGanttIssues.mockResolvedValue([parent, child])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: false,
    })
    expect(
      (result.data?.rows ?? []).some((row) => row.kind === 'sub-item')
    ).toBe(false)
    expect(
      (result.data?.rows ?? []).some((row) => row.issueId === parent.id)
    ).toBe(true)
  })

  it('computes range from the minimum start and maximum finish', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({
        taskListId: null,
        milestoneId: null,
        plannedStartDate: 5000n,
        plannedFinishDate: 6000n,
      }),
      issueRow({
        id: 'iss_gantt_b',
        identifier: 'GANTT-2',
        title: 'Later',
        taskListId: null,
        milestoneId: null,
        plannedStartDate: 7000n,
        plannedFinishDate: 9000n,
      }),
    ])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.data?.range).toEqual({ start: 5000, end: 9000 })
  })

  it('maps percentComplete and actual dates from issue state', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({
        taskListId: null,
        milestoneId: null,
        status: 'done',
        startedAt: 100n,
        completedAt: 200n,
      }),
      issueRow({
        id: 'iss_gantt_prog',
        identifier: 'GANTT-4',
        title: 'Active',
        taskListId: null,
        milestoneId: null,
        status: 'in-progress',
        startedAt: 300n,
        completedAt: null,
      }),
    ])
    const result = await ganttService.getGantt('org_gantt_1', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    const done = (result.data?.rows ?? []).find(
      (row) => row.issueId === 'iss_gantt_a'
    )
    const active = (result.data?.rows ?? []).find(
      (row) => row.issueId === 'iss_gantt_prog'
    )
    expect(done?.percentComplete).toBe(100)
    expect(done?.actualStart).toBe(100)
    expect(done?.actualFinish).toBe(200)
    expect(active?.percentComplete).toBe(0)
  })

  it('returns tenant-not-found when the organization has no workspace', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValue(null)
    const result = await ganttService.getGantt('org_missing', project.id, {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('returns project-not-found for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    projectsRepo.retrieveByKey.mockResolvedValue(null)
    const result = await ganttService.getGantt('org_gantt_1', 'prj_missing', {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/project-not-found')
  })

  it('accepts day week and month zoom values', () => {
    expect(ganttSchemas.parseGanttQuery({ zoom: 'day' }).zoom).toBe('day')
    expect(ganttSchemas.parseGanttQuery({ zoom: 'month' }).zoom).toBe('month')
    expect(ganttSchemas.parseGanttQuery({}).zoom).toBe('week')
  })

  it('rejects an unknown zoom value', () => {
    expect(() => ganttSchemas.parseGanttQuery({ zoom: 'year' })).toThrow()
  })

  it('parses includeSubItems from query strings', () => {
    expect(
      ganttSchemas.parseGanttQuery({ includeSubItems: 'false' }).includeSubItems
    ).toBe(false)
    expect(
      ganttSchemas.parseGanttQuery({ includeSubItems: 'true' }).includeSubItems
    ).toBe(true)
    expect(ganttSchemas.parseGanttQuery({}).includeSubItems).toBe(true)
  })

  it('serves the gantt payload over HTTP', async () => {
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    ganttRepo.listGanttTaskLists.mockResolvedValue([])
    ganttRepo.listGanttIssues.mockResolvedValue([
      issueRow({ taskListId: null, milestoneId: null }),
    ])
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_gantt_1/projects/${project.id}/gantt?zoom=week`
    )
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('gantt')
    expect(Array.isArray(response.body.data.rows)).toBe(true)
    expect(Array.isArray(response.body.data.criticalIssueIds)).toBe(true)
  })

  it('returns 404 over HTTP for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    projectsRepo.retrieveByKey.mockResolvedValue(null)
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_gantt_1/projects/prj_missing/gantt'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/project-not-found')
  })

  it('resolves projects by key as well as id', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    projectsRepo.retrieveByKey.mockResolvedValue(project)
    ganttRepo.listGanttMilestones.mockResolvedValue([])
    const result = await ganttService.getGantt('org_gantt_1', 'GANTT', {
      zoom: 'week',
      includeSubItems: true,
    })
    expect(result.error).toBeNull()
    expect(projectsRepo.retrieveByKey).toHaveBeenCalledWith(tenant.id, 'GANTT')
  })
})
