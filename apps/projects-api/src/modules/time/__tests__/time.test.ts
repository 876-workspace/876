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
  automation,
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
  automation: { appendOutboxEvent: vi.fn() },
  timeRepo: {
    transaction: vi.fn(),
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
vi.mock('../time.repository.js', () => timeRepo)
vi.mock('../../automation/index.js', () => automation)

vi.mock('../../layouts/layouts.repository.js', () => layoutsRepo)
vi.mock(
  '../../custom-fields/project-custom-fields.repository.js',
  () => projectCustomFieldsRepo
)
const service = await import('../time.service.js')
const { createTimeRouter } = await import('../time.routes.js')

const tenant = {
  id: 'prjten_time_1',
  organizationId: 'org_time_1',
  triageProjectId: 'prj_triage_time',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const project = {
  id: 'prj_time_1',
  tenantId: tenant.id,
  name: 'Time Project',
  key: 'TIME',
  slug: 'time-project',
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

function entryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tme_1',
    tenantId: tenant.id,
    projectId: project.id,
    issueId: null,
    milestoneId: null,
    taskListId: null,
    userId: 'usr_1',
    startedAt: BigInt(T0),
    endedAt: BigInt(T0 + 3600),
    durationMinutes: 60,
    billable: false,
    note: null,
    approvalStatus: 'draft',
    timesheetId: null,
    createdBy: 'usr_1',
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: BigInt(T0),
    updatedAt: BigInt(T0),
    ...overrides,
  }
}

function runningEntryRow(overrides: Record<string, unknown> = {}) {
  return entryRow({
    id: 'tme_running_1',
    endedAt: null,
    durationMinutes: null,
    ...overrides,
  })
}

function timesheetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tsh_1',
    tenantId: tenant.id,
    userId: 'usr_1',
    periodStart: BigInt(T0 - 86400),
    periodEnd: BigInt(T0 + 86400),
    status: 'draft',
    submittedAt: null,
    decidedAt: null,
    decidedBy: null,
    note: null,
    createdAt: BigInt(T0 - 86400),
    updatedAt: BigInt(T0 - 86400),
    ...overrides,
  }
}

function timesheetEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tshe_1',
    tenantId: tenant.id,
    timesheetId: 'tsh_1',
    actorUserId: 'usr_1',
    fromStatus: 'draft',
    toStatus: 'submitted',
    note: null,
    createdAt: BigInt(T0),
    ...overrides,
  }
}

async function requestJson(path: string, method: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createTimeRouter())
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

function org(path: string) {
  return `/v1/organizations/org_time_1${path}`
}

beforeEach(() => {
  layoutsRepo.listLayouts.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFields.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValues.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValuesForProjects.mockResolvedValue([])
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  projectsRepo.retrieve.mockResolvedValue(project)
  projectsRepo.retrieveByKey.mockResolvedValue(null)
  timeRepo.createTimeEntry.mockImplementation(async (params: Record<string, unknown>) => entryRow({ ...params }))
  timeRepo.transaction.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ client: {}, createTimeEntry: timeRepo.createTimeEntry })
  )
  timeRepo.listTimeEntries.mockResolvedValue([])
  timeRepo.retrieveTimeEntry.mockResolvedValue(null)
  timeRepo.retrieveRunningEntry.mockResolvedValue(null)
  timeRepo.updateTimeEntry.mockImplementation(
    async (_tenantId: string, id: string, patch: Record<string, unknown>) =>
      entryRow({ id, ...patch })
  )
  timeRepo.softDeleteTimeEntry.mockResolvedValue(entryRow())
  timeRepo.startTimerAtomic.mockImplementation(
    async (params: Record<string, unknown>) => ({
      stopped: null,
      started: runningEntryRow({ ...params, id: params.id }),
    })
  )
  timeRepo.listTimesheetEntries.mockResolvedValue([])
  timeRepo.attachEntriesToTimesheet.mockResolvedValue(0)
  timeRepo.setEntriesApprovalForTimesheet.mockResolvedValue(0)
  timeRepo.listEntriesForSummary.mockResolvedValue([])
  timeRepo.createTimesheet.mockImplementation(async (params: Record<string, unknown>) => timesheetRow({ ...params }))
  timeRepo.listTimesheets.mockResolvedValue([])
  timeRepo.retrieveTimesheet.mockResolvedValue(null)
  timeRepo.updateTimesheet.mockImplementation(
    async (_tenantId: string, id: string, patch: Record<string, unknown>) =>
      timesheetRow({ id, ...patch })
  )
  timeRepo.createTimesheetEvent.mockImplementation(async (params: Record<string, unknown>) => timesheetEventRow({ ...params }))
  timeRepo.listTimesheetEvents.mockResolvedValue([])
})

describe('duration math', () => {
  it('rounds a 90-second span up to 2 minutes', async () => {
    const { durationMinutesBetween } = await import('../time.serializers.js')
    expect(durationMinutesBetween(T0, T0 + 90)).toBe(2)
  })

  it('rounds an 89-second span down to 1 minute', async () => {
    const { durationMinutesBetween } = await import('../time.serializers.js')
    expect(durationMinutesBetween(T0, T0 + 89)).toBe(1)
  })

  it('computes an exact hour as 60 minutes', async () => {
    const { durationMinutesBetween } = await import('../time.serializers.js')
    expect(durationMinutesBetween(T0, T0 + 3600)).toBe(60)
  })

  it('clamps negative spans to zero minutes', async () => {
    const { durationMinutesBetween } = await import('../time.serializers.js')
    expect(durationMinutesBetween(T0 + 60, T0)).toBe(0)
  })
})

describe('time entries', () => {
  it('creates a manual entry with a server-computed duration', async () => {
    const created = entryRow()
    timeRepo.createTimeEntry.mockResolvedValueOnce(created)

    const result = await service.createTimeEntry('org_time_1', {
      userId: 'usr_1',
      projectId: project.id,
      startedAt: T0,
      endedAt: T0 + 3600,
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.time-entry',
      userId: 'usr_1',
      startedAt: T0,
      endedAt: T0 + 3600,
      durationMinutes: 60,
      approvalStatus: 'draft',
      timesheetId: null,
    })
    expect(timeRepo.createTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        projectId: project.id,
        durationMinutes: 60,
      })
    )
  })

  it('accepts an explicit durationMinutes override on create', async () => {
    timeRepo.createTimeEntry.mockResolvedValueOnce(
      entryRow({ durationMinutes: 45 })
    )

    const result = await service.createTimeEntry('org_time_1', {
      userId: 'usr_1',
      projectId: project.id,
      startedAt: T0,
      endedAt: T0 + 3600,
      durationMinutes: 45,
    })

    expect(result.error).toBeNull()
    expect(result.data?.durationMinutes).toBe(45)
    expect(timeRepo.createTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 45 })
    )
  })

  it('rounds the created duration to the nearest minute', async () => {
    timeRepo.createTimeEntry.mockResolvedValueOnce(
      entryRow({ durationMinutes: 2 })
    )

    const result = await service.createTimeEntry('org_time_1', {
      userId: 'usr_1',
      projectId: project.id,
      startedAt: T0,
      endedAt: T0 + 90,
    })

    expect(result.error).toBeNull()
    expect(timeRepo.createTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 2 })
    )
  })

  it('creates entries over HTTP with a 201 envelope', async () => {
    timeRepo.createTimeEntry.mockResolvedValueOnce(entryRow())

    const response = await requestJson(org('/time-entries'), 'POST', {
      userId: 'usr_1',
      projectId: project.id,
      startedAt: T0,
      endedAt: T0 + 3600,
    })

    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('projects.time-entry')
  })

  it('rejects an entry whose endedAt precedes startedAt', async () => {
    const response = await requestJson(org('/time-entries'), 'POST', {
      userId: 'usr_1',
      projectId: project.id,
      startedAt: T0 + 3600,
      endedAt: T0,
    })

    expect(response.status).toBe(400)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBe('projects/invalid-request')
    expect(timeRepo.createTimeEntry).not.toHaveBeenCalled()
  })

  it('rejects creation for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValueOnce(null)

    const result = await service.createTimeEntry('org_time_1', {
      userId: 'usr_1',
      projectId: 'prj_missing',
      startedAt: T0,
      endedAt: T0 + 60,
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-not-found',
      message: 'The project could not be found.',
      httpStatus: 404,
    })
    expect(timeRepo.createTimeEntry).not.toHaveBeenCalled()
  })

  it('returns tenant-not-found for an unknown organization', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValueOnce(null)

    const result = await service.listTimeEntries('org_missing', {})

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
    expect(timeRepo.listTimeEntries).not.toHaveBeenCalled()
  })

  it('lists entries scoped to the resolved tenant', async () => {
    timeRepo.listTimeEntries.mockResolvedValueOnce([entryRow(), entryRow({ id: 'tme_2' })])

    const result = await service.listTimeEntries('org_time_1', { userId: 'usr_1' })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    expect(timeRepo.listTimeEntries).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ userId: 'usr_1' })
    )
  })

  it('forwards entry filters to the repository', async () => {
    await service.listTimeEntries('org_time_1', {
      projectId: project.id,
      issueId: 'iss_1',
      from: T0 - 100,
      to: T0 + 100,
      billable: true,
      approvalStatus: 'draft',
    })

    expect(timeRepo.listTimeEntries).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        projectId: project.id,
        issueId: 'iss_1',
        from: T0 - 100,
        to: T0 + 100,
        billable: true,
        approvalStatus: 'draft',
      })
    )
  })

  it('serves the entry list as a platform list object', async () => {
    timeRepo.listTimeEntries.mockResolvedValueOnce([entryRow()])

    const response = await requestJson(org('/time-entries?userId=usr_1'), 'GET')

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.has_more).toBe(false)
    expect(response.body.data.total_count).toBe(1)
  })

  it('retrieves a single entry', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const result = await service.retrieveTimeEntry('org_time_1', 'tme_1')

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'tme_1', userId: 'usr_1' })
    expect(timeRepo.retrieveTimeEntry).toHaveBeenCalledWith(tenant.id, 'tme_1')
  })

  it('returns 404 for an unknown entry id', async () => {
    const result = await service.retrieveTimeEntry('org_time_1', 'tme_missing')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/time-entry-not-found',
      message: 'The time entry could not be found.',
      httpStatus: 404,
    })
  })

  it('scopes retrieval to the resolved tenant', async () => {
    await service.retrieveTimeEntry('org_time_1', 'tme_1')

    expect(timeRepo.retrieveTimeEntry).toHaveBeenCalledWith(tenant.id, 'tme_1')
  })

  it('updates an entry note and billable flag', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      note: 'Deep work block',
      billable: true,
    })

    expect(result.error).toBeNull()
    expect(timeRepo.updateTimeEntry).toHaveBeenCalledWith(
      tenant.id,
      'tme_1',
      expect.objectContaining({ note: 'Deep work block', billable: true })
    )
  })

  it('recomputes duration when the entry window changes', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      startedAt: T0,
      endedAt: T0 + 90,
    })

    expect(timeRepo.updateTimeEntry).toHaveBeenCalledWith(
      tenant.id,
      'tme_1',
      expect.objectContaining({ durationMinutes: 2 })
    )
  })

  it('keeps an explicit durationMinutes override on update', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      endedAt: T0 + 3600,
      durationMinutes: 30,
    })

    expect(timeRepo.updateTimeEntry).toHaveBeenCalledWith(
      tenant.id,
      'tme_1',
      expect.objectContaining({ durationMinutes: 30 })
    )
  })

  it('refuses updates from another user', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_2',
      note: 'Hijacked note',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/time-entry-forbidden',
      message: 'You can only change your own time entries.',
      httpStatus: 403,
    })
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('returns 404 when updating an unknown entry', async () => {
    const result = await service.updateTimeEntry('org_time_1', 'tme_missing', {
      userId: 'usr_1',
      note: 'Nowhere to write',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-not-found')
  })

  it('refuses reassignment to an unknown project', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())
    projectsRepo.retrieve.mockResolvedValueOnce(null)

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      projectId: 'prj_missing',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/project-not-found')
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('refuses an update that inverts the entry window', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      endedAt: T0 - 10,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('deletes an entry with a tombstone', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const result = await service.removeTimeEntry('org_time_1', 'tme_1', 'usr_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.time-entry',
      id: 'tme_1',
      deleted: true,
    })
    expect(timeRepo.softDeleteTimeEntry).toHaveBeenCalledWith(
      tenant.id,
      'tme_1',
      expect.objectContaining({ deletedBy: 'usr_1' })
    )
  })

  it('returns 404 when deleting an unknown entry', async () => {
    const result = await service.removeTimeEntry('org_time_1', 'tme_missing', 'usr_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-not-found')
    expect(timeRepo.softDeleteTimeEntry).not.toHaveBeenCalled()
  })

  it('refuses deletes from another user', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const result = await service.removeTimeEntry('org_time_1', 'tme_1', 'usr_2')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-forbidden')
    expect(timeRepo.softDeleteTimeEntry).not.toHaveBeenCalled()
  })

  it('requires the acting userId query when deleting over HTTP', async () => {
    const response = await requestJson(org('/time-entries/tme_1'), 'DELETE')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
    expect(timeRepo.softDeleteTimeEntry).not.toHaveBeenCalled()
  })

  it('deletes over HTTP with the owner scope', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow())

    const response = await requestJson(
      org('/time-entries/tme_1?userId=usr_1'),
      'DELETE'
    )

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'projects.time-entry',
      id: 'tme_1',
      deleted: true,
    })
  })
})

describe('timesheet entry locks', () => {
  it('refuses entry edits once the timesheet is approved', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'approved' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved' })
    )

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      note: 'Too late',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/time-entry-locked',
      message: 'This time entry is locked by its timesheet.',
      httpStatus: 409,
    })
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('refuses entry deletes once the timesheet is approved', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'approved' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved' })
    )

    const result = await service.removeTimeEntry('org_time_1', 'tme_1', 'usr_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-locked')
    expect(timeRepo.softDeleteTimeEntry).not.toHaveBeenCalled()
  })

  it('refuses entry edits while the timesheet is submitted', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'submitted' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      note: 'Under review',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-locked')
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('refuses entry deletes while the timesheet is submitted', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'submitted' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const result = await service.removeTimeEntry('org_time_1', 'tme_1', 'usr_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-locked')
  })

  it('allows entry edits while the timesheet is a draft', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'draft' })
    )

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      note: 'Still editable',
    })

    expect(result.error).toBeNull()
    expect(timeRepo.updateTimeEntry).toHaveBeenCalled()
  })

  it('allows entry edits after the timesheet is rejected', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'rejected' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'rejected' })
    )

    const result = await service.updateTimeEntry('org_time_1', 'tme_1', {
      userId: 'usr_1',
      note: 'Fixing after rejection',
    })

    expect(result.error).toBeNull()
    expect(timeRepo.updateTimeEntry).toHaveBeenCalled()
  })

  it('reports the lock over HTTP with a 409', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'approved' })
    )
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved' })
    )

    const response = await requestJson(org('/time-entries/tme_1'), 'PATCH', {
      userId: 'usr_1',
      note: 'Too late',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('projects/time-entry-locked')
  })
})

describe('timers', () => {
  it('starts a timer as a running entry', async () => {
    const started = runningEntryRow({ billable: true, note: 'Afternoon session' })
    timeRepo.startTimerAtomic.mockResolvedValueOnce({ stopped: null, started })

    const result = await service.startTimer('org_time_1', {
      userId: 'usr_1',
      projectId: project.id,
      note: 'Afternoon session',
      billable: true,
    })

    expect(result.error).toBeNull()
    expect(result.data?.stopped).toBeNull()
    expect(result.data?.started).toMatchObject({
      object: 'projects.time-entry',
      userId: 'usr_1',
      endedAt: null,
      durationMinutes: null,
      billable: true,
      approvalStatus: 'draft',
    })
    expect(timeRepo.startTimerAtomic).toHaveBeenCalledTimes(1)
    expect(timeRepo.startTimerAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        userId: 'usr_1',
        projectId: project.id,
      })
    )
  })

  it('stops the previous timer when a second one starts', async () => {
    const stopped = entryRow({
      id: 'tme_old',
      startedAt: BigInt(T0),
      endedAt: BigInt(T0 + 300),
      durationMinutes: 5,
    })
    const started = runningEntryRow({ id: 'tme_new', startedAt: BigInt(T0 + 300) })
    timeRepo.startTimerAtomic.mockResolvedValueOnce({ stopped, started })

    const result = await service.startTimer('org_time_1', {
      userId: 'usr_1',
      projectId: project.id,
      startedAt: T0 + 300,
    })

    expect(result.error).toBeNull()
    expect(result.data?.stopped).toMatchObject({
      id: 'tme_old',
      endedAt: T0 + 300,
      durationMinutes: 5,
    })
    expect(result.data?.started).toMatchObject({ id: 'tme_new' })
    expect(result.data?.stopped?.id).not.toBe(result.data?.started.id)
  })

  it('starts timers over HTTP returning both entries', async () => {
    timeRepo.startTimerAtomic.mockResolvedValueOnce({
      stopped: entryRow({ id: 'tme_old', durationMinutes: 5 }),
      started: runningEntryRow({ id: 'tme_new' }),
    })

    const response = await requestJson(org('/time-entries/timer/start'), 'POST', {
      userId: 'usr_1',
      projectId: project.id,
    })

    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data.stopped.id).toBe('tme_old')
    expect(response.body.data.started.id).toBe('tme_new')
  })

  it('rejects timer start for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValueOnce(null)

    const result = await service.startTimer('org_time_1', {
      userId: 'usr_1',
      projectId: 'prj_missing',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/project-not-found')
    expect(timeRepo.startTimerAtomic).not.toHaveBeenCalled()
  })

  it('stops a running timer with a computed duration', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(
      runningEntryRow({ startedAt: BigInt(T0) })
    )

    const result = await service.stopTimer('org_time_1', {
      userId: 'usr_1',
      endedAt: T0 + 3600,
    })

    expect(result.error).toBeNull()
    expect(timeRepo.updateTimeEntry).toHaveBeenCalledWith(
      tenant.id,
      'tme_running_1',
      expect.objectContaining({ durationMinutes: 60 })
    )
  })

  it('rounds the stopped duration to the nearest minute', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(
      runningEntryRow({ startedAt: BigInt(T0) })
    )

    await service.stopTimer('org_time_1', {
      userId: 'usr_1',
      endedAt: T0 + 90,
    })

    expect(timeRepo.updateTimeEntry).toHaveBeenCalledWith(
      tenant.id,
      'tme_running_1',
      expect.objectContaining({
        endedAt: BigInt(T0 + 90),
        durationMinutes: 2,
      })
    )
  })

  it('stops a timer over HTTP', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(
      runningEntryRow({ startedAt: BigInt(T0) })
    )

    const response = await requestJson(org('/time-entries/timer/stop'), 'POST', {
      userId: 'usr_1',
      endedAt: T0 + 3600,
    })

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.endedAt).toBe(T0 + 3600)
  })

  it('stop with no running timer 404s', async () => {
    const result = await service.stopTimer('org_time_1', { userId: 'usr_1' })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/timer-not-found',
      message: 'There is no running timer for this user.',
      httpStatus: 404,
    })
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('reports a missing timer over HTTP with a 404', async () => {
    const response = await requestJson(org('/time-entries/timer/stop'), 'POST', {
      userId: 'usr_1',
    })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/timer-not-found')
  })

  it('isolates running timers by user', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(null)

    const result = await service.stopTimer('org_time_1', { userId: 'usr_2' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/timer-not-found')
    expect(timeRepo.retrieveRunningEntry).toHaveBeenCalledWith(
      tenant.id,
      'usr_2'
    )
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })

  it('returns the current running timer', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(runningEntryRow())

    const result = await service.currentTimer('org_time_1', 'usr_1')

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      id: 'tme_running_1',
      endedAt: null,
    })
  })

  it('returns null data when no timer runs', async () => {
    const result = await service.currentTimer('org_time_1', 'usr_1')

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it('reads the current timer over HTTP', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(runningEntryRow())

    const response = await requestJson(
      org('/time-entries/timer/current?userId=usr_1'),
      'GET'
    )

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('tme_running_1')
  })

  it('requires userId for the current timer', async () => {
    const response = await requestJson(org('/time-entries/timer/current'), 'GET')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
  })

  it('refuses to stop a timer before it started', async () => {
    timeRepo.retrieveRunningEntry.mockResolvedValueOnce(
      runningEntryRow({ startedAt: BigInt(T0 + 3600) })
    )

    const result = await service.stopTimer('org_time_1', {
      userId: 'usr_1',
      endedAt: T0,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
    expect(timeRepo.updateTimeEntry).not.toHaveBeenCalled()
  })
})

describe('timesheets', () => {
  it('creates a draft timesheet attaching the requested entries', async () => {
    const sheet = timesheetRow()
    timeRepo.createTimesheet.mockResolvedValueOnce(sheet)
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow({ id: 'tme_1' }))
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(entryRow({ id: 'tme_2' }))
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', timesheetId: 'tsh_1' }),
      entryRow({ id: 'tme_2', timesheetId: 'tsh_1' }),
    ])

    const result = await service.createTimesheet('org_time_1', {
      userId: 'usr_1',
      periodStart: T0 - 86400,
      periodEnd: T0 + 86400,
      entryIds: ['tme_1', 'tme_2'],
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.timesheet',
      status: 'draft',
      userId: 'usr_1',
    })
    expect(timeRepo.attachEntriesToTimesheet).toHaveBeenCalledWith(
      tenant.id,
      ['tme_1', 'tme_2'],
      sheet.id,
      expect.any(BigInt)
    )
    expect(result.data?.entries).toHaveLength(2)
  })

  it('auto-attaches unattached in-period entries when entryIds are omitted', async () => {
    const sheet = timesheetRow()
    timeRepo.createTimesheet.mockResolvedValueOnce(sheet)
    timeRepo.listTimeEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1' }),
      entryRow({ id: 'tme_2', timesheetId: 'tsh_other' }),
    ])
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', timesheetId: 'tsh_1' }),
    ])

    const result = await service.createTimesheet('org_time_1', {
      userId: 'usr_1',
      periodStart: T0 - 86400,
      periodEnd: T0 + 86400,
    })

    expect(result.error).toBeNull()
    expect(timeRepo.listTimeEntries).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        userId: 'usr_1',
        from: T0 - 86400,
        to: T0 + 86400,
      })
    )
    expect(timeRepo.attachEntriesToTimesheet).toHaveBeenCalledWith(
      tenant.id,
      ['tme_1'],
      sheet.id,
      expect.any(BigInt)
    )
  })

  it('creates timesheets over HTTP with a 201 envelope', async () => {
    timeRepo.createTimesheet.mockResolvedValueOnce(timesheetRow())

    const response = await requestJson(org('/timesheets'), 'POST', {
      userId: 'usr_1',
      periodStart: T0 - 86400,
      periodEnd: T0 + 86400,
    })

    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('projects.timesheet')
    expect(response.body.data.status).toBe('draft')
  })

  it('refuses to attach another user’s entry', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ id: 'tme_2', userId: 'usr_2' })
    )

    const result = await service.createTimesheet('org_time_1', {
      userId: 'usr_1',
      periodStart: T0 - 86400,
      periodEnd: T0 + 86400,
      entryIds: ['tme_2'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-forbidden')
    expect(timeRepo.createTimesheet).not.toHaveBeenCalled()
  })

  it('refuses to attach an already-attached entry', async () => {
    timeRepo.retrieveTimeEntry.mockResolvedValueOnce(
      entryRow({ id: 'tme_1', timesheetId: 'tsh_other' })
    )

    const result = await service.createTimesheet('org_time_1', {
      userId: 'usr_1',
      periodStart: T0 - 86400,
      periodEnd: T0 + 86400,
      entryIds: ['tme_1'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
    expect(timeRepo.createTimesheet).not.toHaveBeenCalled()
  })

  it('returns 404 when attaching an unknown entry', async () => {
    const result = await service.createTimesheet('org_time_1', {
      userId: 'usr_1',
      periodStart: T0 - 86400,
      periodEnd: T0 + 86400,
      entryIds: ['tme_missing'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/time-entry-not-found')
    expect(timeRepo.createTimesheet).not.toHaveBeenCalled()
  })

  it('rejects an inverted period over HTTP', async () => {
    const response = await requestJson(org('/timesheets'), 'POST', {
      userId: 'usr_1',
      periodStart: T0 + 86400,
      periodEnd: T0 - 86400,
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
    expect(timeRepo.createTimesheet).not.toHaveBeenCalled()
  })

  it('retrieves a timesheet with entries and derived totals', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', durationMinutes: 60, billable: true }),
      entryRow({ id: 'tme_2', durationMinutes: 30, billable: false }),
    ])

    const result = await service.retrieveTimesheet('org_time_1', 'tsh_1')

    expect(result.error).toBeNull()
    expect(result.data?.entries).toHaveLength(2)
    expect(result.data?.totals).toEqual({
      totalMinutes: 90,
      billableMinutes: 60,
      nonBillableMinutes: 30,
      entryCount: 2,
    })
  })

  it('splits timesheet totals into billable and non-billable minutes', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', durationMinutes: 120, billable: true }),
      entryRow({ id: 'tme_2', durationMinutes: 45, billable: true }),
      entryRow({ id: 'tme_3', durationMinutes: 15, billable: false }),
    ])

    const result = await service.retrieveTimesheet('org_time_1', 'tsh_1')

    expect(result.data?.totals).toEqual({
      totalMinutes: 180,
      billableMinutes: 165,
      nonBillableMinutes: 15,
      entryCount: 3,
    })
  })

  it('counts running entries as zero minutes in timesheet totals', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', durationMinutes: 60 }),
      runningEntryRow({ id: 'tme_running_1' }),
    ])

    const result = await service.retrieveTimesheet('org_time_1', 'tsh_1')

    expect(result.data?.totals).toEqual({
      totalMinutes: 60,
      billableMinutes: 0,
      nonBillableMinutes: 60,
      entryCount: 2,
    })
  })

  it('excludes soft-deleted entries from timesheet totals', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', durationMinutes: 60 }),
      entryRow({ id: 'tme_gone', durationMinutes: 600, deletedAt: BigInt(T0) }),
    ])

    const result = await service.retrieveTimesheet('org_time_1', 'tsh_1')

    expect(result.data?.entries).toHaveLength(1)
    expect(result.data?.totals.totalMinutes).toBe(60)
  })

  it('returns 404 for an unknown timesheet', async () => {
    const result = await service.retrieveTimesheet('org_time_1', 'tsh_missing')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/timesheet-not-found',
      message: 'The timesheet could not be found.',
      httpStatus: 404,
    })
  })

  it('lists timesheets filtered by user and status', async () => {
    timeRepo.listTimesheets.mockResolvedValueOnce([timesheetRow()])

    const result = await service.listTimesheets('org_time_1', {
      userId: 'usr_1',
      status: 'draft',
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(timeRepo.listTimesheets).toHaveBeenCalledWith(
      tenant.id,
      { userId: 'usr_1', status: 'draft' }
    )
  })

  it('serves the timesheet list as a platform list object', async () => {
    timeRepo.listTimesheets.mockResolvedValueOnce([timesheetRow()])

    const response = await requestJson(
      org('/timesheets?userId=usr_1&status=draft'),
      'GET'
    )

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.total_count).toBe(1)
  })

  it('submits a draft timesheet and writes the transition event', async () => {
    const submitted = timesheetRow({ status: 'submitted' })
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.updateTimesheet.mockResolvedValueOnce(submitted)
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'submitted' }),
    ])

    const result = await service.submitTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('submitted')
    expect(timeRepo.setEntriesApprovalForTimesheet).toHaveBeenCalledWith(
      tenant.id,
      'tsh_1',
      'submitted',
      expect.any(BigInt)
    )
    expect(timeRepo.createTimesheetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        timesheetId: 'tsh_1',
        actorUserId: 'usr_1',
        fromStatus: 'draft',
        toStatus: 'submitted',
      })
    )
  })

  it('allows resubmission after a rejection', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'rejected' })
    )
    timeRepo.updateTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const result = await service.submitTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('submitted')
    expect(timeRepo.createTimesheetEvent).toHaveBeenCalledWith(
      expect.objectContaining({ fromStatus: 'rejected', toStatus: 'submitted' })
    )
  })

  it('refuses submit from anyone but the owner', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())

    const result = await service.submitTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_2',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/timesheet-forbidden',
      message: 'Only the timesheet owner can perform this action.',
      httpStatus: 403,
    })
    expect(timeRepo.updateTimesheet).not.toHaveBeenCalled()
  })

  it('refuses submit from an approved timesheet', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved' })
    )

    const result = await service.submitTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_1',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/timesheet-transition-invalid',
      message: 'This timesheet cannot move from its current status.',
      httpStatus: 422,
    })
  })

  it('submits over HTTP', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.updateTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const response = await requestJson(org('/timesheets/tsh_1/submit'), 'POST', {
      userId: 'usr_1',
    })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('submitted')
  })

  it('approves a submitted timesheet and records the decision', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )
    timeRepo.updateTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved', decidedBy: 'usr_lead' })
    )
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'approved' }),
    ])

    const result = await service.approveTimesheet('org_time_1', 'tsh_1', {
      decidedBy: 'usr_lead',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('approved')
    expect(timeRepo.setEntriesApprovalForTimesheet).toHaveBeenCalledWith(
      tenant.id,
      'tsh_1',
      'approved',
      expect.any(BigInt)
    )
    expect(timeRepo.createTimesheetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'usr_lead',
        fromStatus: 'submitted',
        toStatus: 'approved',
      })
    )
  })

  it('refuses self-approval by the submitter', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const result = await service.approveTimesheet('org_time_1', 'tsh_1', {
      decidedBy: 'usr_1',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/timesheet-self-approval',
      message: 'The submitter cannot approve their own timesheet.',
      httpStatus: 403,
    })
    expect(timeRepo.updateTimesheet).not.toHaveBeenCalled()
  })

  it('refuses approval from a draft timesheet', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())

    const result = await service.approveTimesheet('org_time_1', 'tsh_1', {
      decidedBy: 'usr_lead',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/timesheet-transition-invalid')
  })

  it('reports self-approval over HTTP with a 403', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const response = await requestJson(
      org('/timesheets/tsh_1/approve'),
      'POST',
      { decidedBy: 'usr_1' }
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('projects/timesheet-self-approval')
  })

  it('rejects a submitted timesheet with a note', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )
    timeRepo.updateTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'rejected', note: 'Missing Friday entries' })
    )

    const result = await service.rejectTimesheet('org_time_1', 'tsh_1', {
      decidedBy: 'usr_lead',
      note: 'Missing Friday entries',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('rejected')
    expect(timeRepo.setEntriesApprovalForTimesheet).toHaveBeenCalledWith(
      tenant.id,
      'tsh_1',
      'rejected',
      expect.any(BigInt)
    )
    expect(timeRepo.createTimesheetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'usr_lead',
        fromStatus: 'submitted',
        toStatus: 'rejected',
        note: 'Missing Friday entries',
      })
    )
  })

  it('refuses rejection without a note over HTTP', async () => {
    const response = await requestJson(
      org('/timesheets/tsh_1/reject'),
      'POST',
      { decidedBy: 'usr_lead' }
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
    expect(timeRepo.updateTimesheet).not.toHaveBeenCalled()
  })

  it('refuses self-rejection by the submitter', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const result = await service.rejectTimesheet('org_time_1', 'tsh_1', {
      decidedBy: 'usr_1',
      note: 'Trying to reject my own sheet',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/timesheet-self-approval')
    expect(timeRepo.updateTimesheet).not.toHaveBeenCalled()
  })

  it('recalls a submitted timesheet back to draft as the owner', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )
    timeRepo.updateTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'draft' })
    )
    timeRepo.listTimesheetEntries.mockResolvedValueOnce([
      entryRow({ timesheetId: 'tsh_1', approvalStatus: 'draft' }),
    ])

    const result = await service.recallTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('draft')
    expect(timeRepo.setEntriesApprovalForTimesheet).toHaveBeenCalledWith(
      tenant.id,
      'tsh_1',
      'draft',
      expect.any(BigInt)
    )
    expect(timeRepo.createTimesheetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'usr_1',
        fromStatus: 'submitted',
        toStatus: 'draft',
      })
    )
  })

  it('refuses recall from anyone but the owner', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )

    const result = await service.recallTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_2',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/timesheet-forbidden')
    expect(timeRepo.updateTimesheet).not.toHaveBeenCalled()
  })

  it('refuses recall from an approved timesheet', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved' })
    )

    const result = await service.recallTimesheet('org_time_1', 'tsh_1', {
      userId: 'usr_1',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/timesheet-transition-invalid')
  })

  it('recalls over HTTP', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'submitted' })
    )
    timeRepo.updateTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'draft' })
    )

    const response = await requestJson(org('/timesheets/tsh_1/recall'), 'POST', {
      userId: 'usr_1',
    })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('draft')
  })

  it('lists transition events with from and to', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(
      timesheetRow({ status: 'approved' })
    )
    timeRepo.listTimesheetEvents.mockResolvedValueOnce([
      timesheetEventRow(),
      timesheetEventRow({
        id: 'tshe_2',
        actorUserId: 'usr_lead',
        fromStatus: 'submitted',
        toStatus: 'approved',
      }),
    ])

    const result = await service.listTimesheetEvents('org_time_1', 'tsh_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      expect.objectContaining({
        object: 'projects.timesheet-event',
        from: 'draft',
        to: 'submitted',
      }),
      expect.objectContaining({
        object: 'projects.timesheet-event',
        from: 'submitted',
        to: 'approved',
      }),
    ])
    expect(timeRepo.listTimesheetEvents).toHaveBeenCalledWith(
      tenant.id,
      'tsh_1'
    )
  })

  it('serves transition events as a platform list object', async () => {
    timeRepo.retrieveTimesheet.mockResolvedValueOnce(timesheetRow())
    timeRepo.listTimesheetEvents.mockResolvedValueOnce([timesheetEventRow()])

    const response = await requestJson(org('/timesheets/tsh_1/events'), 'GET')

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.data).toHaveLength(1)
  })

  it('returns 404 for events of an unknown timesheet', async () => {
    const result = await service.listTimesheetEvents('org_time_1', 'tsh_missing')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/timesheet-not-found')
  })
})

describe('time summary', () => {
  it('totals minutes per project', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', projectId: 'prj_a', durationMinutes: 60 }),
      entryRow({ id: 'tme_2', projectId: 'prj_a', durationMinutes: 30 }),
      entryRow({ id: 'tme_3', projectId: 'prj_b', durationMinutes: 15 }),
    ])

    const result = await service.getTimeSummary('org_time_1', {
      groupBy: 'project',
      from: T0 - 100,
      to: T0 + 7200,
    })

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'projects.time-summary',
      groupBy: 'project',
    })
    expect(result.data?.groups).toEqual([
      {
        key: 'prj_a',
        totalMinutes: 90,
        billableMinutes: 0,
        nonBillableMinutes: 90,
        entryCount: 2,
      },
      {
        key: 'prj_b',
        totalMinutes: 15,
        billableMinutes: 0,
        nonBillableMinutes: 15,
        entryCount: 1,
      },
    ])
    expect(result.data?.totals.totalMinutes).toBe(105)
  })

  it('totals minutes per user', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', userId: 'usr_1', durationMinutes: 60 }),
      entryRow({ id: 'tme_2', userId: 'usr_2', durationMinutes: 45 }),
    ])

    const result = await service.getTimeSummary('org_time_1', {
      groupBy: 'user',
      from: T0 - 100,
      to: T0 + 7200,
    })

    expect(result.data?.groups).toEqual([
      {
        key: 'usr_1',
        totalMinutes: 60,
        billableMinutes: 0,
        nonBillableMinutes: 60,
        entryCount: 1,
      },
      {
        key: 'usr_2',
        totalMinutes: 45,
        billableMinutes: 0,
        nonBillableMinutes: 45,
        entryCount: 1,
      },
    ])
  })

  it('totals minutes per issue', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', issueId: 'iss_1', durationMinutes: 60 }),
      entryRow({ id: 'tme_2', issueId: 'iss_2', durationMinutes: 20 }),
    ])

    const result = await service.getTimeSummary('org_time_1', {
      groupBy: 'issue',
      from: T0 - 100,
      to: T0 + 7200,
    })

    expect(result.data?.groups.map((group) => group.key)).toEqual([
      'iss_1',
      'iss_2',
    ])
    expect(result.data?.totals).toEqual({
      totalMinutes: 80,
      billableMinutes: 0,
      nonBillableMinutes: 80,
      entryCount: 2,
    })
  })

  it('buckets minutes per UTC day', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', startedAt: BigInt(T0), durationMinutes: 60 }),
      entryRow({
        id: 'tme_2',
        startedAt: BigInt(T0 + 86400),
        endedAt: BigInt(T0 + 86400 + 600),
        durationMinutes: 10,
      }),
    ])

    const result = await service.getTimeSummary('org_time_1', {
      groupBy: 'day',
      from: T0 - 100,
      to: T0 + 90000,
    })

    expect(result.data?.groups).toHaveLength(2)
    expect(result.data?.groups[0]?.key).toBe(
      new Date(T0 * 1000).toISOString().slice(0, 10)
    )
    expect(result.data?.groups[1]?.key).toBe(
      new Date((T0 + 86400) * 1000).toISOString().slice(0, 10)
    )
  })

  it('splits billable and non-billable minutes per group', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', durationMinutes: 50, billable: true }),
      entryRow({ id: 'tme_2', durationMinutes: 25, billable: false }),
    ])

    const result = await service.getTimeSummary('org_time_1', {
      groupBy: 'project',
      from: T0 - 100,
      to: T0 + 7200,
    })

    expect(result.data?.groups).toEqual([
      {
        key: project.id,
        totalMinutes: 75,
        billableMinutes: 50,
        nonBillableMinutes: 25,
        entryCount: 2,
      },
    ])
    expect(result.data?.totals).toEqual({
      totalMinutes: 75,
      billableMinutes: 50,
      nonBillableMinutes: 25,
      entryCount: 2,
    })
  })

  it('respects user and project scope filters', async () => {
    await service.getTimeSummary('org_time_1', {
      groupBy: 'user',
      from: T0 - 100,
      to: T0 + 7200,
      userId: 'usr_1',
      projectId: project.id,
    })

    expect(timeRepo.listEntriesForSummary).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        from: T0 - 100,
        to: T0 + 7200,
        userId: 'usr_1',
        projectId: project.id,
      })
    )
  })

  it('excludes soft-deleted entries from summaries', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ id: 'tme_1', durationMinutes: 60 }),
      entryRow({ id: 'tme_gone', durationMinutes: 600, deletedAt: BigInt(T0) }),
    ])

    const result = await service.getTimeSummary('org_time_1', {
      groupBy: 'project',
      from: T0 - 100,
      to: T0 + 7200,
    })

    expect(result.data?.totals.totalMinutes).toBe(60)
    expect(result.data?.totals.entryCount).toBe(1)
  })

  it('scopes summaries to the resolved tenant', async () => {
    await service.getTimeSummary('org_time_1', {
      groupBy: 'project',
      from: T0 - 100,
      to: T0 + 7200,
    })

    expect(timeRepo.listEntriesForSummary).toHaveBeenCalledWith(
      tenant.id,
      expect.anything()
    )
  })

  it('serves the summary over HTTP', async () => {
    timeRepo.listEntriesForSummary.mockResolvedValueOnce([
      entryRow({ durationMinutes: 60, billable: true }),
    ])

    const response = await requestJson(
      org(`/time-summary?groupBy=project&from=${T0 - 100}&to=${T0 + 7200}`),
      'GET'
    )

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('projects.time-summary')
    expect(response.body.data.totals.totalMinutes).toBe(60)
  })

  it('rejects an inverted summary window', async () => {
    const response = await requestJson(
      org(`/time-summary?groupBy=project&from=${T0 + 7200}&to=${T0 - 100}`),
      'GET'
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
  })

  it('rejects an unknown summary group', async () => {
    const response = await requestJson(
      org(`/time-summary?groupBy=money&from=${T0 - 100}&to=${T0 + 7200}`),
      'GET'
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
  })
})
