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
    createdAt: 1787900000n,
    updatedAt: 1787900000n,
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
    createdAt: 1787900000n,
    updatedAt: 1787900000n,
    ...overrides,
  }
}

function reminderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prjrem_1',
    tenantId: tenant.id,
    issueId: 'iss_cal_a',
    milestoneId: null,
    eventId: null,
    remindAt: 1788000000n,
    offsetMinutesBeforeDue: null,
    recurrenceFreq: null,
    recurrenceInterval: null,
    recurrenceByWeekday: null,
    recurrenceUntil: null,
    recurrenceCount: null,
    channel: 'in-app',
    createdBy: 'usr_1',
    active: true,
    createdAt: 1787900000n,
    updatedAt: 1787900000n,
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
  projectCustomFieldsRepo.listProjectCustomFieldValuesForProjects.mockResolvedValue([])
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  projectsRepo.retrieve.mockResolvedValue(project)
  projectsRepo.retrieveByKey.mockResolvedValue(null)
  calendarRepo.listEvents.mockResolvedValue([])
  calendarRepo.retrieveEvent.mockResolvedValue(null)
  calendarRepo.listAttendeesForEvents.mockResolvedValue([])
  calendarRepo.retrieveAttendee.mockResolvedValue(null)
  calendarRepo.listAttendeesByUser.mockResolvedValue([])
  calendarRepo.listRemindersByCreator.mockResolvedValue([])
  calendarRepo.listActiveReminders.mockResolvedValue([])
  calendarRepo.retrieveReminder.mockResolvedValue(null)
  calendarRepo.listCalendarProjects.mockResolvedValue([])
  calendarRepo.listCalendarMilestones.mockResolvedValue([])
  calendarRepo.listCalendarIssues.mockResolvedValue([])
  calendarRepo.listAssignedIssues.mockResolvedValue([])
})

describe('calendar events', () => {
  it('lists events with their attendees attached', async () => {
    calendarRepo.listEvents.mockResolvedValue([eventRow()])
    calendarRepo.listAttendeesForEvents.mockResolvedValue([attendeeRow()])
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
    calendarRepo.listEvents.mockResolvedValue([])
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/events?projectId=prj_cal_1'
    )
    expect(response.status).toBe(200)
    expect(calendarRepo.listEvents).toHaveBeenCalledWith(
      tenant.id,
      'prj_cal_1'
    )
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    calendarRepo.updateEvent.mockResolvedValue(
      eventRow({ title: 'Renamed planning' })
    )
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
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
    expect(calendarRepo.deleteEvent).toHaveBeenCalledWith(
      tenant.id,
      'prjev_1'
    )
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    calendarRepo.createAttendee.mockImplementation(async (params: unknown) => ({
      ...(params as Record<string, unknown>),
    }))
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    calendarRepo.retrieveAttendee.mockResolvedValue(attendeeRow())
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    calendarRepo.retrieveAttendee.mockResolvedValue(attendeeRow())
    calendarRepo.updateAttendee.mockResolvedValue(
      attendeeRow({ response: 'accepted' })
    )
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_2',
      { response: 'accepted' }
    )
    expect(response.status).toBe(200)
    expect(response.body.data.response).toBe('accepted')
  })

  it('returns 404 when the attendee row is missing', async () => {
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_ghost',
      { response: 'accepted' }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/attendee-not-found')
  })

  it('removes an attendee with a tombstone', async () => {
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    calendarRepo.retrieveAttendee.mockResolvedValue(attendeeRow())
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
    calendarRepo.retrieveEvent.mockResolvedValue(eventRow())
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/events/prjev_1/attendees/usr_ghost'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/attendee-not-found')
  })
})

describe('reminders', () => {
  it('lists reminders scoped to their creator', async () => {
    calendarRepo.listRemindersByCreator.mockResolvedValue([reminderRow()])
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders?createdBy=usr_1'
    )
    expect(response.status).toBe(200)
    expect(calendarRepo.listRemindersByCreator).toHaveBeenCalledWith(
      tenant.id,
      'usr_1'
    )
    expect(response.body.data.data).toHaveLength(1)
  })

  it('keeps another creator rows out of the list', async () => {
    calendarRepo.listRemindersByCreator.mockResolvedValue([])
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders?createdBy=usr_2'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
    expect(calendarRepo.listRemindersByCreator).toHaveBeenCalledWith(
      tenant.id,
      'usr_2'
    )
  })

  it('requires the creator scope when listing reminders', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders'
    )
    expect(response.status).toBe(400)
  })

  it('creates a reminder for its creator', async () => {
    calendarRepo.createReminder.mockImplementation(async (params: unknown) => ({
      ...(params as Record<string, unknown>),
    }))
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      { issueId: 'iss_cal_a', remindAt: 1788000000, createdBy: 'usr_1' }
    )
    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('projects.reminder')
    expect(response.body.data.channel).toBe('in-app')
  })

  it('rejects a reminder without any target', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      { remindAt: 1788000000, createdBy: 'usr_1' }
    )
    expect(response.status).toBe(400)
  })

  it('rejects a reminder without any timing', async () => {
    const response = await requestJson(
      'POST',
      '/v1/organizations/org_cal_1/reminders',
      { issueId: 'iss_cal_a', createdBy: 'usr_1' }
    )
    expect(response.status).toBe(400)
  })

  it('lets the creator update their reminder', async () => {
    calendarRepo.retrieveReminder.mockResolvedValue(reminderRow())
    calendarRepo.updateReminder.mockResolvedValue(
      reminderRow({ remindAt: 1788100000n })
    )
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_1',
      { remindAt: 1788100000 }
    )
    expect(response.status).toBe(200)
    expect(response.body.data.remindAt).toBe(1788100000)
  })

  it('forbids edits from anyone but the creator', async () => {
    calendarRepo.retrieveReminder.mockResolvedValue(reminderRow())
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_2',
      { remindAt: 1788100000 }
    )
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('projects/reminder-forbidden')
    expect(calendarRepo.updateReminder).not.toHaveBeenCalled()
  })

  it('returns 404 when updating an unknown reminder', async () => {
    const response = await requestJson(
      'PATCH',
      '/v1/organizations/org_cal_1/reminders/prjrem_missing?userId=usr_1',
      { remindAt: 1788100000 }
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/reminder-not-found')
  })

  it('lets the creator delete their reminder', async () => {
    calendarRepo.retrieveReminder.mockResolvedValue(reminderRow())
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_1'
    )
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'projects.reminder',
      id: 'prjrem_1',
      deleted: true,
    })
  })

  it('forbids deletes from anyone but the creator', async () => {
    calendarRepo.retrieveReminder.mockResolvedValue(reminderRow())
    const response = await requestJson(
      'DELETE',
      '/v1/organizations/org_cal_1/reminders/prjrem_1?userId=usr_2'
    )
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('projects/reminder-forbidden')
    expect(calendarRepo.deleteReminder).not.toHaveBeenCalled()
  })
})

describe('due reminders', () => {
  it('returns active reminders due at the requested moment', async () => {
    // The repository only yields active rows, so inactive reminders can
    // never surface: the service reads dues from listActiveReminders alone.
    calendarRepo.listActiveReminders.mockResolvedValue([
      reminderRow({ id: 'prjrem_due', remindAt: 1788000000n }),
      reminderRow({ id: 'prjrem_future', remindAt: 1789000000n }),
    ])
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data.map((row: { id: string }) => row.id)).toEqual([
      'prjrem_due',
    ])
  })

  it('marks nothing as sent while computing dues', async () => {
    calendarRepo.listActiveReminders.mockResolvedValue([
      reminderRow({ remindAt: 1787000000n }),
    ])
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1788000000'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toHaveLength(1)
    expect(calendarRepo.updateReminder).not.toHaveBeenCalled()
    expect(calendarRepo.deleteReminder).not.toHaveBeenCalled()
    expect(calendarRepo.createReminder).not.toHaveBeenCalled()
  })

  it('computes offset reminders from their target due date', async () => {
    calendarRepo.listActiveReminders.mockResolvedValue([
      reminderRow({
        id: 'prjrem_offset',
        remindAt: null,
        offsetMinutesBeforeDue: 60,
      }),
    ])
    calendarRepo.retrieveIssueDueDate.mockResolvedValue({
      dueDate: 1788000000n,
    })
    const due = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1787996400'
    )
    expect(
      due.body.data.data.map((row: { id: string }) => row.id)
    ).toEqual(['prjrem_offset'])
    const early = await requestJson(
      'GET',
      '/v1/organizations/org_cal_1/reminders/due?at=1787996399'
    )
    expect(early.body.data.data).toEqual([])
  })

  it('reports a recurring reminder at its latest occurrence before at', async () => {
    calendarRepo.listActiveReminders.mockResolvedValue([
      reminderRow({
        id: 'prjrem_daily',
        remindAt: 1788000000n,
        recurrenceFreq: 'daily',
        recurrenceInterval: 1,
      }),
    ])
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_cal_1/reminders/due?at=${1788000000 + 2 * DAY + 12}`
    )
    expect(response.status).toBe(200)
    expect(response.body.data.data).toHaveLength(1)
    expect(response.body.data.data[0].dueAt).toBe(1788000000 + 2 * DAY)
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
    calendarRepo.listEvents.mockResolvedValue([
      eventRow({
        id: 'prjev_plain',
        title: 'Plain event',
        startsAt: BigInt(WINDOW_START + 4 * DAY),
        endsAt: BigInt(WINDOW_START + 4 * DAY + 3600),
      }),
      eventRow({
        id: 'prjev_meet',
        kind: 'meeting',
        title: 'Team sync',
        startsAt: BigInt(WINDOW_START + DAY),
        endsAt: BigInt(WINDOW_START + DAY + 1800),
      }),
      eventRow({
        id: 'prjev_daily',
        title: 'Daily standup',
        startsAt: BigInt(WINDOW_START),
        endsAt: BigInt(WINDOW_START + 900),
        recurrenceFreq: 'daily',
        recurrenceInterval: 1,
      }),
    ])
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
    expect(
      entries.filter((entry) => entry.id === 'prjev_plain')
    ).toHaveLength(1)
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
    calendarRepo.listAttendeesByUser.mockResolvedValue([
      attendeeRow({ eventId: 'prjev_future' }),
      attendeeRow({ id: 'prjeva_2', eventId: 'prjev_past' }),
    ])
    calendarRepo.retrieveEvent.mockImplementation(async (tenantId: string, eventId: string) => {
      void tenantId
      if (eventId === 'prjev_future') {
        return eventRow({
          id: 'prjev_future',
          startsAt: 2000000000n,
          endsAt: 2000003600n,
        })
      }
      return eventRow({
        id: 'prjev_past',
        startsAt: 1000000000n,
        endsAt: 1000003600n,
      })
    })
    calendarRepo.listActiveReminders.mockResolvedValue([
      reminderRow({ id: 'prjrem_mine', remindAt: 1000000000n }),
      reminderRow({
        id: 'prjrem_theirs',
        createdBy: 'usr_other',
        remindAt: 1000000000n,
      }),
      reminderRow({ id: 'prjrem_later', remindAt: 4000000000n }),
    ])
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
      response.body.data.upcomingEvents.map(
        (event: { id: string }) => event.id
      )
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
