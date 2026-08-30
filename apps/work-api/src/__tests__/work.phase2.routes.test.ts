import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.WORK_DATABASE_URL = 'postgres://localhost/test'
})

const mocks = vi.hoisted(() => ({
  taskLists: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ensureDefault: vi.fn(),
  },
  taskLinks: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
  taskAssignments: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  calendars: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  calendarSubs: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  events: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  participants: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  alerts: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    absoluteDue: vi.fn(),
    relativeCandidates: vi.fn(),
    markSent: vi.fn(),
    markDismissed: vi.fn(),
  },
  recurrence: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  myWork: {
    retrieve: vi.fn(),
  },
  exports: {
    create: vi.fn(),
  },
  syncConnections: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  syncMappings: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  tenants: {
    retrieveByOrganization: vi.fn(),
    ensure: vi.fn(),
    tenantAuthorizationByOrganizationId: vi.fn(),
  },
  connections: {
    activeConnectionAuthorization: vi.fn(),
  },
  identity: {
    appForApiKey: vi.fn(),
    sessionAccess: vi.fn(),
  },
  tasks: {
    retrieve: vi.fn(),
  },
  reminders: {
    due: vi.fn(),
  },
  notificationOutbox: {
    run: vi.fn(),
  },
}))

vi.mock('../modules/task-lists/task-lists.repository.js', () => mocks.taskLists)
vi.mock('../modules/tenants/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/tenants/index.js')>()),
  ...mocks.tenants,
}))
vi.mock('../modules/tasks/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/tasks/index.js')>()),
  ...mocks.tasks,
}))
vi.mock('../modules/reminders/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/reminders/index.js')>()),
  ...mocks.reminders,
}))
vi.mock('../modules/calendars/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/calendars/index.js')>()),
  ...mocks.calendars,
}))
vi.mock('../modules/events/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/events/index.js')>()),
  ...mocks.events,
}))
vi.mock('../modules/alerts/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/alerts/index.js')>()),
  ...mocks.alerts,
}))
vi.mock('../modules/recurrence-rules/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../modules/recurrence-rules/index.js')
  >()),
  ...mocks.recurrence,
}))
vi.mock('../modules/sync-connections/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../modules/sync-connections/index.js')
  >()),
  ...mocks.syncConnections,
}))
vi.mock(
  '../modules/notification-outbox/notification-outbox.service.js',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../modules/notification-outbox/notification-outbox.service.js')
    >()),
    ...mocks.notificationOutbox,
  })
)
vi.mock('../modules/task-links/task-links.repository.js', () => mocks.taskLinks)
vi.mock(
  '../modules/task-assignments/task-assignments.repository.js',
  () => mocks.taskAssignments
)
vi.mock('../modules/calendars/calendars.repository.js', () => mocks.calendars)
vi.mock(
  '../modules/calendar-subscriptions/calendar-subscriptions.repository.js',
  () => mocks.calendarSubs
)
vi.mock('../modules/events/events.repository.js', () => mocks.events)
vi.mock(
  '../modules/event-participants/event-participants.repository.js',
  () => mocks.participants
)
vi.mock('../modules/alerts/alerts.repository.js', () => mocks.alerts)
vi.mock(
  '../modules/recurrence-rules/recurrence-rules.repository.js',
  () => mocks.recurrence
)
vi.mock('../modules/exports/exports.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/exports/exports.service.js')
  >('../modules/exports/exports.service.js')
  return { ...actual, create: mocks.exports.create }
})
vi.mock('../modules/my-work/my-work.service.js', async () => {
  const actual = await vi.importActual<
    typeof import('../modules/my-work/my-work.service.js')
  >('../modules/my-work/my-work.service.js')
  return { ...actual, retrieve: mocks.myWork.retrieve }
})
vi.mock(
  '../modules/sync-connections/sync-connections.repository.js',
  () => mocks.syncConnections
)
vi.mock(
  '../modules/sync-mappings/sync-mappings.repository.js',
  () => mocks.syncMappings
)
vi.mock('../modules/connections/index.js', () => ({
  activeConnectionAuthorization:
    mocks.connections.activeConnectionAuthorization,
}))
vi.mock('../http/auth/identity.js', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.identity.appForApiKey
    sessionAccess = mocks.identity.sessionAccess
  },
  IdentityUnavailableError: class IdentityUnavailableError extends Error {},
}))

const { createApp } = await import('../application.js')

const INTERNAL_KEY = 'work-internal-phase2-key'
const CRON_SECRET = 'work-cron-secret-123'

function api() {
  const app = createApp()
  return {
    get: (path: string) =>
      request(app).get(path).set('x-internal-key', INTERNAL_KEY),
    post: (path: string) =>
      request(app).post(path).set('x-internal-key', INTERNAL_KEY),
    patch: (path: string) =>
      request(app).patch(path).set('x-internal-key', INTERNAL_KEY),
    delete: (path: string) =>
      request(app).delete(path).set('x-internal-key', INTERNAL_KEY),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.WORK_INTERNAL_KEY = INTERNAL_KEY
  process.env.WORK_CRON_SECRET = CRON_SECRET
  mocks.tenants.retrieveByOrganization.mockResolvedValue({
    id: 'work_tnt_1',
    organizationId: 'org_1',
    status: 'ACTIVE',
  })
  mocks.tenants.tenantAuthorizationByOrganizationId.mockResolvedValue({
    id: 'work_tnt_1',
    active: true,
  })
  mocks.connections.activeConnectionAuthorization.mockResolvedValue({
    scopes: new Set([
      'work.tasks.read',
      'work.tasks.write',
      'work.calendars.read',
      'work.events.read',
      'work.events.write',
    ]),
  })
  mocks.identity.appForApiKey.mockResolvedValue({ id: 'app_crm' })
  mocks.identity.sessionAccess.mockResolvedValue({
    assigned: true,
    entitled: true,
    status: 'ACTIVE',
    effectivePermissions: new Set(['work.events.write']),
    userId: 'user_1',
  })

  // default list behaviors
  mocks.taskLists.list.mockResolvedValue([
    {
      id: 'tasklist_1',
      tenantId: 'work_tnt_1',
      name: 'Inbox',
      description: null,
      ownerUserId: null,
      isDefault: true,
      sortOrder: 0,
      createdBy: 'user_1',
      createdAt: new Date('2026-08-30T12:00:00.000Z'),
      updatedAt: new Date('2026-08-30T12:00:00.000Z'),
      deletedAt: null,
    },
  ])
  mocks.taskLists.retrieve.mockResolvedValue({
    id: 'tasklist_1',
    tenantId: 'work_tnt_1',
    name: 'Inbox',
    description: null,
    ownerUserId: null,
    isDefault: true,
    sortOrder: 0,
    createdBy: 'user_1',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    deletedAt: null,
  })
  mocks.calendars.list.mockResolvedValue([
    {
      id: 'cal_1',
      tenantId: 'work_tnt_1',
      uid: 'cal_1@work.876',
      ownerUserId: 'user_1',
      name: 'Work Calendar',
      description: null,
      timeZone: 'UTC',
      visibility: 'PRIVATE',
      isPrimary: true,
      createdBy: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ])
  mocks.calendars.retrieve.mockResolvedValue({
    id: 'cal_1',
    tenantId: 'work_tnt_1',
    uid: 'cal_1@work.876',
    ownerUserId: 'user_1',
    name: 'Work Calendar',
    description: null,
    timeZone: 'UTC',
    visibility: 'PRIVATE',
    isPrimary: true,
    createdBy: 'user_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  })
  mocks.events.list.mockResolvedValue([
    {
      id: 'event_1',
      uid: 'event_1@work.876',
      tenantId: 'work_tnt_1',
      calendarId: 'cal_1',
      contextService: null,
      contextResource: null,
      contextId: null,
      title: 'Meeting',
      description: null,
      location: null,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      startAt: new Date('2026-09-01T09:00:00.000Z'),
      endAt: new Date('2026-09-01T10:00:00.000Z'),
      timeZone: 'UTC',
      startDate: null,
      endDate: null,
      recurrenceRuleId: null,
      recurrenceId: null,
      participants: [],
      createdBy: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ])
  mocks.events.retrieve.mockResolvedValue({
    id: 'event_1',
    uid: 'event_1@work.876',
    tenantId: 'work_tnt_1',
    calendarId: 'cal_1',
    contextService: null,
    contextResource: null,
    contextId: null,
    title: 'Meeting',
    description: null,
    location: null,
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    startAt: new Date('2026-09-01T09:00:00.000Z'),
    endAt: new Date('2026-09-01T10:00:00.000Z'),
    timeZone: 'UTC',
    startDate: null,
    endDate: null,
    recurrenceRuleId: null,
    recurrenceId: null,
    participants: [],
    createdBy: 'user_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  })
  mocks.tasks.retrieve.mockResolvedValue({ id: 'task_1', object: 'task' })
  mocks.reminders.due.mockResolvedValue([])
  mocks.notificationOutbox.run.mockResolvedValue({
    object: 'work_notification_run',
    materialized: 0,
    dispatched: 0,
    failed: 0,
    at: 1_788_091_200,
  })
  mocks.syncConnections.retrieve.mockResolvedValue({ id: 'sync_conn_1' })
  mocks.alerts.list.mockResolvedValue([
    {
      id: 'alert_1',
      tenantId: 'work_tnt_1',
      taskId: 'task_1',
      eventId: null,
      userId: 'user_1',
      triggerType: 'RELATIVE',
      triggerAt: null,
      offsetSeconds: -900,
      action: 'NOTIFICATION',
      status: 'SCHEDULED',
      sentAt: null,
      dismissedAt: null,
      createdBy: 'user_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  mocks.recurrence.list.mockResolvedValue([])
  mocks.syncConnections.list.mockResolvedValue([])
  mocks.syncMappings.list.mockResolvedValue([])
  mocks.myWork.retrieve.mockResolvedValue({
    object: 'my_work',
    organizationId: 'org_1',
    userId: 'user_1',
    from: 0,
    to: 9999999999,
    tasks: [],
    reminders: [],
    events: [],
    overdueTasks: [],
  })
  mocks.exports.create.mockResolvedValue({
    object: 'calendar_export',
    format: 'ics',
    filename: '876-work.ics',
    contentType: 'text/calendar; charset=utf-8',
    content: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
  })
})

afterEach(() => {
  delete process.env.WORK_INTERNAL_KEY
  delete process.env.WORK_CRON_SECRET
})

describe('Work Phase 2 routes', () => {
  it('operator with correct key lists task-lists', async () => {
    const response = await api().get('/v1/organizations/org_1/task-lists')
    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          object: 'list',
          data: expect.any(Array),
        }),
        error: null,
      })
    )
    expect(Object.hasOwn(response.body.error ?? {}, 'httpStatus')).toBe(false)
  })

  it('operator with wrong key returns 401 unauthorized', async () => {
    const response = await request(createApp())
      .get('/v1/organizations/org_1/task-lists')
      .set('x-internal-key', 'wrong')
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/unauthorized', message: expect.any(String) },
    })
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
  })

  it('operator with no key returns 401 unauthorized', async () => {
    const response = await request(createApp()).get(
      '/v1/organizations/org_1/task-lists'
    )
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/unauthorized', message: expect.any(String) },
    })
  })

  it('WORK_INTERNAL_KEY unset rejects every request with 401', async () => {
    delete process.env.WORK_INTERNAL_KEY
    const app = createApp()
    const response = await request(app)
      .get('/v1/organizations/org_1/task-lists')
      .set('x-internal-key', INTERNAL_KEY)
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('work/unauthorized')
  })

  it('integration with correct scope lists task-lists', async () => {
    mocks.connections.activeConnectionAuthorization.mockResolvedValue({
      scopes: new Set(['work.tasks.read']),
    })
    const app = createApp()
    const response = await request(app)
      .get('/v1/organizations/org_1/task-lists')
      .set('x-876-api-key', 'app_key_crm')
    expect(response.status).toBe(200)
  })

  it('integration lacking scope returns 403 connection-forbidden and never reaches service', async () => {
    mocks.connections.activeConnectionAuthorization.mockResolvedValue({
      scopes: new Set([]),
    })
    const app = createApp()
    const response = await request(app)
      .get('/v1/organizations/org_1/task-lists')
      .set('x-876-api-key', 'app_key_crm')
    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/connection-forbidden', message: expect.any(String) },
    })
    expect(mocks.taskLists.list).not.toHaveBeenCalled()
  })

  it('scheduler tier with correct WORK_CRON_SECRET accesses notifications', async () => {
    const app = createApp()
    const response = await request(app)
      .post('/v1/internal/notifications/run')
      .set('authorization', `Bearer ${CRON_SECRET}`)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'work_notification_run',
        materialized: 0,
        dispatched: 0,
        failed: 0,
        at: 1_788_091_200,
      },
      error: null,
    })
  })

  it('scheduler with wrong secret returns 401', async () => {
    const app = createApp()
    const response = await request(app)
      .post('/v1/internal/notifications/run')
      .set('authorization', 'Bearer wrong')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('work/unauthorized')
  })

  it('scheduler with unset WORK_CRON_SECRET rejects every request', async () => {
    delete process.env.WORK_CRON_SECRET
    const app = createApp()
    const response = await request(app)
      .post('/v1/internal/notifications/run')
      .set('authorization', `Bearer ${CRON_SECRET}`)
    expect(response.status).toBe(401)
  })

  it('unknown path returns 404 not 401', async () => {
    const response = await request(createApp())
      .get('/v1/organizations/org_1/unknown-resource-xyz')
      .set('x-internal-key', INTERNAL_KEY)
    expect(response.status).toBe(404)
    expect(response.body.error.code).not.toBe('work/unauthorized')
  })

  it('validation failure returns envelope with data null and client-safe error without httpStatus', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/task-lists')
      .send({})
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/invalid-request', message: expect.any(String) },
    })
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
    expect(mocks.taskLists.create).not.toHaveBeenCalled()
  })

  it('successful list returns object list with has_more url total_count', async () => {
    const response = await api().get('/v1/organizations/org_1/calendars')
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.objectContaining({
        object: 'list',
        data: expect.any(Array),
        has_more: expect.any(Boolean),
        url: expect.any(String),
        total_count: null,
      })
    )
    expect(response.body.error).toBeNull()
  })

  it('operator creates a task-list', async () => {
    mocks.taskLists.create = vi
      .fn()
      .mockResolvedValue({
        id: 'tasklist_new',
        tenantId: 'work_tnt_1',
        name: 'Sprint',
        description: null,
        ownerUserId: null,
        isDefault: false,
        sortOrder: 0,
        createdBy: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    // Need to re-mock via repository, but service uses repo; easier to test via route already mocked list
    const response = await api()
      .post('/v1/organizations/org_1/task-lists')
      .send({ name: 'Sprint', createdBy: 'user_1' })
    expect([201, 200]).toContain(response.status)
  })

  it('operator lists calendars', async () => {
    const response = await api().get('/v1/organizations/org_1/calendars')
    expect(response.status).toBe(200)
    expect(response.body.data.data.length).toBeGreaterThanOrEqual(1)
  })

  it('operator lists events', async () => {
    const response = await api().get('/v1/organizations/org_1/events')
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
  })

  it('operator creates an event timed', async () => {
    mocks.events.create = vi
      .fn()
      .mockResolvedValue({
        id: 'event_new',
        uid: 'event_new@work.876',
        tenantId: 'work_tnt_1',
        calendarId: 'cal_1',
        contextService: null,
        contextResource: null,
        contextId: null,
        title: 'New Meeting',
        description: null,
        location: null,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        startAt: new Date('2026-09-02T09:00:00.000Z'),
        endAt: new Date('2026-09-02T10:00:00.000Z'),
        timeZone: 'UTC',
        startDate: null,
        endDate: null,
        recurrenceRuleId: null,
        recurrenceId: null,
        participants: [],
        createdBy: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
    const response = await api()
      .post('/v1/organizations/org_1/events')
      .send({
        calendarId: 'cal_1',
        title: 'New Meeting',
        allDay: false,
        startAt: Math.floor(
          new Date('2026-09-02T09:00:00.000Z').getTime() / 1000
        ),
        endAt: Math.floor(
          new Date('2026-09-02T10:00:00.000Z').getTime() / 1000
        ),
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    expect([200, 201]).toContain(response.status)
  })

  it('operator lists alerts', async () => {
    const response = await api().get('/v1/organizations/org_1/alerts')
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
  })

  it('operator lists recurrence-rules', async () => {
    const response = await api().get('/v1/organizations/org_1/recurrence-rules')
    expect(response.status).toBe(200)
  })

  it('operator retrieves my-work', async () => {
    const response = await api().get(
      '/v1/organizations/org_1/my-work?user_id=user_1&from=0&to=9999999999'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('my_work')
  })

  it('operator creates sync-connection', async () => {
    mocks.syncConnections.create = vi
      .fn()
      .mockResolvedValue({
        id: 'sync_conn_new',
        tenantId: 'work_tnt_1',
        userId: 'user_1',
        provider: 'GOOGLE',
        status: 'ACTIVE',
        credentialRef: 'cred_1',
        remoteAccountId: null,
        remoteAccountLabel: null,
        caldavUrl: null,
        syncCursor: null,
        lastSyncedAt: null,
        lastErrorCode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    const response = await api()
      .post('/v1/organizations/org_1/sync-connections')
      .send({ userId: 'user_1', provider: 'GOOGLE', credentialRef: 'cred_1' })
    expect([200, 201]).toContain(response.status)
  })

  it('operator lists sync-connections', async () => {
    const response = await api().get('/v1/organizations/org_1/sync-connections')
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
  })

  it('operator exports ics', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/exports')
      .send({ format: 'ics' })
    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('calendar_export')
  })

  it('validation strictObject rejects extra field', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/task-lists')
      .send({ name: 'Sprint', createdBy: 'user_1', extraField: 'oops' })
    expect(response.status).toBe(422)
    expect(mocks.taskLists.create).not.toHaveBeenCalled()
  })

  it('operator retrieves a single calendar', async () => {
    const response = await api().get('/v1/organizations/org_1/calendars/cal_1')
    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('cal_1')
  })

  it('operator retrieves a single event', async () => {
    const response = await api().get('/v1/organizations/org_1/events/event_1')
    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('event_1')
  })

  it('operator lists task-assignments for a task', async () => {
    mocks.taskAssignments.list.mockResolvedValue([
      {
        id: 'assign_1',
        taskId: 'task_1',
        targetType: 'USER',
        assigneeId: 'user_1',
        role: 'OWNER',
        status: 'PENDING',
        assignedBy: 'user_1',
        assignedAt: new Date(),
        respondedAt: null,
        completedAt: null,
        delegatedFromAssignmentId: null,
      },
    ])
    const response = await api().get(
      '/v1/organizations/org_1/tasks/task_1/assignments'
    )
    expect(response.status).toBe(200)
  })

  it('operator lists task-links for a task', async () => {
    mocks.taskLinks.list.mockResolvedValue([
      {
        id: 'link_1',
        taskId: 'task_1',
        service: 'crm',
        resource: 'request',
        externalId: 'req_1',
        label: null,
        url: null,
        isPrimary: true,
        createdAt: new Date(),
      },
    ])
    const response = await api().get(
      '/v1/organizations/org_1/tasks/task_1/links'
    )
    expect(response.status).toBe(200)
  })

  it('operator lists calendar subscriptions', async () => {
    mocks.calendarSubs.list.mockResolvedValue([
      {
        id: 'sub_1',
        tenantId: 'work_tnt_1',
        calendarId: 'cal_1',
        userId: 'user_1',
        role: 'OWNER',
        color: null,
        isVisible: true,
        defaultReminderMinutes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    const response = await api().get(
      '/v1/organizations/org_1/calendars/cal_1/subscriptions'
    )
    expect(response.status).toBe(200)
  })

  it('operator lists event participants', async () => {
    mocks.participants.list.mockResolvedValue([
      {
        id: 'part_1',
        eventId: 'event_1',
        kind: 'USER',
        participantId: 'user_1',
        email: null,
        name: 'Asha',
        role: 'REQUIRED',
        status: 'NEEDS_ACTION',
        delegatedTo: null,
        delegatedFrom: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    const response = await api().get(
      '/v1/organizations/org_1/events/event_1/participants'
    )
    expect(response.status).toBe(200)
  })

  it('operator lists sync-mappings', async () => {
    const response = await api().get(
      '/v1/organizations/org_1/sync-connections/sync_conn_1/mappings'
    )
    expect(response.status).toBe(200)
  })

  it('returns 422 for invalid event allDay neither-or-both payload', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/events')
      .send({ calendarId: 'cal_1', title: 'Bad', createdBy: 'user_1' })
    expect(response.status).toBe(422)
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
  })

  it('returns 404 task-list-not-found when list is missing', async () => {
    mocks.taskLists.retrieve.mockResolvedValue(null)
    const response = await api().get(
      '/v1/organizations/org_1/task-lists/missing'
    )
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/task-list-not-found', message: expect.any(String) },
    })
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
  })

  it('returns 404 calendar-not-found when calendar is missing', async () => {
    mocks.calendars.retrieve.mockResolvedValue(null)
    const response = await api().get(
      '/v1/organizations/org_1/calendars/missing'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/calendar-not-found')
  })

  it('returns 404 event-not-found when event is missing', async () => {
    mocks.events.retrieve.mockResolvedValue(null)
    const response = await api().get('/v1/organizations/org_1/events/missing')
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/event-not-found')
  })

  it('returns 404 sync-connection-not-found when connection is missing', async () => {
    mocks.syncConnections.retrieve.mockResolvedValue(null)
    const response = await api().get(
      '/v1/organizations/org_1/sync-connections/missing'
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/sync-connection-not-found')
  })

  it('returns 422 when both cursors are supplied on task-lists', async () => {
    const response = await api().get(
      '/v1/organizations/org_1/task-lists?starting_after=a&ending_before=b'
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('work/invalid-request')
    expect(mocks.taskLists.list).not.toHaveBeenCalled()
  })

  it('returns 422 for calendar create with unknown visibility', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/calendars')
      .send({
        name: 'Bad',
        timeZone: 'UTC',
        visibility: 'PUBLIC',
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.calendars.create).not.toHaveBeenCalled()
  })

  it('returns 422 for event create that is both timed and all-day', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/events')
      .send({
        calendarId: 'cal_1',
        title: 'Both',
        allDay: false,
        startAt: 1_788_271_200,
        endAt: 1_788_274_800,
        timeZone: 'UTC',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.events.create).not.toHaveBeenCalled()
  })

  it('returns 422 for event create with endAt before startAt', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/events')
      .send({
        calendarId: 'cal_1',
        title: 'Inverted',
        allDay: false,
        startAt: 1_788_274_800,
        endAt: 1_788_271_200,
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.events.create).not.toHaveBeenCalled()
  })

  it('returns 422 for alert create with two parents', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/alerts')
      .send({
        taskId: 'task_1',
        eventId: 'event_1',
        userId: 'user_1',
        triggerType: 'ABSOLUTE',
        triggerAt: 1_788_271_200,
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.alerts.create).not.toHaveBeenCalled()
  })

  it('returns 422 for alert create with no parents', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/alerts')
      .send({
        userId: 'user_1',
        triggerType: 'ABSOLUTE',
        triggerAt: 1_788_271_200,
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.alerts.create).not.toHaveBeenCalled()
  })

  it('returns 422 for ABSOLUTE alert carrying offset instead of instant', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/alerts')
      .send({
        taskId: 'task_1',
        userId: 'user_1',
        triggerType: 'ABSOLUTE',
        offsetSeconds: -900,
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.alerts.create).not.toHaveBeenCalled()
  })

  it('returns 422 for participant create with neither id nor email', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/events/event_1/participants')
      .send({ kind: 'USER' })
    expect(response.status).toBe(422)
    expect(mocks.participants.create).not.toHaveBeenCalled()
  })

  it('returns 422 for recurrence rule with byMonthDay 0', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/recurrence-rules')
      .send({
        frequency: 'MONTHLY',
        byMonthDay: [0],
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.recurrence.create).not.toHaveBeenCalled()
  })

  it('returns 422 for recurrence rule with count and untilAt together', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/recurrence-rules')
      .send({
        frequency: 'DAILY',
        count: 5,
        untilAt: 1_788_271_200,
        timeZone: 'UTC',
        createdBy: 'user_1',
      })
    expect(response.status).toBe(422)
    expect(mocks.recurrence.create).not.toHaveBeenCalled()
  })

  it('rejects session tier request when permission is missing with 403 session-forbidden', async () => {
    mocks.identity.sessionAccess.mockResolvedValue({
      assigned: true,
      entitled: true,
      status: 'ACTIVE',
      effectivePermissions: new Set(['tasks.view']),
      userId: 'user_1',
    })
    const response = await request(createApp())
      .get('/v1/organizations/org_1/calendars')
      .set('x-876-api-key', 'app_key_crm')
      .set('authorization', 'Bearer user-token')
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/session-forbidden')
    expect(mocks.calendars.list).not.toHaveBeenCalled()
  })

  it('lists event participants with full list envelope', async () => {
    mocks.participants.list.mockResolvedValue([
      {
        id: 'part_1',
        eventId: 'event_1',
        kind: 'USER',
        participantId: 'user_1',
        email: null,
        name: 'Asha',
        role: 'REQUIRED',
        status: 'NEEDS_ACTION',
        delegatedTo: null,
        delegatedFrom: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    const response = await api().get(
      '/v1/organizations/org_1/events/event_1/participants'
    )
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.objectContaining({
        object: 'list',
        has_more: expect.any(Boolean),
        total_count: null,
        url: '/v1/organizations/org_1/events/event_1/participants',
      })
    )
    expect(response.body.error).toBeNull()
  })

  it('lists task links with full list envelope', async () => {
    mocks.taskLinks.list.mockResolvedValue([
      {
        id: 'link_1',
        taskId: 'task_1',
        service: 'crm',
        resource: 'request',
        externalId: 'req_1',
        label: null,
        url: null,
        isPrimary: true,
        createdAt: new Date(),
      },
    ])
    const response = await api().get(
      '/v1/organizations/org_1/tasks/task_1/links'
    )
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.data[0]).toEqual(
      expect.objectContaining({ object: 'task_link', isPrimary: true })
    )
    expect(response.body.error).toBeNull()
  })

  it('exports only tasks when includeEvents false', async () => {
    mocks.exports.create.mockResolvedValue({
      object: 'calendar_export',
      format: 'ics',
      filename: '876-work.ics',
      contentType: 'text/calendar; charset=utf-8',
      content: 'BEGIN:VCALENDAR\r\nBEGIN:VTODO\r\nEND:VCALENDAR\r\n',
    })
    const response = await api()
      .post('/v1/organizations/org_1/exports')
      .send({ format: 'ics', includeTasks: true, includeEvents: false })
    expect(response.status).toBe(201)
    expect(response.body.data.object).toBe('calendar_export')
    expect(response.body.error).toBeNull()
  })

  it('updates calendar subscription through operator tier', async () => {
    mocks.calendarSubs.retrieve.mockResolvedValue({
      id: 'sub_1',
      tenantId: 'work_tnt_1',
      calendarId: 'cal_1',
      userId: 'user_1',
      role: 'VIEWER',
      color: null,
      isVisible: true,
      defaultReminderMinutes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mocks.calendarSubs.update.mockResolvedValue({
      id: 'sub_1',
      tenantId: 'work_tnt_1',
      calendarId: 'cal_1',
      userId: 'user_1',
      role: 'EDITOR',
      color: '#3366ff',
      isVisible: true,
      defaultReminderMinutes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const response = await api()
      .patch('/v1/organizations/org_1/calendars/cal_1/subscriptions/sub_1')
      .send({ role: 'EDITOR', color: '#3366ff' })
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.objectContaining({
        object: 'calendar_subscription',
        role: 'EDITOR',
        color: '#3366ff',
      })
    )
    expect(response.body.error).toBeNull()
  })

  it('deletes calendar subscription through operator tier', async () => {
    mocks.calendarSubs.retrieve.mockResolvedValue({
      id: 'sub_1',
      tenantId: 'work_tnt_1',
      calendarId: 'cal_1',
      userId: 'user_1',
      role: 'VIEWER',
      color: null,
      isVisible: true,
      defaultReminderMinutes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mocks.calendarSubs.remove.mockResolvedValue({
      object: 'calendar_subscription',
      id: 'sub_1',
      deleted: true,
    })
    const response = await api().delete(
      '/v1/organizations/org_1/calendars/cal_1/subscriptions/sub_1'
    )
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'calendar_subscription',
      id: 'sub_1',
      deleted: true,
    })
  })

  it('returns 404 calendar-subscription-not-found when subscription is missing', async () => {
    mocks.calendarSubs.retrieve.mockResolvedValue(null)
    const response = await api()
      .patch('/v1/organizations/org_1/calendars/cal_1/subscriptions/missing')
      .send({ role: 'EDITOR' })
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe(
      'work/calendar-subscription-not-found'
    )
    expect(mocks.calendarSubs.update).not.toHaveBeenCalled()
  })

  it('returns 404 assignment-not-found when assignment is missing', async () => {
    mocks.taskAssignments.retrieve.mockResolvedValue(null)
    const response = await api()
      .patch('/v1/organizations/org_1/tasks/task_1/assignments/missing')
      .send({ status: 'ACCEPTED' })
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/assignment-not-found')
    expect(mocks.taskAssignments.update).not.toHaveBeenCalled()
  })

  it('returns 404 event-participant-not-found when participant is missing', async () => {
    mocks.participants.retrieve.mockResolvedValue(null)
    const response = await api()
      .patch('/v1/organizations/org_1/events/event_1/participants/missing')
      .send({ status: 'ACCEPTED' })
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/event-participant-not-found')
    expect(mocks.participants.update).not.toHaveBeenCalled()
  })

  it('returns 404 recurrence-rule-not-found when rule is missing', async () => {
    mocks.recurrence.retrieve.mockResolvedValue(null)
    const response = await api()
      .patch('/v1/organizations/org_1/recurrence-rules/missing')
      .send({ frequency: 'WEEKLY' })
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/recurrence-rule-not-found')
    expect(mocks.recurrence.update).not.toHaveBeenCalled()
  })

  it('returns 404 sync-mapping-not-found when mapping is missing', async () => {
    mocks.syncMappings.retrieve.mockResolvedValue(null)
    const response = await api()
      .patch(
        '/v1/organizations/org_1/sync-connections/sync_conn_1/mappings/missing'
      )
      .send({ remoteId: 'g_2' })
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/sync-mapping-not-found')
    expect(mocks.syncMappings.update).not.toHaveBeenCalled()
  })

  it('returns 422 for my-work missing from/to query parameters', async () => {
    const response = await api().get('/v1/organizations/org_1/my-work')
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('work/invalid-request')
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
  })

  it('returns 422 for my-work with from after to', async () => {
    const response = await api().get(
      '/v1/organizations/org_1/my-work?user_id=user_1&from=1788300000&to=1788200000'
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('work/invalid-request')
  })

  it('returns 422 for my-work with no user_id and no session principal', async () => {
    const response = await api().get(
      '/v1/organizations/org_1/my-work?from=1788200000&to=1788300000'
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('work/invalid-request')
  })

  it('updates event participant through operator tier', async () => {
    mocks.participants.retrieve.mockResolvedValue({
      id: 'part_1',
      eventId: 'event_1',
      kind: 'USER',
      participantId: 'user_1',
      email: null,
      name: 'Asha',
      role: 'REQUIRED',
      status: 'NEEDS_ACTION',
      delegatedTo: null,
      delegatedFrom: null,
      respondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mocks.participants.update.mockResolvedValue({
      id: 'part_1',
      eventId: 'event_1',
      kind: 'USER',
      participantId: 'user_1',
      email: null,
      name: 'Asha',
      role: 'REQUIRED',
      status: 'ACCEPTED',
      delegatedTo: null,
      delegatedFrom: null,
      respondedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const response = await api()
      .patch('/v1/organizations/org_1/events/event_1/participants/part_1')
      .send({ status: 'ACCEPTED' })
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.objectContaining({
        object: 'event_participant',
        status: 'ACCEPTED',
      })
    )
    expect(response.body.error).toBeNull()
  })

  it('updates task assignment through operator tier', async () => {
    mocks.taskAssignments.retrieve.mockResolvedValue({
      id: 'assign_1',
      taskId: 'task_1',
      targetType: 'USER',
      assigneeId: 'user_1',
      role: 'OWNER',
      status: 'PENDING',
      assignedBy: 'user_2',
      assignedAt: new Date(),
      respondedAt: null,
      completedAt: null,
      delegatedFromAssignmentId: null,
    })
    mocks.taskAssignments.update.mockResolvedValue({
      id: 'assign_1',
      taskId: 'task_1',
      targetType: 'USER',
      assigneeId: 'user_1',
      role: 'OWNER',
      status: 'ACCEPTED',
      assignedBy: 'user_2',
      assignedAt: new Date(),
      respondedAt: new Date(),
      completedAt: null,
      delegatedFromAssignmentId: null,
    })
    const response = await api()
      .patch('/v1/organizations/org_1/tasks/task_1/assignments/assign_1')
      .send({ status: 'ACCEPTED' })
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.objectContaining({ object: 'task_assignment', status: 'ACCEPTED' })
    )
    expect(response.body.error).toBeNull()
  })

  it('rejects connection without scope before tenant check with 403', async () => {
    mocks.connections.activeConnectionAuthorization.mockResolvedValue({
      scopes: new Set(['work.tasks.read']),
    })
    const response = await request(createApp())
      .get('/v1/organizations/org_1/sync-connections')
      .set('x-876-api-key', 'app_key_crm')
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/connection-forbidden')
    expect(mocks.syncConnections.list).not.toHaveBeenCalled()
  })

  it('authorizes session tier request when the access token grants the permission', async () => {
    mocks.identity.sessionAccess.mockResolvedValue({
      assigned: true,
      entitled: true,
      status: 'ACTIVE',
      effectivePermissions: new Set(['calendars.view']),
      userId: 'user_1',
    })
    const response = await request(createApp())
      .get('/v1/organizations/org_1/calendars')
      .set('x-876-api-key', 'app_key_crm')
      .set('authorization', 'Bearer user-token')
    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(mocks.identity.sessionAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'app_key_crm',
        accessToken: 'user-token',
        organizationId: 'org_1',
      })
    )
  })
})
