import express, { type Express } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler, notFoundHandler } from '../error-handler.js'
import { createGuardResolver, type AuthRepository } from './guards.js'
import type { IdentityGateway } from './identity.js'
import { getPrincipal } from './principal.js'
import type { WorkSecurity } from '../api-router.js'

const repository: AuthRepository = {
  tenantByOrganizationId: vi.fn(),
  activeConnection: vi.fn(),
}
const identity: IdentityGateway = {
  appForApiKey: vi.fn(),
  sessionAccess: vi.fn(),
}

function addRoute(app: Express, path: string, security: WorkSecurity): void {
  const guards = createGuardResolver({ repository, identity })(security)
  app.get(path, ...guards, (req, res) => {
    const principal = getPrincipal(req)
    res.json({
      data: {
        kind: principal.kind,
        tenantId: principal.tenantId,
        organizationId: principal.organizationId,
        appId: principal.appId,
        scopes: [...principal.scopes],
      },
      error: null,
    })
  })
}

function createAuthApp(): Express {
  const app = express()
  addRoute(app, '/operator', { kind: 'operator' })
  addRoute(app, '/integration/:organizationId', {
    kind: 'integration',
    scope: 'work.tasks.read',
  })
  addRoute(app, '/write/:organizationId', {
    kind: 'integration',
    scope: 'work.tasks.write',
  })
  addRoute(app, '/session/:organizationId', {
    kind: 'integration',
    scope: 'work.tasks.read',
    sessionPermissions: ['tasks.view'],
  })
  addRoute(app, '/all-permissions/:organizationId', {
    kind: 'integration',
    scope: 'work.resource-work.read',
    sessionPermissions: ['tasks.view', 'reminders.view', 'events.view'],
    sessionPermissionsMode: 'all',
  })
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

describe('Work authentication guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.WORK_INTERNAL_KEY = 'work-internal-secret'
    vi.mocked(repository.tenantByOrganizationId).mockResolvedValue({
      id: 'work_tnt_1',
      active: true,
    })
    vi.mocked(repository.activeConnection).mockResolvedValue({
      scopes: new Set(['work.tasks.read', 'work.tasks.write']),
    })
    vi.mocked(identity.appForApiKey).mockResolvedValue({
      id: 'app_crm',
      slug: '876-crm',
    })
    vi.mocked(identity.sessionAccess).mockResolvedValue({
      userId: 'user_123',
      appId: 'app_crm',
      appSlug: '876-crm',
      assigned: true,
      entitled: true,
      status: 'ACTIVE',
      effectivePermissions: new Set(['work.tasks.read', 'work.tasks.write']),
    })
  })

  it('authorizes CRM’s app key for its connected organization', async () => {
    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        kind: 'app_api_key',
        tenantId: 'work_tnt_1',
        organizationId: 'org_1',
        appId: 'app_crm',
        scopes: ['work.tasks.read', 'work.tasks.write'],
      },
      error: null,
    })
    expect(identity.appForApiKey).toHaveBeenCalledWith('crm-key')
    expect(repository.activeConnection).toHaveBeenCalledWith(
      'work_tnt_1',
      'app_crm'
    )
  })

  it('rejects CRM’s app key for an unconnected organization before a resource repository is reached', async () => {
    vi.mocked(repository.activeConnection).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/integration/org_other')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'work/connection-forbidden',
        message: 'The app Work connection lacks the required scope.',
      },
    })
    expect(repository.activeConnection).toHaveBeenCalledWith(
      'work_tnt_1',
      'app_crm'
    )
  })

  it('rejects a connection missing the declared scope', async () => {
    vi.mocked(repository.activeConnection).mockResolvedValue({
      scopes: new Set(['work.reminders.read']),
    })

    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/connection-forbidden')
  })

  it('does not let a read scope authorize a write route', async () => {
    vi.mocked(repository.activeConnection).mockResolvedValue({
      scopes: new Set(['work.tasks.read']),
    })

    const response = await request(createAuthApp())
      .get('/write/org_1')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/connection-forbidden')
  })

  it('rejects a revoked connection filtered out by connection authorization', async () => {
    vi.mocked(repository.activeConnection).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/connection-forbidden')
  })

  it('rejects an inactive connection filtered out by connection authorization', async () => {
    vi.mocked(repository.activeConnection).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/connection-forbidden')
  })

  it('rejects an unknown app API key without trusting absent identity', async () => {
    vi.mocked(identity.appForApiKey).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'unknown-key')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('work/invalid-api-key')
    expect(repository.tenantByOrganizationId).not.toHaveBeenCalled()
    expect(repository.activeConnection).not.toHaveBeenCalled()
  })

  it('rejects malformed app API credentials before identity lookup', async () => {
    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'crm-key')
      .set('x-internal-key', 'work-internal-secret')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('work/unauthorized')
    expect(identity.appForApiKey).not.toHaveBeenCalled()
  })

  it('keeps operator passthrough for an integration route', async () => {
    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-internal-key', 'work-internal-secret')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      kind: 'internal',
      tenantId: 'work_tnt_1',
      organizationId: 'org_1',
      appId: null,
      scopes: [],
    })
    expect(identity.appForApiKey).not.toHaveBeenCalled()
    expect(repository.activeConnection).not.toHaveBeenCalled()
  })

  it('rejects an app key on an operator-only route', async () => {
    const response = await request(createAuthApp())
      .get('/operator')
      .set('x-876-api-key', 'crm-key')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('work/unauthorized')
    expect(identity.appForApiKey).not.toHaveBeenCalled()
  })

  it('returns not-found for an unknown path before resolving credentials', async () => {
    const response = await request(createAuthApp()).get('/unknown')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('work/not-found')
    expect(identity.appForApiKey).not.toHaveBeenCalled()
    expect(repository.tenantByOrganizationId).not.toHaveBeenCalled()
  })

  it('never serializes an HTTP status into an auth error body', async () => {
    vi.mocked(identity.appForApiKey).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/integration/org_1')
      .set('x-876-api-key', 'unknown-key')

    expect(response.status).toBe(401)
    expect(Object.hasOwn(response.body.error, 'httpStatus')).toBe(false)
  })

  it('rejects session on all-permissions route when any required permission is missing', async () => {
    vi.mocked(identity.appForApiKey).mockResolvedValue({
      id: 'app_crm',
      slug: 'crm',
    })
    vi.mocked(identity.sessionAccess).mockResolvedValue({
      userId: 'user_1',
      appId: 'app_crm',
      appSlug: 'crm',
      assigned: true,
      entitled: true,
      status: 'ACTIVE',
      effectivePermissions: new Set(['tasks.view', 'reminders.view']),
    })

    const response = await request(createAuthApp())
      .get('/all-permissions/org_1')
      .set('x-876-api-key', 'crm-key')
      .set('authorization', 'Bearer session_token')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('work/session-forbidden')
  })

  it('accepts session on all-permissions route when all required permissions are held', async () => {
    vi.mocked(identity.appForApiKey).mockResolvedValue({
      id: 'app_crm',
      slug: 'crm',
    })
    vi.mocked(identity.sessionAccess).mockResolvedValue({
      userId: 'user_1',
      appId: 'app_crm',
      appSlug: 'crm',
      assigned: true,
      entitled: true,
      status: 'ACTIVE',
      effectivePermissions: new Set([
        'tasks.view',
        'reminders.view',
        'events.view',
      ]),
    })

    const response = await request(createAuthApp())
      .get('/all-permissions/org_1')
      .set('x-876-api-key', 'crm-key')
      .set('authorization', 'Bearer session_token')

    expect(response.status).toBe(200)
    expect(response.body.data.kind).toBe('session')
  })
})
