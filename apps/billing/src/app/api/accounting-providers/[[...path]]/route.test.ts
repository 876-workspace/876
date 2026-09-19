import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  getAccountingProviderClient: vi.fn(),
  create: vi.fn(),
  authorize: vi.fn(),
  validate: vi.fn(),
  reconcile: vi.fn(),
  disable: vi.fn(),
  adopt: vi.fn(),
  release: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getContext: mocks.getContext,
  canManageBilling: (role: string) => role === 'owner' || role === 'admin',
}))
vi.mock('@/lib/clients/accounting-providers', () => ({
  getAccountingProviderClient: mocks.getAccountingProviderClient,
}))

import { DELETE, POST } from './route'

function route(path: string[]) {
  return { params: Promise.resolve({ path }) }
}

async function body(response: Response) {
  return response.json() as Promise<{
    data: unknown
    error: { code: string; message: string } | null
  }>
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAccountingProviderClient.mockResolvedValue({
    accountingProviders: {
      connections: {
        create: mocks.create,
        authorize: mocks.authorize,
        validate: mocks.validate,
        reconcile: mocks.reconcile,
        delete: mocks.disable,
        imports: {
          adopt: mocks.adopt,
          release: mocks.release,
        },
      },
    },
  })
  mocks.getContext.mockResolvedValue({
    orgId: 'org_123',
    role: 'owner',
    permissions: ['billing:access', 'settings:read'],
  })
  mocks.create.mockResolvedValue({
    data: { object: 'accounting-provider-connection', id: 'acpc_1' },
    error: null,
  })
  mocks.authorize.mockResolvedValue({
    data: {
      object: 'accounting-provider-authorization',
      connectionId: 'acpc_1',
      authorizeUrl: 'https://accounts.zoho.com/oauth/v2/auth?fixture=1',
      expiresAt: 1788279000,
    },
    error: null,
  })
  mocks.validate.mockResolvedValue({
    data: { object: 'accounting-provider-connection', id: 'acpc_1' },
    error: null,
  })
  mocks.reconcile.mockResolvedValue({
    data: {
      object: 'accounting-provider-reconcile',
      connectionId: 'acpc_1',
      resourceTypes: ['customer'],
      enqueued: 1,
    },
    error: null,
  })
  mocks.disable.mockResolvedValue({
    data: {
      object: 'accounting-provider-connection',
      id: 'acpc_1',
      deleted: true,
    },
    error: null,
  })
  mocks.adopt.mockResolvedValue({
    data: {
      object: 'accounting-provider-adoption',
      connectionId: 'acpc_1',
      resourceType: 'customer',
      resourceId: 'cus_1',
      externalId: 'zho_1',
    },
    error: null,
  })
  mocks.release.mockResolvedValue({
    data: {
      object: 'accounting-provider-adoption',
      connectionId: 'acpc_1',
      resourceType: 'customer',
      resourceId: 'cus_1',
      deleted: true,
    },
    error: null,
  })
})

describe('Billing accounting-provider same-origin routes', () => {
  it('returns 401 before touching the internal client when there is no Billing context', async () => {
    mocks.getContext.mockResolvedValue(null)

    const response = await POST(
      new Request('http://billing.test/api/accounting-providers/connections', {
        method: 'POST',
        body: JSON.stringify({ providerId: 'aprov_1', name: 'Primary' }),
      }),
      route(['connections'])
    )

    expect(response.status).toBe(401)
    expect(mocks.getAccountingProviderClient).not.toHaveBeenCalled()
  })

  it('requires settings read permission', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'owner',
      permissions: ['billing:access'],
    })

    const response = await POST(
      new Request('http://billing.test/api/accounting-providers/connections', {
        method: 'POST',
        body: JSON.stringify({ providerId: 'aprov_1', name: 'Primary' }),
      }),
      route(['connections'])
    )

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('allows only owner/admin mutations even when a member can read settings', async () => {
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      role: 'member',
      permissions: ['billing:access', 'settings:read'],
    })

    const response = await POST(
      new Request('http://billing.test/api/accounting-providers/connections', {
        method: 'POST',
        body: JSON.stringify({ providerId: 'aprov_1', name: 'Primary' }),
      }),
      route(['connections'])
    )

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a connection for the active organization with bounded inputs', async () => {
    const response = await POST(
      new Request('http://billing.test/api/accounting-providers/connections', {
        method: 'POST',
        body: JSON.stringify({
          providerId: 'aprov_zoho_books',
          name: ' Primary Zoho ',
          environment: 'live',
          mode: 'mirror',
        }),
      }),
      route(['connections'])
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({
      organizationId: 'org_123',
      providerId: 'aprov_zoho_books',
      name: 'Primary Zoho',
      environment: 'live',
      mode: 'mirror',
    })
  })

  it('starts OAuth through the server-only operator client', async () => {
    const response = await POST(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/authorize',
        { method: 'POST' }
      ),
      route(['connections', 'acpc_1', 'authorize'])
    )
    const payload = await body(response)

    expect(response.status).toBe(200)
    expect(mocks.authorize).toHaveBeenCalledWith({
      organizationId: 'org_123',
      connectionId: 'acpc_1',
    })
    expect(payload.error).toBeNull()
  })

  it('validates and reconciles only the active organization connection', async () => {
    await POST(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/validate',
        { method: 'POST' }
      ),
      route(['connections', 'acpc_1', 'validate'])
    )
    await POST(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/reconcile',
        { method: 'POST' }
      ),
      route(['connections', 'acpc_1', 'reconcile'])
    )

    const params = { organizationId: 'org_123', connectionId: 'acpc_1' }
    expect(mocks.validate).toHaveBeenCalledWith(params)
    expect(mocks.reconcile).toHaveBeenCalledWith(params)
  })

  it('adopts a provider customer into the active organization only', async () => {
    const response = await POST(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/imports/customer/adoptions',
        {
          method: 'POST',
          body: JSON.stringify({ resourceId: 'cus_1', externalId: 'zho_1' }),
        }
      ),
      route(['connections', 'acpc_1', 'imports', 'customer', 'adoptions'])
    )

    expect(response.status).toBe(201)
    expect(mocks.adopt).toHaveBeenCalledWith({
      organizationId: 'org_123',
      connectionId: 'acpc_1',
      resourceType: 'customer',
      resourceId: 'cus_1',
      externalId: 'zho_1',
    })
  })

  it('releases an adoption without deleting either resource', async () => {
    const response = await DELETE(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/imports/customer/adoptions/cus_1',
        { method: 'DELETE' }
      ),
      route([
        'connections',
        'acpc_1',
        'imports',
        'customer',
        'adoptions',
        'cus_1',
      ])
    )

    expect(response.status).toBe(200)
    expect(mocks.release).toHaveBeenCalledWith({
      organizationId: 'org_123',
      connectionId: 'acpc_1',
      resourceType: 'customer',
      resourceId: 'cus_1',
    })
  })

  it('rejects unsupported adoption resource types before the operator client', async () => {
    const response = await POST(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/imports/invoice/adoptions',
        {
          method: 'POST',
          body: JSON.stringify({ resourceId: 'inv_1', externalId: 'zho_1' }),
        }
      ),
      route(['connections', 'acpc_1', 'imports', 'invoice', 'adoptions'])
    )

    expect(response.status).toBe(404)
    expect(mocks.adopt).not.toHaveBeenCalled()
  })

  it('disables through DELETE without exposing internal credentials to the browser', async () => {
    const response = await DELETE(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1',
        { method: 'DELETE' }
      ),
      route(['connections', 'acpc_1'])
    )

    expect(response.status).toBe(200)
    expect(mocks.disable).toHaveBeenCalledWith({
      organizationId: 'org_123',
      connectionId: 'acpc_1',
    })
  })

  it('preserves provider error code/message in the same-origin envelope', async () => {
    mocks.validate.mockResolvedValue({
      data: null,
      error: {
        code: 'billing/provider-authorization-required',
        message: 'The accounting provider authorization must be renewed.',
      },
    })

    const response = await POST(
      new Request(
        'http://billing.test/api/accounting-providers/connections/acpc_1/validate',
        { method: 'POST' }
      ),
      route(['connections', 'acpc_1', 'validate'])
    )
    const payload = await body(response)

    expect(response.status).toBe(400)
    expect(payload.error).toEqual({
      code: 'billing/provider-authorization-required',
      message: 'The accounting provider authorization must be renewed.',
    })
  })
})
