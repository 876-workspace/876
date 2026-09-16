import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  tenantsRepo,
  projectsRepo,
  repository,
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
  calendarRepo,
  timeRepo,
  financeRepo,
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
  repository: {
    listCapacities: vi.fn(),
    retrieveCapacity: vi.fn(),
    createCapacity: vi.fn(),
    updateCapacity: vi.fn(),
    softDeleteCapacity: vi.fn(),
    listReportProjects: vi.fn(),
    retrieveReportProject: vi.fn(),
    listReportIssues: vi.fn(),
    listReportTimeEntries: vi.fn(),
    listReportBudgets: vi.fn(),
    listReportRates: vi.fn(),
    retrieveReportBilling: vi.fn(),
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
  calendarRepo: {
    createEvent: vi.fn(),
    listEvents: vi.fn(),
    retrieveEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    createAttendee: vi.fn(),
    retrieveAttendee: vi.fn(),
    listAttendeesForEvents: vi.fn(),
    listAttendeesByUser: vi.fn(),
    updateAttendee: vi.fn(),
    deleteAttendee: vi.fn(),
    createReminder: vi.fn(),
    listRemindersByCreator: vi.fn(),
    listActiveReminders: vi.fn(),
    retrieveReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
    listCalendarProjects: vi.fn(),
    listCalendarMilestones: vi.fn(),
    listCalendarIssues: vi.fn(),
    listAssignedIssues: vi.fn(),
    retrieveIssueDueDate: vi.fn(),
    retrieveMilestoneTargetDate: vi.fn(),
    retrieveEventStart: vi.fn(),
  },
  timeRepo: {
    createTimeEntry: vi.fn(),
    listTimeEntries: vi.fn(),
    retrieveTimeEntry: vi.fn(),
    retrieveRunningEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    softDeleteTimeEntry: vi.fn(),
    startTimerAtomic: vi.fn(),
    listTimesheetEntries: vi.fn(),
    attachEntriesToTimesheet: vi.fn(),
    setEntriesApprovalForTimesheet: vi.fn(),
    listEntriesForSummary: vi.fn(),
    createTimesheet: vi.fn(),
    listTimesheets: vi.fn(),
    retrieveTimesheet: vi.fn(),
    updateTimesheet: vi.fn(),
    createTimesheetEvent: vi.fn(),
    listTimesheetEvents: vi.fn(),
  },
  financeRepo: {
    retrieveBilling: vi.fn(),
    upsertBilling: vi.fn(),
    listBudgets: vi.fn(),
    retrieveBudget: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    listRates: vi.fn(),
    retrieveRate: vi.fn(),
    createRate: vi.fn(),
    updateRate: vi.fn(),
    deleteRate: vi.fn(),
    listSummaryEntries: vi.fn(),
    listPeriodBillableEntries: vi.fn(),
    listPlannedIssues: vi.fn(),
    markEntriesBilled: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../../projects/projects.repository.js', () => projectsRepo)
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
vi.mock('../../projects/gantt.repository.js', () => ganttRepo)
vi.mock('../../projects/baselines.repository.js', () => baselinesRepo)
vi.mock('../../calendar/calendar.repository.js', () => calendarRepo)
vi.mock('../../time/time.repository.js', () => timeRepo)
vi.mock('../../finance/finance.repository.js', () => financeRepo)
vi.mock('../reports.repository.js', () => repository)
vi.mock('@876/billing/service', () => ({ create876BillingServiceClient: vi.fn() }))

const service = await import('../reports.service.js')

const NOW = 1788000000

const tenant = {
  id: 'prjten_rep_1',
  organizationId: 'org_rep_1',
  triageProjectId: 'prj_triage_rep',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

function projectRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prj_alpha',
    tenantId: tenant.id,
    name: 'Alpha',
    key: 'ALPHA',
    archivedAt: null,
    ...overrides,
  }
}

let issueSequence = 0
function issueRow(overrides: Record<string, unknown> = {}) {
  issueSequence += 1
  return {
    id: `iss_${issueSequence}`,
    tenantId: tenant.id,
    projectId: 'prj_alpha',
    identifier: `ALPHA-${issueSequence}`,
    title: `Issue ${issueSequence}`,
    status: 'todo',
    typeKey: 'task',
    assigneeUserId: null,
    estimate: null,
    dueDate: null,
    deletedAt: null,
    ...overrides,
  }
}

let entrySequence = 0
function entryRow(overrides: Record<string, unknown> = {}) {
  entrySequence += 1
  return {
    id: `tme_${entrySequence}`,
    tenantId: tenant.id,
    projectId: 'prj_alpha',
    issueId: null,
    userId: 'usr_1',
    startedAt: 1787900000n,
    durationMinutes: 60,
    billable: true,
    deletedAt: null,
    ...overrides,
  }
}

function budgetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bdg_1',
    tenantId: tenant.id,
    projectId: 'prj_alpha',
    scope: 'project',
    amountMinor: null,
    hours: null,
    thresholdPercent: 80,
    ...overrides,
  }
}

function rateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rte_1',
    tenantId: tenant.id,
    projectId: 'prj_alpha',
    userId: null,
    scope: 'project',
    billRateMinor: 6000,
    costRateMinor: 3000,
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  }
}

function capacityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cap_1',
    tenantId: tenant.id,
    userId: 'usr_1',
    minutesPerWeek: 2400,
    effectiveFrom: 1787800000n,
    effectiveTo: null,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: 1787800000n,
    updatedAt: 1787800000n,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  issueSequence = 0
  entrySequence = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW * 1000))
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  repository.listCapacities.mockResolvedValue([])
  repository.retrieveCapacity.mockResolvedValue(null)
  repository.listReportProjects.mockResolvedValue([])
  repository.retrieveReportProject.mockResolvedValue(null)
  repository.listReportIssues.mockResolvedValue([])
  repository.listReportTimeEntries.mockResolvedValue([])
  repository.listReportBudgets.mockResolvedValue([])
  repository.listReportRates.mockResolvedValue([])
  repository.retrieveReportBilling.mockResolvedValue(null)
})

describe('work report', () => {
  it('groups issues by state and reports the total', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'in-progress' }),
      issueRow({ status: 'done' }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.work-report')
    expect(result.data?.total).toBe(4)
    expect(result.data?.byState).toEqual([
      { key: 'todo', label: 'todo', count: 2 },
      { key: 'done', label: 'done', count: 1 },
      { key: 'in-progress', label: 'in-progress', count: 1 },
    ])
  })

  it('groups issues by type', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ typeKey: 'bug' }),
      issueRow({ typeKey: 'bug' }),
      issueRow({ typeKey: 'task' }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.byType).toEqual([
      { key: 'bug', label: 'bug', count: 2 },
      { key: 'task', label: 'task', count: 1 },
    ])
  })

  it('groups issues by assignee with an unassigned bucket', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ assigneeUserId: 'usr_1' }),
      issueRow({ assigneeUserId: 'usr_1' }),
      issueRow({ assigneeUserId: null }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.byAssignee).toEqual([
      { key: 'usr_1', label: 'usr_1', count: 2 },
      { key: 'unassigned', label: 'unassigned', count: 1 },
    ])
  })

  it('counts open items with a past due date as overdue', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', dueDate: BigInt(NOW - 60) }),
      issueRow({ status: 'in-progress', dueDate: BigInt(NOW - 3600) }),
      issueRow({ status: 'todo', dueDate: BigInt(NOW + 3600) }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.overdue).toBe(2)
  })

  it('does not count an issue due exactly now as overdue', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', dueDate: BigInt(NOW) }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.overdue).toBe(0)
  })

  it('does not count closed or undated issues as overdue', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'done', dueDate: BigInt(NOW - 60) }),
      issueRow({ status: 'canceled', dueDate: BigInt(NOW - 60) }),
      issueRow({ status: 'todo', dueDate: null }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.overdue).toBe(0)
  })

  it('excludes soft-deleted issues from grouping and totals', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo', deletedAt: BigInt(NOW - 10) }),
    ])
    const result = await service.getWorkReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.total).toBe(1)
    expect(result.data?.byState).toEqual([
      { key: 'todo', label: 'todo', count: 1 },
    ])
  })

  it('scopes the report to one project when projectId is given', async () => {
    repository.retrieveReportProject.mockResolvedValue(projectRow())
    repository.listReportIssues.mockResolvedValue([issueRow()])
    const result = await service.getWorkReport('org_rep_1', {
      projectId: 'ALPHA',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.error).toBeNull()
    expect(repository.retrieveReportProject).toHaveBeenCalledWith(
      tenant.id,
      'ALPHA'
    )
    expect(repository.listReportIssues).toHaveBeenCalledWith(tenant.id, {
      projectId: 'prj_alpha',
    })
  })

  it('returns project-not-found for an unknown project', async () => {
    repository.retrieveReportProject.mockResolvedValue(null)
    const result = await service.getWorkReport('org_rep_1', {
      projectId: 'NOPE',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-not-found',
      message: 'The project could not be found.',
      httpStatus: 404,
    })
  })

  it('rejects a period where to equals from with invalid-period', async () => {
    const result = await service.getWorkReport('org_rep_1', {
      from: 1788100000,
      to: 1788100000,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-period')
    expect(result.error?.httpStatus).toBe(422)
  })

  it('rejects a period where to is before from with invalid-period', async () => {
    const result = await service.getWorkReport('org_rep_1', {
      from: 1788100000,
      to: 1787800000,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-period')
  })

  it('returns tenant-not-found for an unknown organization', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValue(null)
    const result = await service.getWorkReport('org_unknown', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('isolates tenants by querying with the resolved tenant id', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValue({
      ...tenant,
      id: 'prjten_other',
      organizationId: 'org_other',
    })
    await service.getWorkReport('org_other', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(repository.listReportIssues).toHaveBeenCalledWith('prjten_other', {
      projectId: undefined,
    })
  })
})

describe('health report', () => {
  it('reports on-track for a healthy project with progress', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'done' }),
      issueRow({ status: 'todo', dueDate: BigInt(NOW + 3600) }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.health-report')
    expect(result.data?.data).toEqual([
      {
        projectId: 'prj_alpha',
        name: 'Alpha',
        health: 'on-track',
        progressPercent: 50,
        overdue: 0,
        openItems: 1,
        budgetConsumedPercent: null,
      },
    ])
  })

  it('reports unknown with null progress when nothing is open or budgeted', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'done' }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.[0]?.health).toBe('unknown')
    expect(result.data?.data?.[0]?.progressPercent).toBe(100)
    expect(result.data?.data?.[0]?.budgetConsumedPercent).toBeNull()
  })

  it('reports null progress percent when a project has no issues', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.[0]?.health).toBe('unknown')
    expect(result.data?.data?.[0]?.progressPercent).toBeNull()
  })

  it('reports at-risk when one item is overdue', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', dueDate: BigInt(NOW - 60) }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.[0]?.health).toBe('at-risk')
    expect(result.data?.data?.[0]?.overdue).toBe(1)
    expect(result.data?.data?.[0]?.openItems).toBe(6)
  })

  it('reports off-track when overdue items exceed 20% of open', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', dueDate: BigInt(NOW - 60) }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.[0]?.health).toBe('off-track')
  })

  it('reports at-risk at exactly 20% overdue', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', dueDate: BigInt(NOW - 60) }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
      issueRow({ status: 'todo' }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.[0]?.health).toBe('at-risk')
  })

  it('reports off-track when the budget is consumed past 100%', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([issueRow({ status: 'todo' })])
    repository.listReportBudgets.mockResolvedValue([
      budgetRow({ amountMinor: 10000, thresholdPercent: 80 }),
    ])
    repository.listReportRates.mockResolvedValue([rateRow()])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ durationMinutes: 300, billable: false }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    const row = result.data?.data?.[0]
    expect(row?.budgetConsumedPercent).toBe(150)
    expect(row?.health).toBe('off-track')
  })

  it('reports at-risk when spend passes the budget threshold', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([issueRow({ status: 'todo' })])
    repository.listReportBudgets.mockResolvedValue([
      budgetRow({ amountMinor: 10000, thresholdPercent: 80 }),
    ])
    repository.listReportRates.mockResolvedValue([rateRow()])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ durationMinutes: 170, billable: false }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    const row = result.data?.data?.[0]
    expect(row?.budgetConsumedPercent).toBe(85)
    expect(row?.health).toBe('at-risk')
  })

  it('excludes archived projects from the health report', async () => {
    repository.listReportProjects.mockResolvedValue([
      projectRow(),
      projectRow({
        id: 'prj_old',
        name: 'Old',
        key: 'OLD',
        archivedAt: BigInt(NOW - 100),
      }),
    ])
    repository.listReportIssues.mockResolvedValue([])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.map((row) => row.projectId)).toEqual(['prj_alpha'])
  })

  it('excludes soft-deleted issues from health counts', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', dueDate: BigInt(NOW - 60) }),
      issueRow({
        status: 'todo',
        dueDate: BigInt(NOW - 60),
        deletedAt: BigInt(NOW - 10),
      }),
    ])
    const result = await service.getHealthReport('org_rep_1')
    expect(result.data?.data?.[0]?.overdue).toBe(1)
    expect(result.data?.data?.[0]?.openItems).toBe(1)
  })
})

describe('time report', () => {
  it('groups entries by project with billable split and project labels', async () => {
    repository.listReportProjects.mockResolvedValue([
      projectRow(),
      projectRow({ id: 'prj_beta', name: 'Beta', key: 'BETA' }),
    ])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ projectId: 'prj_alpha', durationMinutes: 60, billable: true }),
      entryRow({ projectId: 'prj_alpha', durationMinutes: 30, billable: false }),
      entryRow({ projectId: 'prj_beta', durationMinutes: 15, billable: true }),
    ])
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'project',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.time-report')
    expect(result.data?.groupBy).toBe('project')
    expect(result.data?.data).toEqual([
      { key: 'prj_alpha', label: 'Alpha', billableMinutes: 60, nonBillableMinutes: 30 },
      { key: 'prj_beta', label: 'Beta', billableMinutes: 15, nonBillableMinutes: 0 },
    ])
  })

  it('groups entries by user', async () => {
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 60, billable: true }),
      entryRow({ userId: 'usr_2', durationMinutes: 45, billable: false }),
      entryRow({ userId: 'usr_1', durationMinutes: 15, billable: true }),
    ])
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'user',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data).toEqual([
      { key: 'usr_1', label: 'usr_1', billableMinutes: 75, nonBillableMinutes: 0 },
      { key: 'usr_2', label: 'usr_2', billableMinutes: 0, nonBillableMinutes: 45 },
    ])
  })

  it('groups entries by issue with identifier labels', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ id: 'iss_a', identifier: 'ALPHA-7' }),
    ])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ issueId: 'iss_a', durationMinutes: 60, billable: true }),
      entryRow({ issueId: null, durationMinutes: 20, billable: false }),
    ])
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'issue',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data).toEqual([
      { key: 'iss_a', label: 'ALPHA-7', billableMinutes: 60, nonBillableMinutes: 0 },
      { key: 'unassigned', label: 'unassigned', billableMinutes: 0, nonBillableMinutes: 20 },
    ])
  })

  it('treats null durations as zero minutes', async () => {
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: null, billable: true }),
    ])
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'user',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data).toEqual([
      { key: 'usr_1', label: 'usr_1', billableMinutes: 0, nonBillableMinutes: 0 },
    ])
  })

  it('excludes soft-deleted entries', async () => {
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 60 }),
      entryRow({ userId: 'usr_1', durationMinutes: 60, deletedAt: BigInt(NOW - 5) }),
    ])
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'user',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data).toEqual([
      { key: 'usr_1', label: 'usr_1', billableMinutes: 60, nonBillableMinutes: 0 },
    ])
  })

  it('rejects an invalid period with 422', async () => {
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'user',
      from: 1788100000,
      to: 1788100000,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-period')
    expect(result.error?.httpStatus).toBe(422)
  })

  it('returns project-not-found for an unknown project', async () => {
    repository.retrieveReportProject.mockResolvedValue(null)
    const result = await service.getTimeReport('org_rep_1', {
      groupBy: 'project',
      projectId: 'NOPE',
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.error?.code).toBe('projects/project-not-found')
  })
})

describe('budget variance report', () => {
  it('prices period entries and reports money as strings', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportBudgets.mockResolvedValue([
      budgetRow({ amountMinor: 10000 }),
    ])
    repository.listReportRates.mockResolvedValue([rateRow()])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ durationMinutes: 120, billable: true }),
    ])
    repository.retrieveReportBilling.mockResolvedValue({
      projectId: 'prj_alpha',
      currency: 'USD',
    })
    const result = await service.getBudgetVarianceReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.budget-variance-report')
    expect(result.data?.data).toEqual([
      {
        projectId: 'prj_alpha',
        name: 'Alpha',
        currency: 'USD',
        budgetMinor: '10000',
        actualCostMinor: '6000',
        varianceMinor: '-4000',
        budgetMinutes: null,
        actualMinutes: 120,
      },
    ])
  })

  it('reports a positive variance when spend exceeds the budget', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportBudgets.mockResolvedValue([
      budgetRow({ amountMinor: 1000 }),
    ])
    repository.listReportRates.mockResolvedValue([rateRow()])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ durationMinutes: 120, billable: true }),
    ])
    repository.retrieveReportBilling.mockResolvedValue({
      projectId: 'prj_alpha',
      currency: 'USD',
    })
    const result = await service.getBudgetVarianceReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data?.[0]?.varianceMinor).toBe('5000')
  })

  it('reports null budget fields without budgets and null currency without billing', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportRates.mockResolvedValue([rateRow()])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ durationMinutes: 60, billable: true }),
    ])
    const result = await service.getBudgetVarianceReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data).toEqual([
      {
        projectId: 'prj_alpha',
        name: 'Alpha',
        currency: null,
        budgetMinor: null,
        actualCostMinor: '3000',
        varianceMinor: null,
        budgetMinutes: null,
        actualMinutes: 60,
      },
    ])
  })

  it('sums hours budgets into budget minutes', async () => {
    repository.listReportProjects.mockResolvedValue([projectRow()])
    repository.listReportBudgets.mockResolvedValue([
      budgetRow({ id: 'bdg_h1', amountMinor: null, hours: 10 }),
      budgetRow({ id: 'bdg_h2', amountMinor: null, hours: 5 }),
    ])
    const result = await service.getBudgetVarianceReport('org_rep_1', {
      from: 1787800000,
      to: 1788100000,
    })
    expect(result.data?.data?.[0]?.budgetMinutes).toBe(900)
    expect(result.data?.data?.[0]?.budgetMinor).toBeNull()
  })

  it('rejects an invalid period with 422', async () => {
    const result = await service.getBudgetVarianceReport('org_rep_1', {
      from: 1788100000,
      to: 1787800000,
    })
    expect(result.error?.code).toBe('projects/invalid-period')
    expect(result.error?.httpStatus).toBe(422)
  })
})

describe('workload report', () => {
  const WEEK = { from: 1787800000, to: 1787800000 + 604800 }

  it('counts open assigned issues and never treats point estimates as minutes', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', assigneeUserId: 'usr_1', estimate: 3 }),
      issueRow({ status: 'in-progress', assigneeUserId: 'usr_1', estimate: 5 }),
      issueRow({ status: 'todo', assigneeUserId: 'usr_1', estimate: null }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.workload-report')
    expect(result.data?.data).toEqual([
      {
        userId: 'usr_1',
        label: 'usr_1',
        assignedOpenItems: 3,
        plannedMinutes: 0,
        loggedMinutes: 0,
        capacityMinutes: null,
        utilisationPercent: null,
      },
    ])
  })

  it('excludes closed issues from planned load', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'done', assigneeUserId: 'usr_1', estimate: 8 }),
      issueRow({ status: 'canceled', assigneeUserId: 'usr_1', estimate: 8 }),
      issueRow({ status: 'todo', assigneeUserId: 'usr_1', estimate: 2 }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data?.[0]?.assignedOpenItems).toBe(1)
    expect(result.data?.data?.[0]?.plannedMinutes).toBe(0)
  })

  it('sums logged minutes from period entries', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', assigneeUserId: 'usr_1', estimate: 2 }),
    ])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 90, billable: true }),
      entryRow({ userId: 'usr_1', durationMinutes: 30, billable: false }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data?.[0]?.loggedMinutes).toBe(120)
  })

  it('reports null utilisation without capacity', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', assigneeUserId: 'usr_1', estimate: 2 }),
    ])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 90 }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data?.[0]?.capacityMinutes).toBeNull()
    expect(result.data?.data?.[0]?.utilisationPercent).toBeNull()
  })

  it('computes utilisation against weekly capacity for an exact week', async () => {
    repository.listReportIssues.mockResolvedValue([
      issueRow({ status: 'todo', assigneeUserId: 'usr_1', estimate: 2 }),
    ])
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 1200 }),
    ])
    repository.listCapacities.mockResolvedValue([capacityRow()])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data?.[0]?.capacityMinutes).toBe(2400)
    expect(result.data?.data?.[0]?.utilisationPercent).toBe(50)
  })

  it('rounds utilisation to the nearest integer', async () => {
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 60 }),
      entryRow({ userId: 'usr_2', durationMinutes: 120 }),
    ])
    repository.listCapacities.mockResolvedValue([
      capacityRow({ userId: 'usr_1' }),
      capacityRow({ id: 'cap_2', userId: 'usr_2' }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data?.[0]?.utilisationPercent).toBe(3)
    expect(result.data?.data?.[1]?.utilisationPercent).toBe(5)
  })

  it('ignores capacity that starts after the period', async () => {
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_1', durationMinutes: 60 }),
    ])
    repository.listCapacities.mockResolvedValue([
      capacityRow({ effectiveFrom: BigInt(WEEK.to + 10) }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data?.[0]?.capacityMinutes).toBeNull()
    expect(result.data?.data?.[0]?.utilisationPercent).toBeNull()
  })

  it('includes users who only logged time and no assignments', async () => {
    repository.listReportTimeEntries.mockResolvedValue([
      entryRow({ userId: 'usr_9', durationMinutes: 45 }),
    ])
    const result = await service.getWorkloadReport('org_rep_1', WEEK)
    expect(result.data?.data).toEqual([
      {
        userId: 'usr_9',
        label: 'usr_9',
        assignedOpenItems: 0,
        plannedMinutes: 0,
        loggedMinutes: 45,
        capacityMinutes: null,
        utilisationPercent: null,
      },
    ])
  })

  it('rejects an invalid period with 422', async () => {
    const result = await service.getWorkloadReport('org_rep_1', {
      from: 1788100000,
      to: 1788100000,
    })
    expect(result.error?.code).toBe('projects/invalid-period')
    expect(result.error?.httpStatus).toBe(422)
  })
})

describe('member capacity', () => {
  it('creates capacity for a user', async () => {
    repository.listCapacities.mockResolvedValue([])
    repository.createCapacity.mockImplementation(async (params: Record<string, unknown>) => ({
      id: params.id,
      tenantId: params.tenantId,
      userId: params.userId,
      minutesPerWeek: params.minutesPerWeek,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo ?? null,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    }))
    const result = await service.createCapacity('org_rep_1', {
      userId: 'usr_1',
      minutesPerWeek: 2400,
      effectiveFrom: 1787800000,
      effectiveTo: null,
    })
    expect(result.error).toBeNull()
    expect(result.data?.object).toBe('projects.member-capacity')
    expect(result.data?.userId).toBe('usr_1')
    expect(result.data?.minutesPerWeek).toBe(2400)
    expect(repository.createCapacity).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: tenant.id, userId: 'usr_1' })
    )
  })

  it('refuses an overlapping effective range for the same user', async () => {
    repository.listCapacities.mockResolvedValue([
      capacityRow({ effectiveFrom: 1787800000n, effectiveTo: null }),
    ])
    const result = await service.createCapacity('org_rep_1', {
      userId: 'usr_1',
      minutesPerWeek: 1200,
      effectiveFrom: 1787900000,
      effectiveTo: null,
    })
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/capacity-overlap',
      message: 'This member already has capacity covering that period.',
      httpStatus: 409,
    })
    expect(repository.createCapacity).not.toHaveBeenCalled()
  })

  it('allows adjacent ranges that only touch at the boundary', async () => {
    repository.listCapacities.mockResolvedValue([
      capacityRow({ effectiveFrom: 1787800000n, effectiveTo: BigInt(1787900000) }),
    ])
    repository.createCapacity.mockImplementation(async (params: Record<string, unknown>) => ({
      ...capacityRow(),
      ...params,
      effectiveTo: params.effectiveTo ?? null,
    }))
    const result = await service.createCapacity('org_rep_1', {
      userId: 'usr_1',
      minutesPerWeek: 1200,
      effectiveFrom: 1787900000,
      effectiveTo: null,
    })
    expect(result.error).toBeNull()
  })

  it('allows overlapping ranges for different users', async () => {
    repository.listCapacities.mockImplementation(
      async (_tenantId: string, filter: { userId?: string }) =>
        [
          capacityRow({
            userId: 'usr_2',
            effectiveFrom: 1787800000n,
            effectiveTo: null,
          }),
        ].filter((row) => !filter.userId || row.userId === filter.userId)
    )
    repository.createCapacity.mockImplementation(async (params: Record<string, unknown>) => ({
      ...capacityRow(),
      ...params,
      effectiveTo: params.effectiveTo ?? null,
    }))
    const result = await service.createCapacity('org_rep_1', {
      userId: 'usr_1',
      minutesPerWeek: 1200,
      effectiveFrom: 1787900000,
      effectiveTo: null,
    })
    expect(result.error).toBeNull()
    expect(repository.listCapacities).toHaveBeenCalledWith(tenant.id, {
      userId: 'usr_1',
    })
  })

  it('lists capacities while hiding soft-deleted rows', async () => {
    repository.listCapacities.mockResolvedValue([
      capacityRow(),
      capacityRow({ id: 'cap_gone', deletedAt: BigInt(NOW - 5) }),
    ])
    const result = await service.listCapacities('org_rep_1', {})
    expect(result.data?.map((row) => row.id)).toEqual(['cap_1'])
  })

  it('updates minutes for a capacity', async () => {
    repository.retrieveCapacity.mockResolvedValue(capacityRow())
    repository.listCapacities.mockResolvedValue([capacityRow()])
    repository.updateCapacity.mockImplementation(
      async (_id: string, params: Record<string, unknown>) => ({
        ...capacityRow(),
        ...params,
      })
    )
    const result = await service.updateCapacity('org_rep_1', 'cap_1', {
      minutesPerWeek: 1200,
    })
    expect(result.error).toBeNull()
    expect(result.data?.minutesPerWeek).toBe(1200)
  })

  it('refuses an update that overlaps a sibling range', async () => {
    repository.retrieveCapacity.mockResolvedValue(capacityRow())
    repository.listCapacities.mockResolvedValue([
      capacityRow(),
      capacityRow({
        id: 'cap_2',
        effectiveFrom: 1787900000n,
        effectiveTo: null,
      }),
    ])
    const result = await service.updateCapacity('org_rep_1', 'cap_1', {
      effectiveTo: 1787950000,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/capacity-overlap')
    expect(repository.updateCapacity).not.toHaveBeenCalled()
  })

  it('rejects an update that inverts the effective range', async () => {
    repository.retrieveCapacity.mockResolvedValue(capacityRow())
    const result = await service.updateCapacity('org_rep_1', 'cap_1', {
      effectiveTo: 1787700000,
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
    expect(repository.updateCapacity).not.toHaveBeenCalled()
  })

  it('returns capacity-not-found when updating a missing row', async () => {
    repository.retrieveCapacity.mockResolvedValue(null)
    const result = await service.updateCapacity('org_rep_1', 'cap_missing', {
      minutesPerWeek: 1200,
    })
    expect(result.error).toEqual({
      code: 'projects/capacity-not-found',
      message: 'The member capacity could not be found.',
      httpStatus: 404,
    })
  })

  it('soft-deletes a capacity and returns a tombstone', async () => {
    repository.retrieveCapacity.mockResolvedValue(capacityRow())
    repository.softDeleteCapacity.mockResolvedValue(capacityRow())
    const result = await service.removeCapacity('org_rep_1', 'cap_1')
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.member-capacity',
      id: 'cap_1',
      deleted: true,
    })
    expect(repository.softDeleteCapacity).toHaveBeenCalledWith(
      'cap_1',
      expect.objectContaining({ deletedBy: null })
    )
  })

  it('returns capacity-not-found when deleting a missing row', async () => {
    repository.retrieveCapacity.mockResolvedValue(null)
    const result = await service.removeCapacity('org_rep_1', 'cap_missing')
    expect(result.error?.code).toBe('projects/capacity-not-found')
    expect(repository.softDeleteCapacity).not.toHaveBeenCalled()
  })

  it('scopes capacity reads to the resolved tenant', async () => {
    await service.listCapacities('org_rep_1', { userId: 'usr_1' })
    expect(repository.listCapacities).toHaveBeenCalledWith(tenant.id, {
      userId: 'usr_1',
    })
  })
})
