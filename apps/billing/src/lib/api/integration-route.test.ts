import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  currentAppMock,
  getRoutingMembershipsMock,
  introspectTokenMock,
  retrieveConnectionMock,
  retrieveByOrganizationIdMock,
} = vi.hoisted(() => ({
  currentAppMock: vi.fn(),
  getRoutingMembershipsMock: vi.fn(),
  introspectTokenMock: vi.fn(),
  retrieveConnectionMock: vi.fn(),
  retrieveByOrganizationIdMock: vi.fn(),
}))

vi.mock('@876/sdk', () => ({
  create876Client: () => ({
    oauth: { introspectToken: introspectTokenMock },
    apps: { current: currentAppMock },
  }),
}))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: vi.fn(async () => ({
    auth: { getRoutingMemberships: getRoutingMembershipsMock },
  })),
}))

vi.mock('@/lib/service', () => ({
  service: {
    tenants: { retrieveByOrganizationId: retrieveByOrganizationIdMock },
    financeConnections: { retrieve: retrieveConnectionMock },
  },
}))

import {
  integrationRoute,
  requireIntegrationOrganization,
} from './integration-route'

const tenant = {
  id: 'blten_1',
  organizationId: 'org_1',
  status: 'ACTIVE',
}

describe('requireIntegrationOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('BILLING_INTERNAL_KEY', 'service-secret')
    retrieveByOrganizationIdMock.mockResolvedValue(tenant)
    retrieveConnectionMock.mockResolvedValue({
      id: 'afc_1',
      tenantId: 'blten_1',
      sourceAppId: 'rap_couriers',
      status: 'ACTIVE',
      scopes: ['billing.customers.read', 'billing.customers.write'],
    })
  })

  it('authorizes a trusted service key without invoking delegated OAuth', async () => {
    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { 'x-internal-key': 'service-secret' },
      }),
      'org_1',
      'billing.customers.read'
    )

    expect(result.response).toBeNull()
    expect(result.tenant).toBe(tenant)
    expect(result.platformAdmin).toBe(true)
    expect(introspectTokenMock).not.toHaveBeenCalled()
    expect(retrieveConnectionMock).not.toHaveBeenCalled()
  })

  it('rejects mixed credentials before selecting an authorization tier', async () => {
    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: {
          'x-internal-key': 'service-secret',
          'x-876-api-key': '876_app_secret_couriers',
        },
      }),
      'org_1',
      'billing.customers.read'
    )

    expect(result.response?.status).toBe(400)
    expect(retrieveByOrganizationIdMock).not.toHaveBeenCalled()
    expect(currentAppMock).not.toHaveBeenCalled()
  })

  it('does not fall back to another tier for an invalid admin credential', async () => {
    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { 'x-internal-key': 'wrong-secret' },
      }),
      'org_1',
      'billing.customers.read'
    )

    expect(result.response?.status).toBe(401)
    expect(retrieveByOrganizationIdMock).not.toHaveBeenCalled()
    expect(introspectTokenMock).not.toHaveBeenCalled()
    expect(currentAppMock).not.toHaveBeenCalled()
  })

  it('resolves a product API key and enforces its active app connection', async () => {
    currentAppMock.mockResolvedValue({
      data: { id: 'rap_couriers' },
      error: null,
    })

    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { 'x-876-api-key': '876_app_secret_couriers' },
      }),
      'org_1',
      'billing.customers.read'
    )

    expect(result.response).toBeNull()
    expect(result.sourceAppId).toBe('rap_couriers')
    expect(result.platformAdmin).toBe(false)
    expect(retrieveConnectionMock).toHaveBeenCalledWith(
      'blten_1',
      'rap_couriers'
    )
  })

  it('requires both an explicit scope and active target-org membership', async () => {
    introspectTokenMock.mockResolvedValue({
      data: {
        active: true,
        app_id: 'rap_couriers',
        sub: 'user_1',
        scope: 'billing.customers.read',
      },
      error: null,
    })
    getRoutingMembershipsMock.mockResolvedValue({
      data: {
        data: [{ organization: { id: 'org_1' } }],
      },
      error: null,
    })

    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { authorization: 'Bearer delegated-token' },
      }),
      'org_1',
      'billing.customers.read'
    )

    expect(result.response).toBeNull()
    expect(result.sourceAppId).toBe('rap_couriers')
    expect(getRoutingMembershipsMock).toHaveBeenCalledWith({
      userId: 'user_1',
      status: 'active',
    })
  })

  it('fails closed when the delegated token lacks the operation scope', async () => {
    introspectTokenMock.mockResolvedValue({
      data: {
        active: true,
        app_id: 'rap_couriers',
        sub: 'user_1',
        scope: 'billing.organizations.read',
      },
      error: null,
    })

    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { authorization: 'Bearer delegated-token' },
      }),
      'org_1',
      'billing.customers.write'
    )

    expect(result.response?.status).toBe(403)
    expect(getRoutingMembershipsMock).not.toHaveBeenCalled()
    expect(retrieveByOrganizationIdMock).not.toHaveBeenCalled()
  })

  it('does not let a valid token cross an organization boundary', async () => {
    introspectTokenMock.mockResolvedValue({
      data: {
        active: true,
        app_id: 'rap_couriers',
        sub: 'user_1',
        scope: 'billing.customers.read',
      },
      error: null,
    })
    getRoutingMembershipsMock.mockResolvedValue({
      data: { data: [{ organization: { id: 'org_other' } }] },
      error: null,
    })

    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { authorization: 'Bearer delegated-token' },
      }),
      'org_1',
      'billing.customers.read'
    )

    expect(result.response?.status).toBe(403)
    expect(retrieveByOrganizationIdMock).not.toHaveBeenCalled()
  })

  it('fails closed when the app connection lacks the operation scope', async () => {
    currentAppMock.mockResolvedValue({
      data: { id: 'rap_couriers' },
      error: null,
    })
    retrieveConnectionMock.mockResolvedValue({
      id: 'afc_1',
      status: 'ACTIVE',
      scopes: ['billing.customers.read'],
    })

    const result = await requireIntegrationOrganization(
      new Request('https://billing.example.test', {
        headers: { 'x-876-api-key': '876_app_secret_couriers' },
      }),
      'org_1',
      'billing.customers.write'
    )

    expect(result.response?.status).toBe(403)
  })
})

describe('integrationRoute', () => {
  it('echoes a caller request ID on every integration response', async () => {
    const handler = integrationRoute(async () => Response.json({ ok: true }))

    const response = await handler(
      new Request('https://billing.example.test', {
        headers: { 'x-request-id': 'request_1' },
      }),
      undefined
    )

    expect(response.headers.get('x-request-id')).toBe('request_1')
  })
})
