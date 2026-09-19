import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCommerceSession, mockGetPlatformClient, mockPlatform } =
  vi.hoisted(() => {
    const platform = {
      memberships: { listRouting: vi.fn() },
      organizations: { create: vi.fn() },
      subscriptions: { create: vi.fn() },
    }
    return {
      mockGetCommerceSession: vi.fn(),
      mockGetPlatformClient: vi.fn(async () => platform),
      mockPlatform: platform,
    }
  })

vi.mock('@/lib/auth/session', () => ({
  getCommerceSession: mockGetCommerceSession,
}))
vi.mock('@/lib/clients/platform', () => ({
  getPlatformClient: mockGetPlatformClient,
}))

const { POST } = await import('./route')

function createRequest(body: unknown) {
  return new Request('http://localhost:3009/api/onboarding/organization', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function membershipsFor(organizationId: string | null, role = 'super-admin') {
  return {
    data: {
      data: organizationId
        ? [
            {
              id: 'mem_2kL9',
              role,
              status: 'active',
              organization: {
                id: organizationId,
                name: 'Acme Trading Ltd',
                slug: 'acme-trading',
                status: 'active',
              },
            },
          ]
        : [],
    },
    error: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCommerceSession.mockResolvedValue({
    userId: 'user_session',
    orgId: null,
    accessToken: 'at_live',
    realm: 'enterprise',
    crossRealm: false,
  })
  mockPlatform.memberships.listRouting.mockResolvedValue(membershipsFor(null))
  mockPlatform.organizations.create.mockResolvedValue({
    data: { id: 'org_created' },
    error: null,
  })
  mockPlatform.subscriptions.create.mockResolvedValue({
    data: { id: 'sub_active', status: 'active' },
    error: null,
  })
})

describe('POST /api/onboarding/organization', () => {
  it('returns 401 for an unauthenticated request', async () => {
    mockGetCommerceSession.mockResolvedValue(null)

    const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

    expect(response.status).toBe(401)
    expect(mockPlatform.memberships.listRouting).not.toHaveBeenCalled()
  })

  it('refuses a consumer-realm session before it can create an organization', async () => {
    mockGetCommerceSession.mockResolvedValue({
      userId: 'user_consumer',
      orgId: null,
      accessToken: 'at_live',
      realm: 'consumer',
      crossRealm: false,
    })

    const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

    expect(response.status).toBe(403)
    expect(mockPlatform.memberships.listRouting).not.toHaveBeenCalled()
  })

  it('uses the session user as creator even when the body supplies another id', async () => {
    const response = await POST(
      createRequest({ name: 'Acme Trading Ltd', creatorUserId: 'user_other' })
    )

    expect(response.status).toBe(200)
    expect(mockPlatform.organizations.create).toHaveBeenCalledWith({
      creatorUserId: 'user_session',
      name: 'Acme Trading Ltd',
    })
  })

  it('creates an organization then activates Commerce', async () => {
    const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

    await expect(response.json()).resolves.toEqual({
      data: {
        object: 'onboarding_completion',
        organization_id: 'org_created',
        access_status: 'active',
      },
      error: null,
    })
    expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
      'org_created',
      { appSlug: '876-commerce' }
    )
  })

  it('activates an existing organization without creating another', async () => {
    mockPlatform.memberships.listRouting.mockResolvedValue(
      membershipsFor('org_existing', 'admin')
    )

    const response = await POST(createRequest({}))

    expect(response.status).toBe(200)
    expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
      'org_existing',
      { appSlug: '876-commerce' }
    )
  })

  it('is idempotent when Commerce is already active', async () => {
    mockPlatform.memberships.listRouting.mockResolvedValue(
      membershipsFor('org_existing')
    )

    const response = await POST(createRequest({}))

    expect(response.status).toBe(200)
    expect(mockPlatform.subscriptions.create).toHaveBeenCalledTimes(1)
  })

  it('denies a staff member from activating Commerce', async () => {
    mockPlatform.memberships.listRouting.mockResolvedValue(
      membershipsFor('org_existing', 'staff')
    )

    const response = await POST(createRequest({}))

    expect(response.status).toBe(403)
    expect(mockPlatform.subscriptions.create).not.toHaveBeenCalled()
  })

  it('returns the platform organization failure as an error value', async () => {
    mockPlatform.organizations.create.mockResolvedValue({
      data: null,
      error: { code: 'organization/slug-taken', message: 'Name is taken.' },
    })

    const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: 'error/conflict', message: 'Name is taken.' },
    })
  })

  it('returns an activation failure as an error value', async () => {
    mockPlatform.subscriptions.create.mockResolvedValue({
      data: null,
      error: { code: 'subscription/unavailable', message: 'Try later.' },
    })

    const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: { code: 'provider/error', message: 'Try later.' },
    })
  })
})
