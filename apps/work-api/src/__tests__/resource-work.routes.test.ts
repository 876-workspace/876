import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.WORK_DATABASE_URL = 'postgres://localhost/test'
})

const mocks = vi.hoisted(() => ({
  tasks: { list: vi.fn() },
  reminders: { list: vi.fn() },
  events: { list: vi.fn() },
  tenants: {
    retrieveByOrganization: vi.fn(),
    tenantAuthorizationByOrganizationId: vi.fn(),
  },
  connections: { activeConnectionAuthorization: vi.fn() },
  identity: { appForApiKey: vi.fn(), sessionAccess: vi.fn() },
}))

vi.mock('../modules/tasks/tasks.repository.js', () => mocks.tasks)
vi.mock('../modules/reminders/reminders.repository.js', () => mocks.reminders)
vi.mock('../modules/events/events.repository.js', () => mocks.events)
vi.mock('../modules/tenants/tenants.repository.js', () => mocks.tenants)
vi.mock('../modules/connections/index.js', () => mocks.connections)
vi.mock('../http/auth/identity.js', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.identity.appForApiKey
    sessionAccess = mocks.identity.sessionAccess
  },
  IdentityUnavailableError: class IdentityUnavailableError extends Error {},
}))

const { createApp } = await import('../application.js')

const PATH =
  '/v1/organizations/org_1/resource-work?from=100&to=200&context_service=billing&context_resource=invoice&context_id=inv_1'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.tenants.tenantAuthorizationByOrganizationId.mockResolvedValue({
    id: 'work_tnt_1',
    active: true,
  })
  mocks.tenants.retrieveByOrganization.mockResolvedValue({
    id: 'work_tnt_1',
    organizationId: 'org_1',
    status: 'ACTIVE',
    createdAt: new Date('2026-09-09T00:00:00Z'),
    updatedAt: new Date('2026-09-09T00:00:00Z'),
  })
  mocks.tasks.list.mockResolvedValue([])
  mocks.reminders.list.mockResolvedValue([])
  mocks.events.list.mockResolvedValue([])
  mocks.identity.appForApiKey.mockResolvedValue({
    id: 'app_invoice',
    slug: 'invoice',
  })
  mocks.identity.sessionAccess.mockResolvedValue({
    userId: 'user_1',
    appId: 'app_invoice',
    appSlug: 'invoice',
    assigned: true,
    entitled: true,
    status: 'ACTIVE',
    effectivePermissions: new Set([
      'tasks.view',
      'reminders.view',
      'events.view',
    ]),
  })
  mocks.connections.activeConnectionAuthorization.mockResolvedValue({
    scopes: new Set(['work.resource-work.read']),
  })
})

describe('GET resource-work route', () => {
  it('returns the assembled success envelope for a fully authorized session', async () => {
    const response = await request(createApp())
      .get(PATH)
      .set('x-876-api-key', 'invoice-key')
      .set('authorization', 'Bearer session-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'resource_work',
        organizationId: 'org_1',
        context: {
          service: 'billing',
          resource: 'invoice',
          externalId: 'inv_1',
        },
        from: 100,
        to: 200,
        tasks: [],
        reminders: [],
        events: [],
        overdueTasks: [],
      },
      error: null,
    })
  })

  it.each([
    ['my-work only', ['my-work.view']],
    ['one resource permission', ['tasks.view']],
    ['two resource permissions', ['tasks.view', 'events.view']],
  ])('rejects a session with %s', async (_label, permissions) => {
    mocks.identity.sessionAccess.mockResolvedValue({
      userId: 'user_1',
      appId: 'app_invoice',
      appSlug: 'invoice',
      assigned: true,
      entitled: true,
      status: 'ACTIVE',
      effectivePermissions: new Set(permissions),
    })

    const response = await request(createApp())
      .get(PATH)
      .set('x-876-api-key', 'invoice-key')
      .set('authorization', 'Bearer session-token')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/session-forbidden')
    expect(mocks.tasks.list).not.toHaveBeenCalled()
  })

  it('accepts an integration with the aggregate read scope', async () => {
    const response = await request(createApp())
      .get(PATH)
      .set('x-876-api-key', 'invoice-key')

    expect(response.status).toBe(200)
    expect(
      mocks.connections.activeConnectionAuthorization
    ).toHaveBeenCalledWith('work_tnt_1', 'app_invoice')
  })

  it('rejects invalid and oversized windows before resource reads', async () => {
    const response = await request(createApp())
      .get(
        '/v1/organizations/org_1/resource-work?from=0&to=5356801&context_service=billing&context_resource=invoice&context_id=inv_1'
      )
      .set('x-876-api-key', 'invoice-key')

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('work/invalid-request')
    expect(mocks.tasks.list).not.toHaveBeenCalled()
  })
})
