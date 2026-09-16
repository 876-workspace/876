import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const {
  layoutsRepo,
  projectCustomFieldsRepo,
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
  calendarRepo,
  timeRepo,
  financeRepo,
} = vi.hoisted(() => ({
  layoutsRepo: {
    listLayouts: vi.fn(),
    retrieveLayout: vi.fn(),
    createLayout: vi.fn(),
    updateLayout: vi.fn(),
    softDeleteLayout: vi.fn(),
    clearDefaultInScope: vi.fn(),
  },
  projectCustomFieldsRepo: {
    listProjectCustomFields: vi.fn(),
    retrieveProjectCustomField: vi.fn(),
    retrieveProjectCustomFieldByKey: vi.fn(),
    createProjectCustomField: vi.fn(),
    updateProjectCustomField: vi.fn(),
    archiveProjectCustomField: vi.fn(),
    listProjectCustomFieldValues: vi.fn(),
    listProjectCustomFieldValuesForProjects: vi.fn(),
    upsertProjectCustomFieldValue: vi.fn(),
    clearProjectCustomFieldValue: vi.fn(),
  },
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
vi.mock('../finance.repository.js', () => financeRepo)
vi.mock('@876/billing/service', () => ({ create876BillingServiceClient: vi.fn() }))

vi.mock('../../layouts/layouts.repository.js', () => layoutsRepo)
vi.mock(
  '../../custom-fields/project-custom-fields.repository.js',
  () => projectCustomFieldsRepo
)
const { create876BillingServiceClient } = await import('@876/billing/service')
const { createFinanceRouter } = await import('../finance.routes.js')
const { buildInvoiceIdempotencyKey } = await import(
  '../finance.calculations.js'
)

const tenant = {
  id: 'prjten_fin_1',
  organizationId: 'org_fin_1',
  triageProjectId: 'prj_triage_fin',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const project = {
  id: 'prj_fin_1',
  tenantId: tenant.id,
  name: 'Finance Project',
  key: 'FIN',
  slug: 'finance-project',
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

const T0 = 1788000000
const billingFactory = vi.mocked(create876BillingServiceClient)
let invoicesCreate: ReturnType<typeof vi.fn>

function billingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prjbil_1',
    tenantId: tenant.id,
    projectId: project.id,
    billingMethod: 'time-and-materials',
    currency: 'USD',
    billingCustomerId: 'cus_1',
    fixedFeeAmount: null,
    createdAt: BigInt(T0),
    updatedAt: BigInt(T0),
    ...overrides,
  }
}

function budgetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bdg_1',
    tenantId: tenant.id,
    projectId: project.id,
    scope: 'project',
    milestoneId: null,
    userId: null,
    amountMinor: 10000,
    hours: null,
    thresholdPercent: 80,
    periodStart: null,
    periodEnd: null,
    createdAt: BigInt(T0),
    updatedAt: BigInt(T0),
    ...overrides,
  }
}

function rateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rte_1',
    tenantId: tenant.id,
    projectId: project.id,
    userId: null,
    scope: 'project',
    billRateMinor: 6000,
    costRateMinor: 3000,
    currency: 'USD',
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: BigInt(T0),
    updatedAt: BigInt(T0),
    ...overrides,
  }
}

function entryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tme_1',
    tenantId: tenant.id,
    projectId: project.id,
    milestoneId: null,
    userId: 'usr_1',
    startedAt: BigInt(T0),
    durationMinutes: 60,
    billable: true,
    approvalStatus: 'approved',
    billedInvoiceId: null,
    ...overrides,
  }
}

async function requestJson(
  path: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createFinanceRouter())
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
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

function org(path: string) {
  return `/v1/organizations/org_fin_1${path}`
}

function projectPath(suffix: string) {
  return org(`/projects/${project.id}${suffix}`)
}

beforeEach(() => {
  layoutsRepo.listLayouts.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFields.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValues.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValuesForProjects.mockResolvedValue([])
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  process.env.BILLING_API_URL = 'http://billing.test'
  process.env.PROJECTS_API_876_KEY = 'projects-test-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  projectsRepo.retrieve.mockResolvedValue(project)
  projectsRepo.retrieveByKey.mockResolvedValue(null)
  invoicesCreate = vi.fn()
  billingFactory.mockReturnValue({
    invoices: { create: invoicesCreate },
  } as unknown as ReturnType<typeof billingFactory>)
  financeRepo.retrieveBilling.mockResolvedValue(null)
  financeRepo.upsertBilling.mockImplementation(
    async (params: Record<string, unknown>) => billingRow({ ...params })
  )
  financeRepo.listBudgets.mockResolvedValue([])
  financeRepo.retrieveBudget.mockResolvedValue(null)
  financeRepo.createBudget.mockImplementation(
    async (params: Record<string, unknown>) => budgetRow({ ...params })
  )
  financeRepo.updateBudget.mockImplementation(
    async (id: string, patch: Record<string, unknown>) =>
      budgetRow({ id, ...patch })
  )
  financeRepo.deleteBudget.mockResolvedValue(undefined)
  financeRepo.listRates.mockResolvedValue([])
  financeRepo.retrieveRate.mockResolvedValue(null)
  financeRepo.createRate.mockImplementation(
    async (params: Record<string, unknown>) => rateRow({ ...params })
  )
  financeRepo.updateRate.mockImplementation(
    async (id: string, patch: Record<string, unknown>) =>
      rateRow({ id, ...patch })
  )
  financeRepo.deleteRate.mockResolvedValue(undefined)
  financeRepo.listSummaryEntries.mockResolvedValue([])
  financeRepo.listPeriodBillableEntries.mockResolvedValue([])
  financeRepo.listPlannedIssues.mockResolvedValue([])
  financeRepo.markEntriesBilled.mockResolvedValue(2)
  invoicesCreate.mockResolvedValue({
    data: { id: 'inv_1' },
    error: null,
  })
})

describe('project billing config', () => {
  it('returns the billing config', async () => {
    financeRepo.retrieveBilling.mockResolvedValueOnce(billingRow())
    const result = await requestJson(projectPath('/billing'), 'GET')
    expect(result.status).toBe(200)
    expect(result.body.data).toMatchObject({
      object: 'projects.project-billing',
      billingMethod: 'time-and-materials',
      billingCustomerId: 'cus_1',
    })
  })

  it('returns 404 when no billing config exists', async () => {
    const result = await requestJson(projectPath('/billing'), 'GET')
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/billing-config-not-found')
  })

  it('returns 404 for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValueOnce(null)
    projectsRepo.retrieveByKey.mockResolvedValueOnce(null)
    const result = await requestJson(
      org('/projects/prj_missing/billing'),
      'GET'
    )
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/project-not-found')
  })

  it('upserts the billing config', async () => {
    const result = await requestJson(projectPath('/billing'), 'PUT', {
      billingMethod: 'fixed-fee',
      currency: 'usd',
      billingCustomerId: 'cus_9',
      fixedFeeAmount: 50000,
    })
    expect(result.status).toBe(200)
    expect(result.body.data).toMatchObject({
      billingMethod: 'fixed-fee',
      currency: 'USD',
      fixedFeeAmount: 50000,
    })
  })

  it('rejects fixed-fee without an amount', async () => {
    const result = await requestJson(projectPath('/billing'), 'PUT', {
      billingMethod: 'fixed-fee',
    })
    expect(result.status).toBe(400)
  })
})

describe('budgets', () => {
  it('creates an amount budget', async () => {
    const result = await requestJson(projectPath('/budgets'), 'POST', {
      scope: 'project',
      amountMinor: 10000,
    })
    expect(result.status).toBe(201)
    expect(result.body.data).toMatchObject({
      object: 'projects.budget',
      scope: 'project',
      amountMinor: 10000,
      thresholdPercent: 80,
    })
  })

  it('creates an hours budget for a user', async () => {
    const result = await requestJson(projectPath('/budgets'), 'POST', {
      scope: 'user',
      userId: 'usr_1',
      hours: 40,
      thresholdPercent: 50,
    })
    expect(result.status).toBe(201)
    expect(result.body.data).toMatchObject({ hours: 40, userId: 'usr_1' })
  })

  it('rejects a budget with both amount and hours', async () => {
    const result = await requestJson(projectPath('/budgets'), 'POST', {
      scope: 'project',
      amountMinor: 100,
      hours: 10,
    })
    expect(result.status).toBe(400)
  })

  it('rejects a milestone budget without a milestone', async () => {
    const result = await requestJson(projectPath('/budgets'), 'POST', {
      scope: 'milestone',
      amountMinor: 100,
    })
    expect(result.status).toBe(400)
  })

  it('lists budgets', async () => {
    financeRepo.listBudgets.mockResolvedValueOnce([budgetRow()])
    const result = await requestJson(projectPath('/budgets'), 'GET')
    expect(result.status).toBe(200)
    expect(result.body.data.object).toBe('list')
    expect(result.body.data.data).toHaveLength(1)
  })

  it('retrieves a budget', async () => {
    financeRepo.retrieveBudget.mockResolvedValueOnce(budgetRow())
    const result = await requestJson(projectPath('/budgets/bdg_1'), 'GET')
    expect(result.status).toBe(200)
    expect(result.body.data.id).toBe('bdg_1')
  })

  it('returns 404 for an unknown budget', async () => {
    const result = await requestJson(projectPath('/budgets/bdg_no'), 'GET')
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/budget-not-found')
  })

  it('returns 404 for a budget from another project', async () => {
    financeRepo.retrieveBudget.mockResolvedValueOnce(
      budgetRow({ projectId: 'prj_other' })
    )
    const result = await requestJson(projectPath('/budgets/bdg_1'), 'GET')
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/budget-not-found')
  })

  it('patches a budget threshold', async () => {
    financeRepo.retrieveBudget.mockResolvedValueOnce(budgetRow())
    const result = await requestJson(projectPath('/budgets/bdg_1'), 'PATCH', {
      thresholdPercent: 90,
    })
    expect(result.status).toBe(200)
    expect(result.body.data.thresholdPercent).toBe(90)
  })

  it('rejects a patch that sets both amount and hours', async () => {
    financeRepo.retrieveBudget.mockResolvedValueOnce(budgetRow())
    const result = await requestJson(projectPath('/budgets/bdg_1'), 'PATCH', {
      hours: 10,
    })
    expect(result.status).toBe(400)
  })

  it('deletes a budget', async () => {
    financeRepo.retrieveBudget.mockResolvedValueOnce(budgetRow())
    const result = await requestJson(projectPath('/budgets/bdg_1'), 'DELETE')
    expect(result.status).toBe(200)
    expect(result.body.data).toEqual({
      object: 'projects.budget',
      id: 'bdg_1',
      deleted: true,
    })
  })

  it('isolates tenants', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValueOnce(null)
    const result = await requestJson(
      '/v1/organizations/org_other/projects/prj_fin_1/budgets',
      'GET'
    )
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/tenant-not-found')
  })
})

describe('rates', () => {
  it('creates a project rate', async () => {
    const result = await requestJson(projectPath('/rates'), 'POST', {
      scope: 'project',
      billRateMinor: 6000,
      costRateMinor: 3000,
    })
    expect(result.status).toBe(201)
    expect(result.body.data).toMatchObject({
      object: 'projects.rate',
      scope: 'project',
      projectId: project.id,
      userId: null,
      currency: 'USD',
    })
  })

  it('creates a user rate without a project', async () => {
    const result = await requestJson(projectPath('/rates'), 'POST', {
      scope: 'user',
      userId: 'usr_1',
      billRateMinor: 6000,
      costRateMinor: 3000,
    })
    expect(result.status).toBe(201)
    expect(result.body.data).toMatchObject({
      scope: 'user',
      projectId: null,
      userId: 'usr_1',
    })
    expect(financeRepo.createRate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: null, userId: 'usr_1' })
    )
  })

  it('rejects a user id on a project rate', async () => {
    const result = await requestJson(projectPath('/rates'), 'POST', {
      scope: 'project',
      userId: 'usr_1',
      billRateMinor: 6000,
      costRateMinor: 3000,
    })
    expect(result.status).toBe(400)
  })

  it('lists and retrieves rates', async () => {
    financeRepo.listRates.mockResolvedValueOnce([rateRow()])
    financeRepo.retrieveRate.mockResolvedValueOnce(rateRow())
    const listed = await requestJson(projectPath('/rates'), 'GET')
    expect(listed.status).toBe(200)
    expect(listed.body.data.data).toHaveLength(1)
    const retrieved = await requestJson(projectPath('/rates/rte_1'), 'GET')
    expect(retrieved.status).toBe(200)
    expect(retrieved.body.data.id).toBe('rte_1')
  })

  it('returns 404 for an unknown rate', async () => {
    const result = await requestJson(projectPath('/rates/rte_no'), 'GET')
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/rate-not-found')
  })

  it('patches a bill rate', async () => {
    financeRepo.retrieveRate.mockResolvedValueOnce(rateRow())
    const result = await requestJson(projectPath('/rates/rte_1'), 'PATCH', {
      billRateMinor: 7000,
    })
    expect(result.status).toBe(200)
    expect(result.body.data.billRateMinor).toBe(7000)
  })

  it('deletes a rate', async () => {
    financeRepo.retrieveRate.mockResolvedValueOnce(rateRow())
    const result = await requestJson(projectPath('/rates/rte_1'), 'DELETE')
    expect(result.status).toBe(200)
    expect(result.body.data).toEqual({
      object: 'projects.rate',
      id: 'rte_1',
      deleted: true,
    })
  })
})

describe('financial summary', () => {
  function summaryFixtures() {
    financeRepo.listSummaryEntries.mockResolvedValue([
      entryRow({ id: 'tme_1', durationMinutes: 60, billable: true, userId: 'usr_1' }),
      entryRow({ id: 'tme_2', durationMinutes: 30, billable: false, userId: 'usr_1' }),
      entryRow({ id: 'tme_3', durationMinutes: 45, billable: true, userId: 'usr_2' }),
    ])
    financeRepo.listRates.mockResolvedValue([
      rateRow({
        id: 'rte_u1',
        scope: 'user',
        projectId: null,
        userId: 'usr_1',
      }),
    ])
    financeRepo.listPlannedIssues.mockResolvedValue([
      { id: 'iss_1', plannedDurationMinutes: 120, assigneeUserId: 'usr_1', milestoneId: null },
      { id: 'iss_2', plannedDurationMinutes: null, assigneeUserId: null, milestoneId: null },
    ])
    financeRepo.listBudgets.mockResolvedValue([
      budgetRow({ id: 'bdg_amount', amountMinor: 10000, hours: null }),
      budgetRow({ id: 'bdg_hours', scope: 'project', amountMinor: null, hours: 2 }),
      budgetRow({ id: 'bdg_user', scope: 'user', userId: 'usr_1', amountMinor: 5000, hours: null }),
      budgetRow({ id: 'bdg_ms', scope: 'milestone', milestoneId: 'ms_1', userId: null, amountMinor: 5000, hours: null }),
    ])
  }

  it('reports hours, cost, revenue, budgets, and unpriced minutes', async () => {
    summaryFixtures()
    const result = await requestJson(
      projectPath('/financial-summary?from=1&to=9999999999'),
      'GET'
    )
    expect(result.status).toBe(200)
    expect(result.body.data).toMatchObject({
      object: 'projects.financial-summary',
      minutes: { plannedMinutes: 120, actualMinutes: 135, varianceMinutes: 15 },
      cost: { plannedMinor: null, actualMinor: 4500, varianceMinor: null },
      revenue: { plannedMinor: null, actualMinor: 6000, varianceMinor: null },
      unpricedMinutes: 45,
    })
    const budgets = result.body.data.budgets as Array<Record<string, unknown>>
    expect(budgets).toHaveLength(4)
    expect(budgets.find((budget) => budget.budgetId === 'bdg_amount')).toMatchObject({
      kind: 'amount',
      spent: 4500,
      budget: 10000,
      percent: 45,
      overThreshold: false,
      overBudget: false,
    })
    expect(budgets.find((budget) => budget.budgetId === 'bdg_hours')).toMatchObject({
      kind: 'hours',
      spent: 135,
      budget: 120,
      percent: 112,
      overThreshold: true,
      overBudget: true,
    })
    expect(budgets.find((budget) => budget.budgetId === 'bdg_user')).toMatchObject({
      spent: 4500,
    })
    expect(budgets.find((budget) => budget.budgetId === 'bdg_ms')).toMatchObject({
      spent: 0,
      percent: 0,
    })
  })

  it('prices planned cost and revenue when a project rate exists', async () => {
    financeRepo.listSummaryEntries.mockResolvedValue([
      entryRow({ durationMinutes: 60, billable: true }),
    ])
    financeRepo.listRates.mockResolvedValue([rateRow()])
    financeRepo.listPlannedIssues.mockResolvedValue([
      { id: 'iss_1', plannedDurationMinutes: 120, assigneeUserId: null, milestoneId: null },
    ])
    financeRepo.listBudgets.mockResolvedValue([])
    const result = await requestJson(
      projectPath('/financial-summary?from=1&to=9999999999'),
      'GET'
    )
    expect(result.status).toBe(200)
    expect(result.body.data.cost).toMatchObject({
      plannedMinor: 6000,
      actualMinor: 3000,
      varianceMinor: -3000,
    })
    expect(result.body.data.revenue).toMatchObject({
      plannedMinor: 12000,
      actualMinor: 6000,
      varianceMinor: -6000,
    })
  })

  it('returns 404 for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValueOnce(null)
    projectsRepo.retrieveByKey.mockResolvedValueOnce(null)
    const result = await requestJson(
      org('/projects/prj_missing/financial-summary?from=1&to=2'),
      'GET'
    )
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/project-not-found')
  })

  it('rejects a reversed period', async () => {
    const result = await requestJson(
      projectPath('/financial-summary?from=5&to=2'),
      'GET'
    )
    expect(result.status).toBe(400)
  })
})

describe('invoice drafts', () => {
  const period = { from: T0 - 100, to: T0 + 10000 }

  function draftFixtures() {
    financeRepo.retrieveBilling.mockResolvedValue(billingRow())
    financeRepo.listRates.mockResolvedValue([rateRow()])
    financeRepo.listPeriodBillableEntries.mockResolvedValue([
      entryRow({ id: 'tme_a', durationMinutes: 60, approvalStatus: 'approved', billedInvoiceId: null }),
      entryRow({ id: 'tme_b', durationMinutes: 30, approvalStatus: 'approved', billedInvoiceId: null }),
      entryRow({ id: 'tme_draft', durationMinutes: 60, approvalStatus: 'draft', billedInvoiceId: null }),
      entryRow({ id: 'tme_sub', durationMinutes: 60, approvalStatus: 'submitted', billedInvoiceId: null }),
      entryRow({ id: 'tme_nb', durationMinutes: 60, approvalStatus: 'approved', billable: false, billedInvoiceId: null }),
      entryRow({ id: 'tme_old', durationMinutes: 60, approvalStatus: 'approved', billedInvoiceId: 'inv_0' }),
    ])
  }

  it('bills only approved entries and marks them with the invoice id', async () => {
    draftFixtures()
    const result = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(result.status).toBe(201)
    expect(result.body.data).toMatchObject({
      object: 'projects.invoice-draft',
      invoiceId: 'inv_1',
      billedEntryIds: ['tme_a', 'tme_b'],
      billedCount: 2,
      billedAmountMinor: 9000,
    })
    expect(invoicesCreate).toHaveBeenCalledTimes(1)
    const [organizationId, params, options] = invoicesCreate.mock.calls[0] as unknown as [
      string,
      { customerId: string; currency: string; lines: Array<{ unitAmount: number }> },
      { idempotencyKey: string },
    ]
    expect(organizationId).toBe('org_fin_1')
    expect(params.customerId).toBe('cus_1')
    expect(params.lines).toHaveLength(2)
    expect(options.idempotencyKey).toBe(
      buildInvoiceIdempotencyKey(tenant.id, project.id, period.from, period.to, [
        'tme_a',
        'tme_b',
        'tme_old',
      ])
    )
    expect(financeRepo.markEntriesBilled).toHaveBeenCalledWith(
      tenant.id,
      ['tme_a', 'tme_b'],
      'inv_1',
      expect.anything()
    )
  })

  it('returns the same invoice id when re-run and marks nothing again', async () => {
    draftFixtures()
    const first = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(first.body.data.invoiceId).toBe('inv_1')
    financeRepo.listPeriodBillableEntries.mockResolvedValue([
      entryRow({ id: 'tme_a', billedInvoiceId: 'inv_1' }),
      entryRow({ id: 'tme_b', durationMinutes: 30, billedInvoiceId: 'inv_1' }),
      entryRow({ id: 'tme_old', billedInvoiceId: 'inv_1' }),
    ])
    invoicesCreate.mockClear()
    financeRepo.markEntriesBilled.mockClear()
    const second = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(second.status).toBe(201)
    expect(second.body.data).toMatchObject({
      invoiceId: 'inv_1',
      billedEntryIds: [],
      billedCount: 0,
    })
    expect(invoicesCreate).not.toHaveBeenCalled()
    expect(financeRepo.markEntriesBilled).not.toHaveBeenCalled()
  })

  it('leaves every entry unbilled when Billing errors', async () => {
    draftFixtures()
    invoicesCreate.mockResolvedValueOnce({
      data: null,
      error: { code: 'billing/upstream', message: 'card declined' },
    })
    const result = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(result.status).toBe(502)
    expect(result.body.error.code).toBe('projects/billing-unavailable')
    expect(financeRepo.markEntriesBilled).not.toHaveBeenCalled()
  })

  it('returns 422 when nothing is billable', async () => {
    financeRepo.retrieveBilling.mockResolvedValueOnce(billingRow())
    financeRepo.listRates.mockResolvedValueOnce([rateRow()])
    financeRepo.listPeriodBillableEntries.mockResolvedValueOnce([])
    const result = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(result.status).toBe(422)
    expect(result.body.error.code).toBe('projects/nothing-to-invoice')
  })

  it('returns 422 when the project has no billing customer', async () => {
    financeRepo.retrieveBilling.mockResolvedValueOnce(
      billingRow({ billingCustomerId: null })
    )
    const result = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(result.status).toBe(422)
    expect(result.body.error.code).toBe('projects/invoice-customer-missing')
    expect(invoicesCreate).not.toHaveBeenCalled()
  })

  it('returns 404 when no billing config exists', async () => {
    const result = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(result.status).toBe(404)
    expect(result.body.error.code).toBe('projects/billing-config-not-found')
  })

  it('returns 422 naming entries without a rate', async () => {
    financeRepo.retrieveBilling.mockResolvedValueOnce(billingRow())
    financeRepo.listRates.mockResolvedValueOnce([])
    financeRepo.listPeriodBillableEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_lonely' }),
    ])
    const result = await requestJson(projectPath('/invoice-drafts'), 'POST', period)
    expect(result.status).toBe(422)
    expect(result.body.error.code).toBe('projects/invoice-has-unpriced-entries')
    expect(invoicesCreate).not.toHaveBeenCalled()
    expect(financeRepo.markEntriesBilled).not.toHaveBeenCalled()
  })

  it('rejects requests without the internal key', async () => {
    const result = await requestJson(
      projectPath('/invoice-drafts'),
      'POST',
      period,
      { 'x-internal-key': 'wrong' }
    )
    expect(result.status).toBe(401)
  })
})
