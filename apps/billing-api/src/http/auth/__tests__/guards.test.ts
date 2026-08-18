import express, { type Express } from 'express'
import request from 'supertest'

import { resetSettingsForTest } from '@/config'
import { type BillingSecurity } from '@/http/api-router'
import { envelope } from '@/http/middleware/envelope'
import { errorHandler, notFoundHandler } from '@/http/middleware/error-handler'
import {
  IdentityUnavailableError,
  type IdentityGateway,
} from '@/providers/identity'

import { createGuardResolver, type AuthRepository } from '../guards'
import { getPrincipal } from '../principal'

const repository: AuthRepository = {
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  activeConnection: vi.fn(),
}
const identity: IdentityGateway = {
  appForApiKey: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
}

function addRoute(app: Express, path: string, security: BillingSecurity): void {
  const guards = createGuardResolver({ repository, identity })(security)
  app.get(path, ...guards, (req, res) => {
    const principal = getPrincipal(req)
    res.json({
      kind: principal.kind,
      tenantId: principal.tenantId,
      appId: principal.appId,
      permissions: [...principal.permissions],
      scopes: [...principal.scopes],
    })
  })
}

function createAuthApp(): Express {
  const app = express()
  app.use(envelope)
  addRoute(app, '/tenant', { kind: 'tenant', permission: 'vendors:read' })
  addRoute(app, '/admin', { kind: 'admin' })
  addRoute(app, '/scheduler', { kind: 'scheduler' })
  addRoute(app, '/integration/:organizationId', {
    kind: 'integration',
    scope: 'billing.customers.write',
  })
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

function identityUnavailable(
  path: string,
  options?: { status?: number; reason?: 'network' | 'timeout' | 'upstream' }
) {
  return new IdentityUnavailableError({
    attempts: 2,
    path,
    reason: options?.reason ?? 'upstream',
    status: options?.status ?? 503,
  })
}

describe('Billing authentication guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_INTERNAL_KEY = 'internal-secret'
    process.env.BILLING_SCHEDULER_KEY = 'scheduler-secret'
    resetSettingsForTest(process.env)
    vi.mocked(repository.tenantByOrganizationId).mockResolvedValue({
      id: 'btenant_123',
      active: true,
    })
    vi.mocked(repository.effectiveMember).mockResolvedValue({
      permissions: new Set(['vendors:read']),
    })
    vi.mocked(repository.activeConnection).mockResolvedValue({
      scopes: new Set(['billing.customers.write']),
    })
    vi.mocked(identity.introspect).mockResolvedValue({
      active: true,
      subject: 'user_123',
      appId: 'app_123',
      scopes: new Set(['billing.customers.write']),
    })
    vi.mocked(identity.organizationMembership).mockResolvedValue({
      role: 'owner',
    })
    vi.mocked(identity.appForApiKey).mockResolvedValue({ id: 'app_123' })
  })

  it('rejects zero credentials with the stable missing-credential error', async () => {
    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'auth/missing-credential',
        message: 'An authentication credential is required.',
      },
    })
  })

  it('rejects multiple credential kinds as ambiguous', async () => {
    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')
      .set('x-876-api-key', '876_app_secret_test')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('auth/ambiguous-credential')
  })

  it('authorizes tenant OAuth from organization role and effective Billing permissions', async () => {
    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        kind: 'oauth',
        tenantId: 'btenant_123',
        appId: 'app_123',
        permissions: ['vendors:read'],
        scopes: ['billing.customers.write'],
      },
      error: null,
    })
    expect(identity.organizationMembership).toHaveBeenCalledWith(
      'access-token',
      'org_123'
    )
    expect(repository.effectiveMember).toHaveBeenCalledWith(
      'btenant_123',
      'user_123',
      'owner'
    )
  })

  it('rejects a user only when identity authoritatively reports no active organization membership', async () => {
    vi.mocked(identity.organizationMembership).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/organization-forbidden')
    expect(repository.effectiveMember).not.toHaveBeenCalled()
  })

  it('returns 503 instead of false organization-forbidden when membership verification is unavailable', async () => {
    vi.mocked(identity.organizationMembership).mockRejectedValue(
      identityUnavailable('/users/me/memberships?status=active')
    )

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(503)
    expect(response.body.error).toEqual({
      code: 'auth/identity-unavailable',
      message: 'The identity service could not verify access. Please retry.',
    })
    expect(repository.effectiveMember).not.toHaveBeenCalled()
  })

  it('returns 503 instead of false invalid-token when introspection is unavailable', async () => {
    vi.mocked(identity.introspect).mockRejectedValue(
      identityUnavailable('/oauth/introspect', { status: 502 })
    )

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('auth/identity-unavailable')
    expect(identity.organizationMembership).not.toHaveBeenCalled()
    expect(repository.effectiveMember).not.toHaveBeenCalled()
  })

  it('keeps an authoritative inactive token as a 401 invalid-token response', async () => {
    vi.mocked(identity.introspect).mockResolvedValue({
      active: false,
      subject: null,
      appId: null,
      scopes: new Set(),
    })

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer expired-token')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/invalid-token')
    expect(identity.organizationMembership).not.toHaveBeenCalled()
  })

  it('passes the organization role into effective Billing access resolution', async () => {
    vi.mocked(identity.organizationMembership).mockResolvedValue({
      role: 'admin',
    })

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(repository.effectiveMember).toHaveBeenCalledWith(
      'btenant_123',
      'user_123',
      'admin'
    )
  })

  it('rejects tenant OAuth when effective Billing access lacks the required permission', async () => {
    vi.mocked(repository.effectiveMember).mockResolvedValue({
      permissions: new Set(),
    })

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/forbidden')
  })

  it('keeps a genuinely missing Billing workspace distinct from identity failures', async () => {
    vi.mocked(repository.tenantByOrganizationId).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/tenant')
      .set('x-billing-organization-id', 'org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('billing/tenant-not-found')
  })

  it('requires the configured internal secret for admin routes', async () => {
    const response = await request(createAuthApp())
      .get('/admin')
      .set('x-internal-key', 'internal-secret')

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      kind: 'internal',
      tenantId: null,
    })
  })

  it('fails closed when internal access is not configured', async () => {
    process.env.BILLING_INTERNAL_KEY = ''
    process.env.API_INTERNAL_KEY = ''
    resetSettingsForTest(process.env)

    const response = await request(createAuthApp())
      .get('/admin')
      .set('x-internal-key', 'anything')

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('auth/internal-disabled')
  })

  it('requires both token and finance-connection scopes for integration OAuth', async () => {
    vi.mocked(identity.introspect).mockResolvedValue({
      active: true,
      subject: 'user_123',
      appId: 'app_123',
      scopes: new Set(),
    })

    const response = await request(createAuthApp())
      .get('/integration/org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/insufficient-scope')
    expect(repository.activeConnection).not.toHaveBeenCalled()
  })

  it('returns 503 for an integration OAuth membership outage before evaluating scopes', async () => {
    vi.mocked(identity.organizationMembership).mockRejectedValue(
      identityUnavailable('/users/me/memberships?status=active', {
        reason: 'network',
      })
    )

    const response = await request(createAuthApp())
      .get('/integration/org_123')
      .set('authorization', 'Bearer access-token')

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('auth/identity-unavailable')
    expect(repository.activeConnection).not.toHaveBeenCalled()
  })

  it('derives app identity from an integration API key and checks its connection', async () => {
    const response = await request(createAuthApp())
      .get('/integration/org_123')
      .set('x-876-api-key', '876_app_secret_test')

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      kind: 'app_api_key',
      tenantId: 'btenant_123',
      appId: 'app_123',
    })
    expect(repository.activeConnection).toHaveBeenCalledWith(
      'btenant_123',
      'app_123'
    )
  })

  it('keeps an authoritatively invalid integration API key as 401', async () => {
    vi.mocked(identity.appForApiKey).mockResolvedValue(null)

    const response = await request(createAuthApp())
      .get('/integration/org_123')
      .set('x-876-api-key', 'bad-key')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/invalid-api-key')
    expect(repository.tenantByOrganizationId).not.toHaveBeenCalled()
  })

  it('returns 503 instead of false invalid-api-key when app identity verification is unavailable', async () => {
    vi.mocked(identity.appForApiKey).mockRejectedValue(
      identityUnavailable('/apps/current', { status: 500 })
    )

    const response = await request(createAuthApp())
      .get('/integration/org_123')
      .set('x-876-api-key', 'valid-looking-key')

    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('auth/identity-unavailable')
    expect(repository.tenantByOrganizationId).not.toHaveBeenCalled()
    expect(repository.activeConnection).not.toHaveBeenCalled()
  })

  it('keeps guards route-local so an unknown path returns 404', async () => {
    const response = await request(createAuthApp()).get('/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('error/not-found')
  })
})
