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
  workReminders,
  workEvents,
  workParticipants,
  workCalendars,
  workClient,
  resolveProjectsCalendarId,
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
    createEventLink: vi.fn(),
    listEventLinks: vi.fn(),
    retrieveEventLink: vi.fn(),
    updateEventLink: vi.fn(),
    deleteEventLink: vi.fn(),
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
    listCalendarProjects: vi.fn(),
    listCalendarMilestones: vi.fn(),
    listCalendarIssues: vi.fn(),
    listAssignedIssues: vi.fn(),
    retrieveIssueDueDate: vi.fn(),
    retrieveMilestoneTargetDate: vi.fn(),
    retrieveEventStart: vi.fn(),
  },
  workReminders: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    recurrenceRetrieve: vi.fn(),
    recurrenceSet: vi.fn(),
    recurrenceClear: vi.fn(),
  },
  workEvents: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    recurrenceRetrieve: vi.fn(),
    recurrenceSet: vi.fn(),
    recurrenceClear: vi.fn(),
  },
  workParticipants: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  workCalendars: { list: vi.fn(), create: vi.fn() },
  workClient: vi.fn(),
  resolveProjectsCalendarId: vi.fn(),
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
vi.mock('../calendar.repository.js', () => calendarRepo)
vi.mock('../../../providers/work.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../providers/work.js')>()),
  workClient,
  resolveProjectsCalendarId,
}))

vi.mock('../../layouts/layouts.repository.js', () => layoutsRepo)
vi.mock(
  '../../custom-fields/project-custom-fields.repository.js',
  () => projectCustomFieldsRepo
)
const { createCalendarRouter } = await import('../calendar.routes.js')

const tenant = {
  id: 'prjten_cal_1',
  organizationId: 'org_cal_1',
  triageProjectId: 'prj_triage_cal',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const project = {
  id: 'prj_cal_1',
  tenantId: tenant.id,
  name: 'Calendar Project',
  key: 'CAL',
  slug: 'calendar-project',
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

const DAY = 86400
const WINDOW_START = 1788000000

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prjev_1',
    tenantId: tenant.id,
    projectId: project.id,
    milestoneId: null,
    issueId: null,
    kind: 'event',
    title: 'Sprint planning',
    description: null,
    startsAt: 1788000000n,
    endsAt: 1788003600n,
    allDay: false,
    location: null,
    meetingUrl: null,
    createdBy: 'usr_1',
    recurrenceFreq: null,
    recurrenceInterval: null,
    recurrenceByWeekday: null,
    recurrenceUntil: null,
    recurrenceCount: null,
    createdAt: 1787900000,
    updatedAt: 1787900000,
    ...overrides,
  }
}

function attendeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prjeva_1',
    tenantId: tenant.id,
    eventId: 'prjev_1',
    userId: 'usr_2',
    response: 'invited',
    createdAt: 1787900000,
    updatedAt: 1787900000,
    ...overrides,
  }
}

function eventLink(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'prjev_1',
    tenantId: tenant.id,
    projectId: project.id,
    milestoneId: null,
    issueId: null,
    kind: 'event',
    createdAt: 1787900000n,
    updatedAt: 1787900000n,
    ...overrides,
  }
}

function workEvent(overrides: Record<string, unknown> = {}) {
  return {
    object: 'event',
    id: 'prjev_1',
    uid: 'uid_prjev_1',
    organizationId: 'org_cal_1',
    calendarId: 'cal_projects_1',
    context: { service: 'projects', resource: 'project', id: project.id },
    title: 'Sprint planning',
    description: null,
    location: null,
    meetingUrl: null,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    allDay: false,
    startAt: 1788000000,
    endAt: 1788003600,
    timeZone: 'UTC',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'usr_1',
    createdAt: 1787900000,
    updatedAt: 1787900000,
    ...overrides,
  }
}

function reminderRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'reminder',
    id: 'prjrem_1',
    organizationId: 'org_cal_1',
    context: { service: 'projects', resource: 'issue', id: 'iss_cal_a' },
    title: 'Issue reminder',
    note: null,
    remindAt: 1788000000,
    offsetMinutesBeforeDue: null,
    channel: 'in-app',
    timeZone: null,
    recurrenceRuleId: null,
    userId: 'usr_1',
    status: 'SCHEDULED',
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_1',
    createdAt: 1787900000,
    updatedAt: 1787900000,
    ...overrides,
  }
}

function workListEnvelope(rows: unknown[]) {
  return {
    data: {
      object: 'list',
      data: rows,
      has_more: false,
      total_count: null,
      url: '/v1/organizations/org_cal_1/reminders',
    },
    error: null,
  }
}

function workRuleRow(overrides: Record<string, unknown> = {}) {
  return {
    object: 'recurrence_rule',
    id: 'rule_1',
    organizationId: 'org_cal_1',
    frequency: 'DAILY',
    interval: 1,
    byDay: [],
    byMonthDay: [],
    byMonth: [],
    count: null,
    untilAt: null,
    timeZone: 'UTC',
    weekStart: null,
    rrule: 'DTSTART:20260101T000000Z\nRRULE:FREQ=DAILY;INTERVAL=1',
    createdBy: 'usr_1',
    createdAt: 1787900000,
    updatedAt: 1787900000,
    ...overrides,
  }
}

async function requestJson(method: string, path: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createCalendarRouter())
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
  layoutsRepo.listLayouts.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFields.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValues.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValuesForProjects.mockResolvedValue(
    []
  )
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  projectsRepo.retrieve.mockResolvedValue(project)
  projectsRepo.retrieveByKey.mockResolvedValue(null)
  calendarRepo.listEvents.mockResolvedValue([])
  calendarRepo.listEventLinks.mockResolvedValue([])
  calendarRepo.retrieveEventLink.mockResolvedValue(null)
  calendarRepo.createEventLink.mockImplementation(async (params: unknown) => ({
    ...(params as Record<string, unknown>),
  }))
  calendarRepo.updateEventLink.mockImplementation(async (_tenant: string, _event: string, patch: unknown) => ({
    ...eventLink(),
    ...(patch as Record<string, unknown>),
  }))
  calendarRepo.retrieveEvent.mockResolvedValue(null)
  calendarRepo.listAttendeesForEvents.mockResolvedValue([])
  calendarRepo.retrieveAttendee.mockResolvedValue(null)
  calendarRepo.listAttendeesByUser.mockResolvedValue([])
  calendarRepo.listCalendarProjects.mockResolvedValue([])
  calendarRepo.listCalendarMilestones.mockResolvedValue([])
  calendarRepo.listCalendarIssues.mockResolvedValue([])
  calendarRepo.listAssignedIssues.mockResolvedValue([])
  workClient.mockReturnValue({
    calendars: workCalendars,
    events: {
      list: workEvents.list,
      retrieve: workEvents.retrieve,
      create: workEvents.create,
      update: workEvents.update,
      delete: workEvents.delete,
      recurrence: {
        retrieve: workEvents.recurrenceRetrieve,
        set: workEvents.recurrenceSet,
        clear: workEvents.recurrenceClear,
      },
    },
    eventParticipants: workParticipants,
    reminders: {
      list: workReminders.list,
      retrieve: workReminders.retrieve,
      create: workReminders.create,
      update: workReminders.update,
      delete: workReminders.delete,
      recurrence: {
        retrieve: workReminders.recurrenceRetrieve,
        set: workReminders.recurrenceSet,
        clear: workReminders.recurrenceClear,
      },
    },
  })
  workCalendars.list.mockResolvedValue(workListEnvelope([]))
  resolveProjectsCalendarId.mockResolvedValue('cal_projects_1')
  workCalendars.create.mockResolvedValue({
    data: { id: 'cal_projects_1' },
    error: null,
  })
  workEvents.list.mockResolvedValue(workListEnvelope([]))
  workEvents.retrieve.mockResolvedValue({ data: workEvent(), error: null })
  workEvents.create.mockImplementation(async (_org: string, input: unknown) => ({
    data: workEvent({ ...(input as Record<string, unknown>) }),
    error: null,
  }))
  workEvents.update.mockImplementation(async (_org: string, _id: string, input: unknown) => ({
    data: workEvent({ ...(input as Record<string, unknown>) }),
    error: null,
  }))
  workEvents.delete.mockResolvedValue({
    data: { object: 'event', id: 'prjev_1', deleted: true },
    error: null,
  })
  workEvents.recurrenceRetrieve.mockResolvedValue({ data: null, error: null })
  workEvents.recurrenceClear.mockResolvedValue({ data: workEvent(), error: null })
  workParticipants.create.mockImplementation(
    async (_org: string, eventId: string, input: Record<string, unknown>) => ({
      data: {
        ...attendeeRow(),
        eventId,
        kind: input.kind,
        participantId: input.participantId,
        email: null,
        name: null,
        role: 'REQUIRED',
        status: input.status,
        delegatedTo: null,
        delegatedFrom: null,
        respondedAt: null,
        object: 'event_participant',
      },
      error: null,
    })
  )
  workParticipants.update.mockResolvedValue({
    data: {
      ...attendeeRow(),
      object: 'event_participant',
      kind: 'USER',
      participantId: 'usr_2',
      email: null,
      name: null,
      role: 'REQUIRED',
      status: 'ACCEPTED',
      delegatedTo: null,
      delegatedFrom: null,
      respondedAt: null,
    },
    error: null,
  })
  workParticipants.delete.mockResolvedValue({
    data: { object: 'event_participant', id: 'prjeva_1', deleted: true },
    error: null,
  })
  workReminders.list.mockResolvedValue(workListEnvelope([]))
  workReminders.retrieve.mockResolvedValue({
    data: reminderRow(),
    error: null,
  })
  workReminders.create.mockImplementation(
    async (_org: string, input: unknown) => ({
      data: reminderRow({
        ...(input as Record<string, unknown>),
        context:
          (input as { context?: unknown }).context ?? reminderRow().context,
      }),
      error: null,
    })
  )
  workReminders.update.mockImplementation(
    async (_org: string, _id: string, input: unknown) => ({
      data: reminderRow({ ...(input as Record<string, unknown>) }),
      error: null,
    })
  )
  workReminders.delete.mockResolvedValue({
    data: { object: 'reminder', id: 'prjrem_1', deleted: true },
    error: null,
  })
  workReminders.recurrenceRetrieve.mockResolvedValue({
    data: null,
    error: null,
  })
})

describe('calendar events', () => {
  it('lists events with their attendees attached', async () => {
    calendarRepo.listEventLinks.mockResolvedValue([eventLink()])
    workEvents.list.mockResolvedValue(
      workListEnvelope([
        workEvent({
          participants: [
            {
              ...attendeeRow(), object: 'event_participant', kind: 'USER', participantId: 'usr_2', email: null, name: null, role: 'REQUIRED', status: 'NEEDS_ACTION', delegatedTo: null, delegatedFrom: null, respondedAt: null,
            },
          ],
        }),
      ])
    )
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/events'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toHaveLength(1)
    expect(response.body.data.data[0].object).toBe('projects.event')
    expect(response.body.data.data[0].attendees).toHaveLength(1)
    expect(response.body.data.data[0].attendees[0].userId).toBe('usr_2')
  })

  it('scopes the event list to the requested project', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/events?projectId=prj_cal_1'
    )
    expect(response.status).toBe(200)
    expect(workEvents.list).toHaveBeenCalledWith('org_cal_1', {
      context: { service: 'projects', resource: 'project', id: 'prj_cal_1' },
      limit: 100,
    })
  })

  it('creates an event inside a known project', async () => {
    calendarRepo.createEvent.mockImplementation(async (params: unknown) => ({
      ...(params as Record<string, unknown>),
    }))
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/events',
      { projectId: 'prj_cal_1', title: 'Launch review', startsAt: 1788000000 }
    )
    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('projects.event')
    expect(response.body.data.title).toBe('Launch review')
    expect(response.body.data.kind).toBe('event')
    expect(response.body.data.attendees).toEqual([])
  })

  it('rejects event creation for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/events',
      { projectId: 'prj_missing', title: 'Lost', startsAt: 1788000000 }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/project-not-found')
  })

  it('retrieves a single event', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/events/prjev_1'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('prjev_1')
  })

  it('returns 404 for an unknown event id', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/events/prjev_missing'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/event-not-found')
  })

  it('updates an event title', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/events/prjev_1',
      { title: 'Renamed planning' }
    )
    expect(response.status).toBe(200)
    expect(response.body.data.title).toBe('Renamed planning')
  })

  it('returns 404 when updating an unknown event', async () => {
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/events/prjev_missing',
      { title: 'Ghost' }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/event-not-found')
  })

  it('deletes an event with a tombstone', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/events/prjev_1'
    )
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'projects.event',
      id: 'prjev_1',
      deleted: true,
    })
    expect(calendarRepo.deleteEventLink).toHaveBeenCalledWith(tenant.id, 'prjev_1')
  })

  it('returns 404 when deleting an unknown event', async () => {
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/events/prjev_missing'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/event-not-found')
  })

  it('isolates tenants on every event route', async () => {
    tenantsRepo.retrieveByOrganization.mockResolvedValue(null)
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_unknown/events'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/tenant-not-found')
  })
})

describe('event attendees', () => {
  it('adds an attendee to an event', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees',
      { userId: 'usr_2', response: 'accepted' }
    )
    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('projects.event-attendee')
    expect(response.body.data.response).toBe('accepted')
  })

  it('rejects a duplicate attendee', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    workEvents.retrieve.mockResolvedValue({
      data: workEvent({ participants: [{ ...attendeeRow(), object: 'event_participant', kind: 'USER', participantId: 'usr_2', email: null, name: null, role: 'REQUIRED', status: 'NEEDS_ACTION', delegatedTo: null, delegatedFrom: null, respondedAt: null }] }),
      error: null,
    })
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees',
      { userId: 'usr_2' }
    )
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('projects/attendee-exists')
  })

  it('rejects attendees for an unknown event', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/events/prjev_missing/attendees',
      { userId: 'usr_2' }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/event-not-found')
  })

  it('records an attendee response', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    workEvents.retrieve.mockResolvedValue({
      data: workEvent({ participants: [{ ...attendeeRow(), object: 'event_participant', kind: 'USER', participantId: 'usr_2', email: null, name: null, role: 'REQUIRED', status: 'NEEDS_ACTION', delegatedTo: null, delegatedFrom: null, respondedAt: null }] }),
      error: null,
    })
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_2',
      { response: 'accepted' }
    )
    expect(response.status).toBe(200)
    expect(response.body.data.response).toBe('accepted')
  })

  it('returns 404 when the attendee row is missing', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_ghost',
      { response: 'accepted' }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/attendee-not-found')
  })

  it('removes an attendee with a tombstone', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    workEvents.retrieve.mockResolvedValue({
      data: workEvent({ participants: [{ ...attendeeRow(), object: 'event_participant', kind: 'USER', participantId: 'usr_2', email: null, name: null, role: 'REQUIRED', status: 'NEEDS_ACTION', delegatedTo: null, delegatedFrom: null, respondedAt: null }] }),
      error: null,
    })
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_2'
    )
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'projects.event-attendee',
      id: 'prjeva_1',
      deleted: true,
    })
  })

  it('returns 404 when removing an unknown attendee', async () => {
    calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_ghost'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/attendee-not-found')
  })
})

describe('Work event mapping regressions', () => {
  for (const [response, status] of [
    ['invited', 'NEEDS_ACTION'],
    ['accepted', 'ACCEPTED'],
    ['declined', 'DECLINED'],
    ['tentative', 'TENTATIVE'],
  ] as const) {
    it(`maps attendee creation ${response} to ${status}`, async () => {
      calendarRepo.retrieveEventLink.mockResolvedValue(eventLink())
      const result = await requestJson(
        'POST',
        '/v1/organizations/org_cal_1/events/prjev_1/attendees',
        { userId: 'usr_2', response }
      )
      expect(result.status).toBe(201)
      expect(result.body).toEqual({
        data: {
          object: 'projects.event-attendee', id: 'prjeva_1', eventId: 'prjev_1', userId: 'usr_2', response, createdAt: 1787900000, updatedAt: 1787900000,
        },
        error: null,
      })
      expect(workParticipants.create).toHaveBeenCalledWith('org_cal_1', 'prjev_1', {
        kind: 'USER', participantId: 'usr_2', status,
      })
    })

    it(`maps Work attendee ${status} back to ${response}`, async () => {
      calendarRepo.listEventLinks.mockResolvedValue([eventLink()])
      workEvents.list.mockResolvedValue(workListEnvelope([
        workEvent({ participants: [{ ...attendeeRow(), object: 'event_participant', kind: 'USER', participantId: 'usr_2', email: null, name: null, role: 'REQUIRED', status, delegatedTo: null, delegatedFrom: null, respondedAt: null }] }),
      ]))
      const result = await requestJson('GET', '/v1/organizations/org_cal_1/events')
      expect(result.status).toBe(200)
      expect(result.body.data.data[0].attendees[0].response).toBe(response)
    })
  }

  for (const [allDay, meetingUrl] of [
    [false, null], [false, 'https://meet.example/review'], [true, null], [true, 'https://meet.example/review'],
  ] as const) {
    it(`creates ${allDay ? 'an all-day' : 'a timed'} event ${meetingUrl ? 'with' : 'without'} a meeting URL`, async () => {
      const result = await requestJson('POST', '/v1/organizations/org_cal_1/events', {
        projectId: project.id, title: 'Launch review', startsAt: 1788000000, endsAt: 1788086400, allDay, meetingUrl,
      })
      expect(result.status).toBe(201)
      expect(result.body.data.meetingUrl).toBe(meetingUrl)
      expect(workEvents.create).toHaveBeenCalledWith('org_cal_1', expect.objectContaining({
        calendarId: 'cal_projects_1', context: { service: 'projects', resource: 'project', id: project.id }, allDay, meetingUrl,
      }))
    })
  }
})

describe('reminders', () => {
  it('lists reminders scoped to their creator through Work', async () => {
    workReminders.list.mockResolvedValue(workListEnvelope([reminderRow()]))
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders?createdBy=usr_1'
    )
    expect(response.status).toBe(200)
    expect(workReminders.list).toHaveBeenCalledTimes(1)
    expect(workReminders.list).toHaveBeenCalledWith('org_cal_1', {
      userId: 'usr_1',
      limit: 100,
    })
    expect(workReminders.recurrenceRetrieve).toHaveBeenCalledTimes(1)
    expect(workReminders.recurrenceRetrieve).toHaveBeenCalledWith(
      'org_cal_1',
      'prjrem_1'
    )
    expect(response.body.data.data).toHaveLength(1)
    expect(response.body.data.data[0]).toEqual({
      object: 'projects.reminder',
      id: 'prjrem_1',
      tenantId: tenant.id,
      issueId: 'iss_cal_a',
      milestoneId: null,
      eventId: null,
      remindAt: 1788000000,
      offsetMinutesBeforeDue: null,
      recurrence: null,
      channel: 'in-app',
      createdBy: 'usr_1',
      active: true,
      createdAt: 1787900000,
      updatedAt: 1787900000,
    })
  })

  it('keeps reminders from other services out of the list', async () => {
    workReminders.list.mockResolvedValue(
      workListEnvelope([
        reminderRow(),
        reminderRow({
          id: 'prjrem_crm',
          context: { service: 'crm', resource: 'request', id: 'req_1' },
          createdBy: 'usr_1',
          userId: 'usr_1',
        }),
      ])
    )
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders?createdBy=usr_1'
    )
    expect(response.status).toBe(200)
    expect(
      response.body.data.data.map((row: { id: string }) => row.id)
    ).toEqual(['prjrem_1'])
  })

  it('returns an empty list when Work has no reminders', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders?createdBy=usr_2'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
    expect(workReminders.list).toHaveBeenCalledTimes(1)
    expect(workReminders.list).toHaveBeenCalledWith('org_cal_1', {
      userId: 'usr_2',
      limit: 100,
    })
  })

  it('requires the creator scope when listing reminders', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders'
    )
    expect(response.status).toBe(400)
    expect(workReminders.list).not.toHaveBeenCalled()
  })

  it('creates a reminder carrying the Projects issue context', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      { issueId: 'iss_cal_a', remindAt: 1788000000, createdBy: 'usr_1' }
    )
    expect(response.status).toBe(201)
    expect(workReminders.create).toHaveBeenCalledTimes(1)
    expect(workReminders.create).toHaveBeenCalledWith('org_cal_1', {
      context: { service: 'projects', resource: 'issue', id: 'iss_cal_a' },
      title: 'Issue reminder',
      remindAt: 1788000000,
      offsetMinutesBeforeDue: null,
      channel: 'in-app',
      userId: 'usr_1',
      createdBy: 'usr_1',
    })
    expect(response.body.data.object).toBe('projects.reminder')
    expect(response.body.data.issueId).toBe('iss_cal_a')
    expect(response.body.data.channel).toBe('in-app')
  })

  it('round-trips an offset reminder with a null remindAt', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      {
        milestoneId: 'ms_1',
        offsetMinutesBeforeDue: 60,
        createdBy: 'usr_1',
      }
    )
    expect(response.status).toBe(201)
    expect(workReminders.create).toHaveBeenCalledWith(
      'org_cal_1',
      expect.objectContaining({
        context: { service: 'projects', resource: 'milestone', id: 'ms_1' },
        remindAt: null,
        offsetMinutesBeforeDue: 60,
      })
    )
    expect(response.body.data.remindAt).toBeNull()
    expect(response.body.data.offsetMinutesBeforeDue).toBe(60)
  })

  it('creates a recurring reminder through a Work recurrence rule', async () => {
    workReminders.recurrenceSet.mockResolvedValue({
      data: workRuleRow(),
      error: null,
    })
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      {
        eventId: 'prjev_1',
        remindAt: 1788000000,
        recurrence: { freq: 'daily', interval: 1 },
        createdBy: 'usr_1',
      }
    )
    expect(response.status).toBe(201)
    expect(workReminders.recurrenceSet).toHaveBeenCalledTimes(1)
    expect(workReminders.recurrenceSet).toHaveBeenCalledWith(
      'org_cal_1',
      'prjrem_1',
      { frequency: 'DAILY', interval: 1, timeZone: 'UTC' }
    )
    expect(response.body.data.recurrence).toEqual({
      freq: 'daily',
      interval: 1,
      byWeekday: [],
      until: null,
      count: null,
    })
  })

  it('maps a Work failure to a Projects error value instead of throwing', async () => {
    workReminders.list.mockResolvedValue({
      data: null,
      error: {
        code: 'work/tenant-not-found',
        message: 'This organization has no Work workspace yet.',
      },
    })
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders?createdBy=usr_1'
    )
    expect(response.status).toBe(404)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBe('projects/tenant-not-found')
  })

  it('rejects a reminder without any target', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      { remindAt: 1788000000, createdBy: 'usr_1' }
    )
    expect(response.status).toBe(400)
    expect(workReminders.create).not.toHaveBeenCalled()
  })

  it('rejects a reminder without any timing', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      { issueId: 'iss_cal_a', createdBy: 'usr_1' }
    )
    expect(response.status).toBe(400)
    expect(workReminders.create).not.toHaveBeenCalled()
  })

  it('lets the creator update their reminder', async () => {
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_1',
      { remindAt: 1788100000 }
    )
    expect(response.status).toBe(200)
    expect(workReminders.update).toHaveBeenCalledTimes(1)
    expect(workReminders.update).toHaveBeenCalledWith('org_cal_1', 'prjrem_1', {
      remindAt: 1788100000,
    })
    expect(response.body.data.remindAt).toBe(1788100000)
  })

  it('maps target and active changes onto Work context and status', async () => {
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_1',
      { milestoneId: 'ms_9', active: false }
    )
    expect(response.status).toBe(200)
    expect(workReminders.update).toHaveBeenCalledTimes(1)
    expect(workReminders.update).toHaveBeenCalledWith('org_cal_1', 'prjrem_1', {
      context: { service: 'projects', resource: 'milestone', id: 'ms_9' },
      status: 'CANCELLED',
    })
  })

  it('forbids edits from anyone but the creator', async () => {
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_2',
      { remindAt: 1788100000 }
    )
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('projects/reminder-forbidden')
    expect(workReminders.update).not.toHaveBeenCalled()
  })

  it('returns 404 when updating an unknown reminder', async () => {
    workReminders.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'work/reminder-not-found',
        message: 'Reminder not found.',
      },
    })
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_missing?userId=usr_1',
      { remindAt: 1788100000 }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/reminder-not-found')
    expect(workReminders.update).not.toHaveBeenCalled()
  })

  it('treats a reminder from another service as not found', async () => {
    workReminders.retrieve.mockResolvedValue({
      data: reminderRow({
        context: { service: 'crm', resource: 'request', id: 'req_1' },
      }),
      error: null,
    })
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_1'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/reminder-not-found')
    expect(workReminders.delete).not.toHaveBeenCalled()
  })

  it('lets the creator delete their reminder', async () => {
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_1'
    )
    expect(response.status).toBe(200)
    expect(workReminders.delete).toHaveBeenCalledTimes(1)
    expect(workReminders.delete).toHaveBeenCalledWith(
      'org_cal_1',
      'prjrem_1',
      'usr_1'
    )
    expect(response.body.data).toEqual({
      object: 'projects.reminder',
      id: 'prjrem_1',
      deleted: true,
    })
  })

  it('forbids deletes from anyone but the creator', async () => {
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_2'
    )
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('projects/reminder-forbidden')
    expect(workReminders.delete).not.toHaveBeenCalled()
  })
})

describe('due reminders', () => {
  it('returns Work reminders due at the requested moment', async () => {
    workReminders.list.mockResolvedValue(
      workListEnvelope([
        reminderRow({ id: 'prjrem_due', remindAt: 1788000000 }),
        reminderRow({ id: 'prjrem_future', remindAt: 1789000000 }),
      ])
    )
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(200)
    expect(workReminders.list).toHaveBeenCalledTimes(1)
    expect(workReminders.list).toHaveBeenCalledWith('org_cal_1', {
      status: 'SCHEDULED',
      limit: 100,
    })
    expect(
      response.body.data.data.map((row: { id: string }) => row.id)
    ).toEqual(['prjrem_due'])
  })

  it('marks nothing as sent while computing dues', async () => {
    workReminders.list.mockResolvedValue(
      workListEnvelope([reminderRow({ remindAt: 1787000000 })])
    )
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toHaveLength(1)
    expect(workReminders.update).not.toHaveBeenCalled()
    expect(workReminders.delete).not.toHaveBeenCalled()
    expect(workReminders.create).not.toHaveBeenCalled()
  })

  it('computes offset reminders from their target due date', async () => {
    workReminders.list.mockResolvedValue(
      workListEnvelope([
        reminderRow({
          id: 'prjrem_offset',
          remindAt: null,
          offsetMinutesBeforeDue: 60,
        }),
      ])
    )
    calendarRepo.retrieveIssueDueDate.mockResolvedValue({
      dueDate: 1788000000n,
    })
    const due = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1787996400'
    )
    expect(due.body.data.data.map((row: { id: string }) => row.id)).toEqual([
      'prjrem_offset',
    ])
    expect(calendarRepo.retrieveIssueDueDate).toHaveBeenCalledWith(
      tenant.id,
      'iss_cal_a'
    )
    const early = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1787996399'
    )
    expect(early.body.data.data).toEqual([])
  })

  it('reports a recurring reminder at its latest occurrence before at', async () => {
    workReminders.list.mockResolvedValue(
      workListEnvelope([
        reminderRow({
          id: 'prjrem_daily',
          remindAt: 1788000000,
          recurrenceRuleId: 'rule_1',
        }),
      ])
    )
    workReminders.recurrenceRetrieve.mockResolvedValue({
      data: workRuleRow(),
      error: null,
    })
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/reminders/due?at=${1788000000 + 2 * DAY + 12}`
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toHaveLength(1)
    expect(response.body.data.data[0].dueAt).toBe(1788000000 + 2 * DAY)
    expect(response.body.data.data[0].recurrence).toEqual({
      freq: 'daily',
      interval: 1,
      byWeekday: [],
      until: null,
      count: null,
    })
  })

  it('skips a reminder with neither time nor offset', async () => {
    workReminders.list.mockResolvedValue(
      workListEnvelope([
        reminderRow({
          id: 'prjrem_empty',
          remindAt: null,
          offsetMinutesBeforeDue: null,
        }),
      ])
    )
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
  })

  it('returns an empty list when Work has no reminders', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
  })

  it('maps a Work list failure to a Projects error value', async () => {
    workReminders.list.mockResolvedValue({
      data: null,
      error: { code: 'work/invalid-response', message: 'Bad gateway.' },
    })
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(500)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBe('projects/internal-error')
  })
})

describe('calendar read model', () => {
  function seedMergeWindow() {
    calendarRepo.listCalendarProjects.mockResolvedValue([
      {
        id: 'prj_cal_1',
        name: 'Calendar Project',
        startDate: BigInt(WINDOW_START),
        targetDate: BigInt(WINDOW_START + 5 * DAY),
      },
    ])
    calendarRepo.listCalendarMilestones.mockResolvedValue([
      {
        id: 'ms_1',
        projectId: 'prj_cal_1',
        name: 'Phase one',
        startDate: BigInt(WINDOW_START + DAY),
        targetDate: BigInt(WINDOW_START + 2 * DAY),
      },
    ])
    calendarRepo.listCalendarIssues.mockResolvedValue([
      {
        id: 'iss_cal_a',
        projectId: 'prj_cal_1',
        identifier: 'CAL-1',
        title: 'Dated work item',
        status: 'todo',
        dueDate: BigInt(WINDOW_START + 3 * DAY),
        plannedStartDate: BigInt(WINDOW_START + DAY),
        plannedFinishDate: BigInt(WINDOW_START + 2 * DAY),
      },
    ])
    calendarRepo.listEventLinks.mockResolvedValue([
      eventLink({ eventId: 'prjev_plain' }),
      eventLink({ eventId: 'prjev_meet', kind: 'meeting' }),
      eventLink({ eventId: 'prjev_daily' }),
    ])
    workEvents.list.mockResolvedValue(workListEnvelope([
      workEvent({ id: 'prjev_plain', title: 'Plain event', startAt: WINDOW_START + 4 * DAY, endAt: WINDOW_START + 4 * DAY + 3600 }),
      workEvent({ id: 'prjev_meet', title: 'Team sync', startAt: WINDOW_START + DAY, endAt: WINDOW_START + DAY + 1800 }),
      workEvent({ id: 'prjev_daily', title: 'Daily standup', startAt: WINDOW_START, endAt: WINDOW_START + 900 }),
    ]))
    workEvents.recurrenceRetrieve.mockImplementation(async (_org: string, id: string) => ({
      data: id === 'prjev_daily' ? workRuleRow() : null,
      error: null,
    }))
  }

  it('merges projects, phases, work items, events and meetings', async () => {
    seedMergeWindow()
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + 5 * DAY}`
    )
    expect(response.status).toBe(200)
    const entries = response.body.data.entries as Array<{
      kind: string
      id: string
      issueIdentifier?: string
    }>
    const kinds = new Set(entries.map((entry) => entry.kind))
    expect(kinds).toEqual(
      new Set(['project', 'phase', 'work-item', 'event', 'meeting'])
    )
    const workItems = entries.filter((entry) => entry.kind === 'work-item')
    expect(workItems).toHaveLength(2)
    for (const item of workItems) {
      expect(item.issueIdentifier).toBe('CAL-1')
    }
  })

  it('emits one entry for an event without recurrence', async () => {
    seedMergeWindow()
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + 5 * DAY}`
    )
    const entries = response.body.data.entries as Array<{ id: string }>
    expect(entries.filter((entry) => entry.id === 'prjev_plain')).toHaveLength(
      1
    )
  })

  it('expands recurring occurrences with href-safe ids inside the window', async () => {
    seedMergeWindow()
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + 2 * DAY}`
    )
    const entries = response.body.data.entries as Array<{ id: string }>
    const standups = entries.filter((entry) =>
      entry.id.startsWith('prjev_daily-')
    )
    expect(standups).toHaveLength(3)
    for (const entry of standups) {
      expect(entry.id).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('sorts entries by occurrence start', async () => {
    seedMergeWindow()
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + 5 * DAY}`
    )
    const starts = (
      response.body.data.entries as Array<{ occurrenceStart: number }>
    ).map((entry) => entry.occurrenceStart)
    const sorted = [...starts].sort((a, b) => a - b)
    expect(starts).toEqual(sorted)
  })

  it('filters entries by kind', async () => {
    seedMergeWindow()
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + 5 * DAY}&kinds=event`
    )
    expect(response.status).toBe(200)
    const entries = response.body.data.entries as Array<{ kind: string }>
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.kind).toBe('event')
    }
  })

  it('rejects unknown calendar kinds', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + DAY}&kinds=birthday`
    )
    expect(response.status).toBe(400)
  })

  it('rejects an inverted window', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START + DAY}&to=${WINDOW_START}`
    )
    expect(response.status).toBe(400)
  })

  it('returns 404 for an unknown calendar project', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/calendar?from=${WINDOW_START}&to=${WINDOW_START + DAY}&projectId=prj_missing`
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/project-not-found')
  })
})

describe('my work', () => {
  function issueSummary(overrides: Record<string, unknown> = {}) {
    return {
      id: 'iss_cal_a',
      projectId: 'prj_cal_1',
      identifier: 'CAL-1',
      title: 'My work item',
      status: 'in-progress',
      dueDate: null,
      plannedStartDate: null,
      plannedFinishDate: null,
      ...overrides,
    }
  }

  function seedMyWork() {
    calendarRepo.listAssignedIssues.mockResolvedValue([
      issueSummary(),
      issueSummary({ id: 'iss_cal_b', identifier: 'CAL-2', status: 'done' }),
      issueSummary({
        id: 'iss_cal_c',
        identifier: 'CAL-3',
        status: 'canceled',
      }),
    ])
    calendarRepo.listEventLinks.mockResolvedValue([
      eventLink({ eventId: 'prjev_future' }),
      eventLink({ eventId: 'prjev_past' }),
    ])
    workEvents.list.mockResolvedValue(workListEnvelope([
      workEvent({ id: 'prjev_future', startAt: 2000000000, endAt: 2000003600, participants: [{ ...attendeeRow(), object: 'event_participant', kind: 'USER', participantId: 'usr_1', email: null, name: null, role: 'REQUIRED', status: 'ACCEPTED', delegatedTo: null, delegatedFrom: null, respondedAt: null }] }),
      workEvent({ id: 'prjev_past', startAt: 1000000000, endAt: 1000003600, participants: [{ ...attendeeRow(), id: 'prjeva_2', object: 'event_participant', kind: 'USER', participantId: 'usr_1', email: null, name: null, role: 'REQUIRED', status: 'ACCEPTED', delegatedTo: null, delegatedFrom: null, respondedAt: null }] }),
    ]))
    workReminders.list.mockResolvedValue(
      workListEnvelope([
        reminderRow({ id: 'prjrem_mine', remindAt: 1000000000 }),
        reminderRow({
          id: 'prjrem_theirs',
          createdBy: 'usr_other',
          userId: 'usr_other',
          remindAt: 1000000000,
        }),
        reminderRow({ id: 'prjrem_later', remindAt: 4000000000 }),
      ])
    )
  }

  it('returns assigned issues, upcoming events and due reminders', async () => {
    seedMyWork()
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/my-work?userId=usr_1'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('my-work')
    expect(response.body.data.userId).toBe('usr_1')
    expect(
      response.body.data.assignedIssues.map(
        (issue: { identifier: string }) => issue.identifier
      )
    ).toEqual(['CAL-1'])
    expect(
      response.body.data.upcomingEvents.map((event: { id: string }) => event.id)
    ).toEqual(['prjev_future'])
    expect(
      response.body.data.dueReminders.map(
        (reminder: { id: string }) => reminder.id
      )
    ).toEqual(['prjrem_mine'])
  })

  it('excludes closed work items even when the store leaks them', async () => {
    seedMyWork()
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/my-work?userId=usr_1'
    )
    const statuses = response.body.data.assignedIssues.map(
      (issue: { status: string }) => issue.status
    )
    expect(statuses).not.toContain('done')
    expect(statuses).not.toContain('canceled')
  })

  it('excludes other users reminders and past events', async () => {
    seedMyWork()
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/my-work?userId=usr_1'
    )
    const reminderIds = response.body.data.dueReminders.map(
      (reminder: { id: string }) => reminder.id
    )
    expect(reminderIds).not.toContain('prjrem_theirs')
    expect(reminderIds).not.toContain('prjrem_later')
    const eventIds = response.body.data.upcomingEvents.map(
      (event: { id: string }) => event.id
    )
    expect(eventIds).not.toContain('prjev_past')
  })

  it('requires the user scope', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/my-work'
    )
    expect(response.status).toBe(400)
  })
})
