import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  tasks: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  reminders: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  tenants: {
    retrieveByOrganization: vi.fn(),
    ensure: vi.fn(),
  },
}))

vi.mock('../modules/tasks/tasks.repository.js', () => mocks.tasks)
vi.mock('../modules/reminders/reminders.repository.js', () => mocks.reminders)
vi.mock('../modules/tenants/tenants.repository.js', () => mocks.tenants)

const { createApp } = await import('../application.js')
const { secretsMatch } = await import('../http/internal-auth.js')
const INTERNAL_KEY = 'work-internal-a1b2c3d4e5f6'
const UNAUTHORIZED_BODY = {
  data: null,
  error: { code: 'work/unauthorized', message: 'Unauthorized.' },
}
const INVALID_BODY = {
  data: null,
  error: { code: 'work/invalid-request', message: 'Invalid Work request.' },
}

function tenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'work_tnt_1',
    organizationId: 'org_1',
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:00:00.000Z'),
    ...overrides,
  }
}

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task_1',
    tenantId: 'work_tnt_1',
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'crm_req_1',
    title: 'Call Alejandra',
    description: 'Confirm the delivery window.',
    status: 'OPEN' as const,
    priorityId: 'crm_pri_normal',
    assigneeId: 'usr_1',
    dueAt: new Date('2026-09-01T09:00:00.000Z'),
    completedAt: null,
    completedBy: null,
    sortOrder: 4,
    createdBy: 'usr_2',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:30:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

function reminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reminder_1',
    tenantId: 'work_tnt_1',
    contextService: 'crm',
    contextResource: 'request',
    contextId: 'crm_req_1',
    title: 'Send status update',
    note: 'Include the tracking number.',
    remindAt: new Date('2026-09-01T10:00:00.000Z'),
    userId: 'usr_1',
    status: 'SCHEDULED' as const,
    sentAt: null,
    dismissedAt: null,
    createdBy: 'usr_2',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    updatedAt: new Date('2026-08-30T12:30:00.000Z'),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  }
}

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
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-30T12:30:00.000Z'))
  process.env.WORK_INTERNAL_KEY = INTERNAL_KEY
  mocks.tenants.retrieveByOrganization.mockResolvedValue(tenant())
  mocks.tenants.ensure.mockResolvedValue(tenant())
  mocks.tasks.list.mockResolvedValue([task()])
  mocks.tasks.retrieve.mockResolvedValue(task())
  mocks.reminders.list.mockResolvedValue([reminder()])
  mocks.reminders.retrieve.mockResolvedValue(reminder())
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.WORK_INTERNAL_KEY
})

describe('Work API routes', () => {
  it('returns the exact unauthorized envelope when the internal key is missing', async () => {
    const response = await request(createApp()).get(
      '/v1/organizations/org_1/tasks'
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
    expect(mocks.tenants.retrieveByOrganization).not.toHaveBeenCalled()
  })

  it('rejects an internal key prefix through secretsMatch', () => {
    expect(secretsMatch(INTERNAL_KEY.slice(0, 8), INTERNAL_KEY)).toBe(false)
  })

  it('returns the exact unauthorized envelope for a wrong internal key', async () => {
    const response = await request(createApp())
      .get('/v1/organizations/org_1/tasks')
      .set('x-internal-key', INTERNAL_KEY.slice(0, 8))

    expect(response.status).toBe(401)
    expect(response.body).toEqual(UNAUTHORIZED_BODY)
    expect(mocks.tenants.retrieveByOrganization).not.toHaveBeenCalled()
  })

  it('returns not-found instead of unauthorized for an unknown path', async () => {
    const response = await request(createApp()).get('/not-a-work-route')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/not-found', message: 'Not found.' },
    })
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
  })

  it('retrieves a task with the complete resource envelope', async () => {
    const response = await api().get('/v1/organizations/org_1/tasks/task_1')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'task',
        id: 'task_1',
        organizationId: 'org_1',
        context: { service: 'crm', resource: 'request', id: 'crm_req_1' },
        title: 'Call Alejandra',
        description: 'Confirm the delivery window.',
        status: 'OPEN',
        priorityId: 'crm_pri_normal',
        assigneeId: 'usr_1',
        dueAt: 1_788_253_200,
        completedAt: null,
        completedBy: null,
        sortOrder: 4,
        createdBy: 'usr_2',
        createdAt: 1_788_091_200,
        updatedAt: 1_788_093_000,
      },
      error: null,
    })
    expect(mocks.tasks.retrieve).toHaveBeenCalledWith('work_tnt_1', 'task_1')
  })

  it('retrieves a reminder with the complete resource envelope', async () => {
    const response = await api().get(
      '/v1/organizations/org_1/reminders/reminder_1'
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'reminder',
        id: 'reminder_1',
        organizationId: 'org_1',
        context: { service: 'crm', resource: 'request', id: 'crm_req_1' },
        title: 'Send status update',
        note: 'Include the tracking number.',
        remindAt: 1_788_256_800,
        userId: 'usr_1',
        status: 'SCHEDULED',
        sentAt: null,
        dismissedAt: null,
        createdBy: 'usr_2',
        createdAt: 1_788_091_200,
        updatedAt: 1_788_093_000,
      },
      error: null,
    })
    expect(mocks.reminders.retrieve).toHaveBeenCalledWith(
      'work_tnt_1',
      'reminder_1'
    )
  })

  it('returns task-not-found when a tenant-scoped task is absent', async () => {
    mocks.tasks.retrieve.mockResolvedValue(null)
    const response = await api().get('/v1/organizations/org_1/tasks/missing')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'work/task-not-found', message: 'Task not found.' },
    })
    expect(mocks.tasks.retrieve).toHaveBeenCalledWith('work_tnt_1', 'missing')
  })

  it('returns reminder-not-found when a tenant-scoped reminder is absent', async () => {
    mocks.reminders.retrieve.mockResolvedValue(null)
    const response = await api().get(
      '/v1/organizations/org_1/reminders/missing'
    )

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'work/reminder-not-found',
        message: 'Reminder not found.',
      },
    })
    expect(mocks.reminders.retrieve).toHaveBeenCalledWith(
      'work_tnt_1',
      'missing'
    )
  })

  it('ensures a tenant with the complete resource envelope', async () => {
    const response = await api().post('/v1/tenants').send({
      organizationId: 'org_1',
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'work_tenant',
        id: 'work_tnt_1',
        organizationId: 'org_1',
        status: 'ACTIVE',
        createdAt: 1_788_091_200,
        updatedAt: 1_788_091_200,
      },
      error: null,
    })
    expect(mocks.tenants.ensure).toHaveBeenCalledWith('org_1')
  })

  it('returns invalid-request for invalid task list pagination', async () => {
    const response = await api().get('/v1/organizations/org_1/tasks?limit=0')

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.tasks.list).not.toHaveBeenCalled()
  })

  it('returns invalid-request for an invalid task create body', async () => {
    const response = await api().post('/v1/organizations/org_1/tasks').send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.tasks.create).not.toHaveBeenCalled()
  })

  it('returns invalid-request for an empty task update body', async () => {
    const response = await api()
      .patch('/v1/organizations/org_1/tasks/task_1')
      .send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.tasks.update).not.toHaveBeenCalled()
  })

  it('returns invalid-request for a task delete body without deletedBy', async () => {
    const response = await api()
      .delete('/v1/organizations/org_1/tasks/task_1')
      .send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.tasks.remove).not.toHaveBeenCalled()
  })

  it('returns invalid-request for invalid reminder list pagination', async () => {
    const response = await api()
      .get('/v1/organizations/org_1/reminders?starting_after=a&ending_before=b')

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.reminders.list).not.toHaveBeenCalled()
  })

  it('returns invalid-request for an invalid reminder create body', async () => {
    const response = await api()
      .post('/v1/organizations/org_1/reminders')
      .send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.reminders.create).not.toHaveBeenCalled()
  })

  it('returns invalid-request for an empty reminder update body', async () => {
    const response = await api()
      .patch('/v1/organizations/org_1/reminders/reminder_1')
      .send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.reminders.update).not.toHaveBeenCalled()
  })

  it('returns invalid-request for a reminder delete body without deletedBy', async () => {
    const response = await api()
      .delete('/v1/organizations/org_1/reminders/reminder_1')
      .send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.reminders.remove).not.toHaveBeenCalled()
  })

  it('returns invalid-request for a tenant create body without organizationId', async () => {
    const response = await api().post('/v1/tenants').send({})

    expect(response.status).toBe(422)
    expect(response.body).toEqual(INVALID_BODY)
    expect(mocks.tenants.ensure).not.toHaveBeenCalled()
  })

  it('returns tenant-not-found for an unknown organization', async () => {
    mocks.tenants.retrieveByOrganization.mockResolvedValue(null)
    const response = await api().get('/v1/organizations/missing/tasks')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'work/tenant-not-found',
        message: 'This organization has no Work workspace yet.',
      },
    })
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
    expect(mocks.tasks.list).not.toHaveBeenCalled()
  })

  it('returns tenant-inactive for a suspended organization', async () => {
    mocks.tenants.retrieveByOrganization.mockResolvedValue(
      tenant({ status: 'SUSPENDED' })
    )
    const response = await api().get('/v1/organizations/org_1/reminders')

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'work/tenant-inactive',
        message: 'This organization’s Work workspace is not active.',
      },
    })
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
    expect(mocks.reminders.list).not.toHaveBeenCalled()
  })

  it('returns a truthful task list envelope when an additional row exists', async () => {
    mocks.tasks.list.mockResolvedValue([task(), task({ id: 'task_2' })])
    const response = await api().get('/v1/organizations/org_1/tasks?limit=1')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'task',
            id: 'task_1',
            organizationId: 'org_1',
            context: {
              service: 'crm',
              resource: 'request',
              id: 'crm_req_1',
            },
            title: 'Call Alejandra',
            description: 'Confirm the delivery window.',
            status: 'OPEN',
            priorityId: 'crm_pri_normal',
            assigneeId: 'usr_1',
            dueAt: 1_788_253_200,
            completedAt: null,
            completedBy: null,
            sortOrder: 4,
            createdBy: 'usr_2',
            createdAt: 1_788_091_200,
            updatedAt: 1_788_093_000,
          },
        ],
        has_more: true,
        total_count: null,
        url: '/v1/organizations/org_1/tasks',
      },
      error: null,
    })
    expect(mocks.tasks.list).toHaveBeenCalledWith('work_tnt_1', {
      limit: 1,
    })
  })

  it('returns a truthful reminder list envelope when an additional row exists', async () => {
    mocks.reminders.list.mockResolvedValue([
      reminder(),
      reminder({ id: 'reminder_2' }),
    ])
    const response = await api().get(
      '/v1/organizations/org_1/reminders?limit=1'
    )

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'list',
      data: [
        {
          object: 'reminder',
          id: 'reminder_1',
          organizationId: 'org_1',
          context: { service: 'crm', resource: 'request', id: 'crm_req_1' },
          title: 'Send status update',
          note: 'Include the tracking number.',
          remindAt: 1_788_256_800,
          userId: 'usr_1',
          status: 'SCHEDULED',
          sentAt: null,
          dismissedAt: null,
          createdBy: 'usr_2',
          createdAt: 1_788_091_200,
          updatedAt: 1_788_093_000,
        },
      ],
      has_more: true,
      total_count: null,
      url: '/v1/organizations/org_1/reminders',
    })
    expect(response.body.error).toBeNull()
    expect(mocks.reminders.list).toHaveBeenCalledWith('work_tnt_1', {
      limit: 1,
    })
  })
})
