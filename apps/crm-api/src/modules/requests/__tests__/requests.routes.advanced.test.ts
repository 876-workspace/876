import express from 'express'
import type { ErrorRequestHandler } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository, prioritiesMock } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: {
    retrieve: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    removeNote: vi.fn(),
    updateNote: vi.fn(),
    retrieveNote: vi.fn(),
    categoryExists: vi.fn(),
    subcategoryExists: vi.fn(),
    teamExists: vi.fn(),
    isTeamMember: vi.fn(),
    customerExists: vi.fn(),
  },
  prioritiesMock: {
    requireActiveForTenant: vi
      .fn()
      .mockResolvedValue({ id: 'crm_pri_normal', name: 'Normal' }),
    retrieveDefaultForTenant: vi
      .fn()
      .mockResolvedValue({ id: 'crm_pri_normal', name: 'Normal' }),
    serialize: vi.fn((p: unknown) => p),
  },
}))
// Tasks, reminders and notes are their own modules now, each mounted by the
// requests router. This suite covers the routing/envelope layer, so each child
// service is mocked at its own module boundary.
const tasksMock = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi
    .fn()
    .mockResolvedValue({ object: 'request_task', id: 'crm_task_1' }),
  update: vi
    .fn()
    .mockResolvedValue({ object: 'request_task', id: 'crm_task_1' }),
  remove: vi.fn().mockResolvedValue({
    object: 'request_task',
    id: 'crm_task_1',
    deleted: true,
  }),
}))
// Notes keep the real service/serializer in the path and are mocked only at
// their repository, so the route's list envelope and viewer scoping are
// genuinely exercised rather than stubbed away.
const notesRepo = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue([]),
  retrieve: vi.fn().mockResolvedValue(null),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
const remindersMock = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue([]),
  create: vi
    .fn()
    .mockResolvedValue({ object: 'request_reminder', id: 'crm_rem_1' }),
  update: vi
    .fn()
    .mockResolvedValue({ object: 'request_reminder', id: 'crm_rem_1' }),
  remove: vi.fn().mockResolvedValue({
    object: 'request_reminder',
    id: 'crm_rem_1',
    deleted: true,
  }),
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../requests.repository.js', () => repository)
vi.mock('../../notes/notes.repository.js', () => notesRepo)
vi.mock('../../tasks/tasks.service.js', () => tasksMock)
vi.mock('../../reminders/reminders.service.js', () => remindersMock)
vi.mock('../../priorities/index.js', () => prioritiesMock)

const { createRequestsRouter } = await import('../requests.routes.js')

const tenant = { id: 'crm_tenant_1', organizationId: 'org_1', status: 'ACTIVE' }
const requestRow = {
  id: 'crm_req_1',
  tenantId: tenant.id,
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  categoryId: null,
  subcategoryId: null,
  teamId: null,
  assigneeId: null,
  ownerId: null,
  status: 'OPEN',
  priority: 'NORMAL',
  source: 'CRM',
  createdBy: 'usr_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date('2026-08-26T18:00:00.000Z'),
  updatedAt: new Date('2026-08-26T18:00:00.000Z'),
  deletedAt: null,
}

/**
 * A registered CRM failure, as the error middleware sees it.
 *
 * `CrmHttpError` is thrown as an `Error` subclass, so the handler receives it
 * as `unknown` and has to narrow before reading `code`/`httpStatus`. Typing the
 * handler `any` hid that narrowing entirely.
 */
function isCrmHttpError(
  error: unknown
): error is { code: string; message: string; httpStatus?: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  )
}

function app() {
  const instance = express()
  instance.use(express.json())
  instance.use(
    '/v1/organizations/:organizationId/requests',
    createRequestsRouter()
  )

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (isCrmHttpError(error))
      return res.status(error.httpStatus ?? 500).json({
        data: null,
        error: { code: error.code, message: error.message },
      })

    return res.status(400).json({
      data: null,
      error: {
        code: 'validation',
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
  instance.use(handleError)

  return instance
}

/** The HTTP verbs these routes expose, as supertest names them. */
const VERBS = ['get', 'post', 'patch', 'delete'] as const
type Verb = (typeof VERBS)[number]

function isVerb(value: string): value is Verb {
  return (VERBS as readonly string[]).includes(value)
}

// `unknown` here would not satisfy supertest's `.send()`, which takes a string
// or an object; this is the widest type that stays honest about the payload.
async function req(
  method: string,
  path: string,
  body?: string | object | null
) {
  const { default: request } = await import('supertest')

  const verb = method.toLowerCase()
  // An explicit narrow rather than an `any` index: a typo in a call site should
  // fail here with a readable message, not resolve to `undefined` and throw
  // "is not a function" from inside supertest.
  if (!isVerb(verb)) throw new Error(`Unsupported method: ${method}`)

  const pending = request(app())
    [verb](path)
    .set('x-internal-key', 'crm-internal-key')

  if (body === undefined || body === null) return await pending

  return await pending.send(body)
}

beforeEach(() => {
  vi.clearAllMocks()
  // `requireInternal` compares the header against this env var, so without it
  // every route answers 401 and no validation or envelope assertion is reached.
  process.env.CRM_INTERNAL_KEY = 'crm-internal-key'
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  repository.retrieve.mockResolvedValue(requestRow)
  repository.list.mockResolvedValue([requestRow])
  repository.customerExists.mockResolvedValue({ id: 'crm_cus_1' })
  repository.create.mockResolvedValue(requestRow)
  repository.update.mockResolvedValue(requestRow)
  repository.remove.mockResolvedValue({
    object: 'request',
    id: 'crm_req_1',
    deleted: true,
  })
  notesRepo.list.mockResolvedValue([])
  notesRepo.create.mockResolvedValue({
    id: 'n1',
    body: 'hi',
    authorId: 'usr_1',
    kind: 'NOTE',
    internal: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    tenantId: tenant.id,
    requestId: 'crm_req_1',
  })
  notesRepo.retrieve.mockResolvedValue(null)
  repository.categoryExists.mockResolvedValue(null)
  repository.subcategoryExists.mockResolvedValue(null)
  repository.teamExists.mockResolvedValue({ id: 'crm_team_1' })
  repository.isTeamMember.mockResolvedValue(null)
  tasksMock.list.mockResolvedValue([])
  remindersMock.list.mockResolvedValue([])
  tasksMock.create.mockResolvedValue({
    object: 'request_task',
    id: 'crm_task_1',
    tenantId: tenant.id,
    requestId: 'crm_req_1',
    title: 'T',
    status: 'OPEN',
    createdAt: 1,
    updatedAt: 1,
  })
  remindersMock.create.mockResolvedValue({
    object: 'request_reminder',
    id: 'crm_rem_1',
    tenantId: tenant.id,
    requestId: 'crm_req_1',
    title: 'R',
    status: 'SCHEDULED',
    createdAt: 1,
    updatedAt: 1,
  })
})

describe('requests.routes - validation and envelopes', () => {
  it('returns 400 for missing subject on create', async () => {
    const res = await req('POST', '/v1/organizations/org_1/requests', {
      customerId: 'crm_cus_1',
      createdBy: 'usr_1',
    })
    expect(res.status).toBe(400)
  })
  it('returns 400 when requesterUserId exceeds the column length', async () => {
    const res = await req('POST', '/v1/organizations/org_1/requests', {
      customerId: 'crm_cus_1',
      subject: 'Too long',
      requesterUserId: 'u'.repeat(161),
      createdBy: 'usr_1',
    })
    expect(res.status).toBe(400)
    expect(repository.create).not.toHaveBeenCalled()
  })
  it('accepts a request carrying a requester', async () => {
    const res = await req('POST', '/v1/organizations/org_1/requests', {
      customerId: 'crm_cus_1',
      subject: 'Cannot sign in',
      requesterUserId: 'usr_requester_1',
      requesterContactId: 'con_1',
      createdBy: 'usr_1',
    })
    expect(res.status).toBe(201)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterUserId: 'usr_requester_1',
        requesterContactId: 'con_1',
      })
    )
  })
  it('returns 400 for empty body on update', async () => {
    const res = await req(
      'PATCH',
      '/v1/organizations/org_1/requests/crm_req_1',
      {}
    )
    expect(res.status).toBe(400)
  })
  it('returns list envelope for notes', async () => {
    const res = await req(
      'GET',
      '/v1/organizations/org_1/requests/crm_req_1/notes'
    )
    expect(res.status).toBe(200)
    expect(res.body.data.object).toBe('list')
    expect(res.body.data.url).toContain('/notes')
  })
  it('passes the note viewer through the list route', async () => {
    await req(
      'GET',
      '/v1/organizations/org_1/requests/crm_req_1/notes?viewer_id=usr_1'
    )
    expect(notesRepo.list).toHaveBeenCalledWith('crm_tenant_1', 'crm_req_1', {
      viewerId: 'usr_1',
      includePrivate: undefined,
    })
  })
  it('returns 201 on create note', async () => {
    repository.retrieve.mockResolvedValue(requestRow)
    const res = await req(
      'POST',
      '/v1/organizations/org_1/requests/crm_req_1/notes',
      { body: 'Hello', authorId: 'usr_1' }
    )
    expect(res.status).toBe(201)
    expect(res.body.data).toBeDefined()
  })
  it('returns 404 when retrieving missing request', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await req('GET', '/v1/organizations/org_1/requests/missing')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('crm/request-not-found')
  })
  it('lists tasks envelope', async () => {
    const res = await req(
      'GET',
      '/v1/organizations/org_1/requests/crm_req_1/tasks'
    )
    expect(res.status).toBe(200)
    expect(res.body.data.object).toBe('list')
    expect(res.body.data.url).toContain('/tasks')
  })
  it('creates task returns 201', async () => {
    const res = await req(
      'POST',
      '/v1/organizations/org_1/requests/crm_req_1/tasks',
      { title: 'Call', createdBy: 'usr_1' }
    )
    expect(res.status).toBe(201)
  })
  it('update task returns 404 when not found', async () => {
    tasksMock.update.mockResolvedValue(null)
    const res = await req(
      'PATCH',
      '/v1/organizations/org_1/requests/crm_req_1/tasks/missing',
      { title: 'x' }
    )
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('crm/task-not-found')
  })
  it('delete task returns 404 when not found', async () => {
    tasksMock.remove.mockResolvedValue(null)
    const res = await req(
      'DELETE',
      '/v1/organizations/org_1/requests/crm_req_1/tasks/missing',
      { deletedBy: 'usr_1' }
    )
    expect(res.status).toBe(404)
  })
  it('lists reminders envelope', async () => {
    const res = await req(
      'GET',
      '/v1/organizations/org_1/requests/crm_req_1/reminders'
    )
    expect(res.status).toBe(200)
    expect(res.body.data.object).toBe('list')
  })
  it('creates reminder returns 201', async () => {
    const res = await req(
      'POST',
      '/v1/organizations/org_1/requests/crm_req_1/reminders',
      {
        title: 'Ping',
        remindAt: Date.now(),
        userId: 'usr_2',
        createdBy: 'usr_1',
      }
    )
    expect(res.status).toBe(201)
  })
  it('update reminder 404', async () => {
    remindersMock.update.mockResolvedValue(null)
    const res = await req(
      'PATCH',
      '/v1/organizations/org_1/requests/crm_req_1/reminders/missing',
      { title: 'x' }
    )
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('crm/reminder-not-found')
  })
  it('delete reminder 404', async () => {
    remindersMock.remove.mockResolvedValue(null)
    const res = await req(
      'DELETE',
      '/v1/organizations/org_1/requests/crm_req_1/reminders/missing',
      { deletedBy: 'usr_1' }
    )
    expect(res.status).toBe(404)
  })
})
