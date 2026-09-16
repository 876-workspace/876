import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { tenantsRepo, repository } = vi.hoisted(() => ({
  tenantsRepo: { retrieveByOrganization: vi.fn() },
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
}))

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../../projects/projects.repository.js', () => ({
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
}))
vi.mock('../../work-structure/work-structure.repository.js', () => ({
  seedPreset: vi.fn(),
}))
vi.mock('../../work-structure/milestone-details.repository.js', () => ({
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
}))
vi.mock('../../work-structure/milestone-list.repository.js', () => ({
  listOrganizationMilestones: vi.fn(),
}))
vi.mock('../../work-structure/task-lists.repository.js', () => ({
  listTaskLists: vi.fn(),
  retrieveTaskList: vi.fn(),
  createTaskList: vi.fn(),
  updateTaskList: vi.fn(),
  softDeleteTaskList: vi.fn(),
  taskListProgress: vi.fn(),
  countProjectTaskLists: vi.fn(),
  listProjectIssuesForBreakdown: vi.fn(),
  assignIssuesToTaskList: vi.fn(),
}))
vi.mock('../../work-structure/cycles.repository.js', () => ({
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
}))
vi.mock('../../work-structure/work-item-type-access.js', () => ({
  resolveOwnedWorkItemType: vi.fn(),
}))
vi.mock('../../issues/issues.repository.js', () => ({
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
}))
vi.mock('../../issues/issue-links.repository.js', () => ({
  listRelations: vi.fn(),
  listSuccessorIds: vi.fn(),
  listRelationsForIssues: vi.fn(),
  listDependenciesForIssues: vi.fn(),
  listIssueStatuses: vi.fn(),
}))
vi.mock('../../labels/labels.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  retrieveByName: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  hardDelete: vi.fn(),
}))
vi.mock('../../comments/comments.repository.js', () => ({
  list: vi.fn(),
  count: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  hardDelete: vi.fn(),
}))
vi.mock('../../projects/gantt.repository.js', () => ({
  listGanttMilestones: vi.fn(),
  listGanttTaskLists: vi.fn(),
  listGanttIssues: vi.fn(),
  listGanttDependencies: vi.fn(),
}))
vi.mock('../../projects/baselines.repository.js', () => ({
  listBaselines: vi.fn(),
  retrieveBaseline: vi.fn(),
  countBaselineItems: vi.fn(),
  countBaselineItemsMany: vi.fn(),
  listBaselineItems: vi.fn(),
  createBaseline: vi.fn(),
  createBaselineItems: vi.fn(),
  deleteBaseline: vi.fn(),
}))
vi.mock('../../calendar/calendar.repository.js', () => ({
  listCalendarProjects: vi.fn(),
  listCalendarIssues: vi.fn(),
}))
vi.mock('../../time/time.repository.js', () => ({ listTimeEntries: vi.fn() }))
vi.mock('../../finance/finance.repository.js', () => ({
  listBudgets: vi.fn(),
  listRates: vi.fn(),
  retrieveBilling: vi.fn(),
}))
vi.mock('../reports.repository.js', () => repository)
vi.mock('@876/billing/service', () => ({ create876BillingServiceClient: vi.fn() }))

const { createReportsRouter } = await import('../reports.routes.js')

const tenant = {
  id: 'prjten_rep_1',
  organizationId: 'org_rep_1',
  triageProjectId: 'prj_triage_rep',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

async function requestRaw(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createReportsRouter())
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
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      text: await response.text(),
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
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

describe('reports routes', () => {
  it('serves the work report as JSON with the canonical object', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/work?from=1787800000&to=1788100000'
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text)).toEqual({
      data: {
        object: 'projects.work-report',
        period: { from: 1787800000, to: 1788100000 },
        byState: [],
        byType: [],
        byAssignee: [],
        overdue: 0,
        total: 0,
      },
      error: null,
    })
  })

  it('serves the work report as CSV with a header row', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/work?from=1787800000&to=1788100000&format=csv'
    )
    expect(response.status).toBe(200)
    expect(response.contentType).toContain('text/csv')
    expect(response.text.split('\r\n')[0]).toBe('section,key,label,count')
  })

  it('serves the health report as CSV', async () => {
    repository.listReportProjects.mockResolvedValue([
      {
        id: 'prj_alpha',
        tenantId: tenant.id,
        name: 'Alpha',
        key: 'ALPHA',
        archivedAt: null,
      },
    ])
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/health?format=csv'
    )
    expect(response.status).toBe(200)
    expect(response.contentType).toContain('text/csv')
    expect(response.text).toContain(
      'projectId,name,health,progressPercent,overdue,openItems,budgetConsumedPercent'
    )
    expect(response.text).toContain('prj_alpha,Alpha,unknown,,0,0,')
  })

  it('quotes commas and guards formulas in time CSV output', async () => {
    repository.listReportProjects.mockResolvedValue([
      {
        id: 'prj_alpha',
        tenantId: tenant.id,
        name: '=HYPERLINK("http://evil.example", "click"), team',
        key: 'ALPHA',
        archivedAt: null,
      },
    ])
    repository.listReportTimeEntries.mockResolvedValue([
      {
        id: 'tme_1',
        tenantId: tenant.id,
        projectId: 'prj_alpha',
        issueId: null,
        userId: 'usr_1',
        startedAt: 1787900000n,
        durationMinutes: 60,
        billable: true,
        deletedAt: null,
      },
    ])
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/time?groupBy=project&from=1787800000&to=1788100000&format=csv'
    )
    expect(response.status).toBe(200)
    expect(response.text).toContain(
      `"\'=HYPERLINK(""http://evil.example"", ""click""), team"`
    )
  })

  it('rejects requests without the internal key', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/health',
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )
    expect(response.status).toBe(401)
    expect(JSON.parse(response.text).error.code).toBe(
      'projects/unauthorized'
    )
  })

  it('maps an invalid groupBy to a 400 invalid request', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/time?groupBy=day&from=1787800000&to=1788100000'
    )
    expect(response.status).toBe(400)
    expect(JSON.parse(response.text).error.code).toBe(
      'projects/invalid-request'
    )
  })

  it('maps an invalid period to 422 over HTTP', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/reports/workload?from=1788100000&to=1788100000'
    )
    expect(response.status).toBe(422)
    expect(JSON.parse(response.text).error.code).toBe(
      'projects/invalid-period'
    )
  })

  it('creates capacity with a 201 status', async () => {
    repository.createCapacity.mockImplementation(
      async (params: Record<string, unknown>) => ({
        ...params,
        effectiveTo: null,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      })
    )
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_rep_1/capacity',
      { userId: 'usr_1', minutesPerWeek: 2400, effectiveFrom: 1787800000 }
    )
    expect(response.status).toBe(201)
    expect(JSON.parse(response.text).data.object).toBe(
      'projects.member-capacity'
    )
  })

  it('maps a capacity overlap to 409 over HTTP', async () => {
    repository.listCapacities.mockResolvedValue([
      {
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
      },
    ])
    const response = await requestRaw(
      'POST',
      '/v1/organizations/org_rep_1/capacity',
      { userId: 'usr_1', minutesPerWeek: 1200, effectiveFrom: 1787900000 }
    )
    expect(response.status).toBe(409)
    expect(JSON.parse(response.text).error.code).toBe(
      'projects/capacity-overlap'
    )
  })

  it('lists capacities as a list envelope', async () => {
    const response = await requestRaw(
      'GET',
      '/v1/organizations/org_rep_1/capacity?userId=usr_1'
    )
    expect(response.status).toBe(200)
    const body = JSON.parse(response.text)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toEqual([])
    expect(body.data.url).toBe('/v1/organizations/org_rep_1/capacity')
  })

  it('deletes capacity with a tombstone', async () => {
    repository.retrieveCapacity.mockResolvedValue({
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
    })
    repository.softDeleteCapacity.mockResolvedValue({})
    const response = await requestRaw(
      'DELETE',
      '/v1/organizations/org_rep_1/capacity/cap_1'
    )
    expect(response.status).toBe(200)
    expect(JSON.parse(response.text).data).toEqual({
      object: 'projects.member-capacity',
      id: 'cap_1',
      deleted: true,
    })
  })
})
