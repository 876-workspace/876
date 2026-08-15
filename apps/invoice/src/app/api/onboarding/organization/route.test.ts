import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAuthSession, mockGetPlatformClient, mockPlatform } = vi.hoisted(
  () => {
    const platform = {
      memberships: { listRouting: vi.fn() },
      organizations: { create: vi.fn() },
      subscriptions: { create: vi.fn() },
    }
    return {
      mockPlatform: platform,
      mockGetAuthSession: vi.fn(),
      mockGetPlatformClient: vi.fn(async () => platform),
    }
  }
)

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mockGetAuthSession,
  isSignedSession: (session: { user: unknown }) => session.user !== null,
}))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mockGetPlatformClient,
}))

const { POST } = await import('./route')

function createRequest(body: unknown) {
  return new Request('http://localhost:3006/api/onboarding/organization', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function membershipsFor(organizationId: string | null) {
  return {
    data: {
      data: organizationId
        ? [
            {
              id: 'mem_2kL9',
              role: 'owner',
              status: 'active',
              permissions: [],
              organization: {
                id: organizationId,
                name: 'Acme Trading Ltd',
                slug: 'acme-trading',
                status: 'active',
                logo_url: null,
              },
            },
          ]
        : [],
    },
    error: null,
  }
}

beforeEach(() => {
  mockGetAuthSession.mockResolvedValue({
    user: { id: 'user_2kL9mN4q', email: 'alejandra@example.com' },
    accessToken: 'at_live',
  })
  mockPlatform.memberships.listRouting.mockResolvedValue(membershipsFor(null))
  mockPlatform.organizations.create.mockResolvedValue({
    data: { id: 'org_7pQ2', name: 'Acme Trading Ltd' },
    error: null,
  })
  mockPlatform.subscriptions.create.mockResolvedValue({
    data: { id: 'sub_9xZ1', status: 'active' },
    error: null,
  })
})

describe('POST /api/onboarding/organization', () => {
  describe('happy path', () => {
    it('creates the organization and activates the Invoice subscription', async () => {
      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        data: {
          object: 'onboarding_completion',
          organization_id: 'org_7pQ2',
          access_status: 'active',
        },
        error: null,
      })
      expect(mockPlatform.organizations.create).toHaveBeenCalledWith({
        ownerUserId: 'user_2kL9mN4q',
        name: 'Acme Trading Ltd',
      })
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
        'org_7pQ2',
        { appSlug: '876-invoice' }
      )
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledTimes(1)
    })

    it('trims the submitted organization name', async () => {
      await POST(createRequest({ name: '  Acme Trading Ltd  ' }))

      expect(mockPlatform.organizations.create).toHaveBeenCalledWith({
        ownerUserId: 'user_2kL9mN4q',
        name: 'Acme Trading Ltd',
      })
    })

    it('reuses an existing organization instead of creating a second one', async () => {
      mockPlatform.memberships.listRouting.mockResolvedValue(
        membershipsFor('org_existing')
      )

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(200)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
        'org_existing',
        { appSlug: '876-invoice' }
      )
    })
  })

  describe('invalid input', () => {
    it('rejects a missing name without calling the platform', async () => {
      const response = await POST(createRequest({}))

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
      expect(mockPlatform.subscriptions.create).not.toHaveBeenCalled()
    })

    it('rejects a malformed JSON body instead of throwing', async () => {
      const request = new Request(
        'http://localhost:3006/api/onboarding/organization',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{ not json',
        }
      ) as unknown as Parameters<typeof POST>[0]

      const response = await POST(request)

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })

    it('rejects a whitespace-only name', async () => {
      const response = await POST(createRequest({ name: '   ' }))

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })

    it('rejects a name beyond the maximum length', async () => {
      const response = await POST(createRequest({ name: 'a'.repeat(121) }))

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })

    it('rejects unknown fields so a client cannot smuggle an owner', async () => {
      const response = await POST(
        createRequest({ name: 'Acme Trading Ltd', ownerUserId: 'user_other' })
      )

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })
  })

  describe('authorization', () => {
    it('rejects an unauthenticated request without reading memberships', async () => {
      mockGetAuthSession.mockResolvedValue({ user: null })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(401)
      expect(mockPlatform.memberships.listRouting).not.toHaveBeenCalled()
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })

    it('takes the owner from the session, never from the request body', async () => {
      mockGetAuthSession.mockResolvedValue({
        user: { id: 'user_session', email: 'alejandra@example.com' },
        accessToken: 'at_live',
      })

      await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(mockPlatform.organizations.create).toHaveBeenCalledWith({
        ownerUserId: 'user_session',
        name: 'Acme Trading Ltd',
      })
    })
  })

  describe('error handling', () => {
    it('returns 500 when memberships cannot be resolved', async () => {
      mockPlatform.memberships.listRouting.mockResolvedValue({
        data: null,
        error: { code: 'platform/unreachable', message: 'Unreachable.' },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(500)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })

    it('maps a taken slug to 409 so the caller can rename', async () => {
      mockPlatform.organizations.create.mockResolvedValue({
        data: null,
        error: {
          code: 'organization/slug-taken',
          message: 'That name is already in use.',
        },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(409)
      expect(mockPlatform.subscriptions.create).not.toHaveBeenCalled()
    })

    it('maps any other creation failure to 502', async () => {
      mockPlatform.organizations.create.mockResolvedValue({
        data: null,
        error: { code: 'organization/invalid', message: 'Invalid.' },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(502)
      expect(mockPlatform.subscriptions.create).not.toHaveBeenCalled()
    })

    it('returns 502 when the subscription cannot be activated', async () => {
      mockPlatform.subscriptions.create.mockResolvedValue({
        data: null,
        error: { code: 'subscription/failed', message: 'Failed.' },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(502)
    })
  })
})
