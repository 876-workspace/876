import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAuthSession, mockGetPlatformClient, mockPlatform } = vi.hoisted(
  () => {
    const platform = {
      memberships: { listRouting: vi.fn() },
      organizations: { create: vi.fn() },
      subscriptions: { create: vi.fn(), retrieve: vi.fn() },
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

vi.mock('@/lib/services/platform', () => ({
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

function membershipsFor(organizationId: string | null, role = 'super-admin') {
  return {
    data: {
      data: organizationId
        ? [
            {
              id: 'mem_2kL9',
              role,
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
        creatorUserId: 'user_2kL9mN4q',
        name: 'Acme Trading Ltd',
      })
      // Activation is asserted to require embedded finance so a misconfigured
      // Invoice profile fails closed instead of shipping without a workspace.
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
        'org_7pQ2',
        { appSlug: '876-invoice', requireFinance: 'embedded' }
      )
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledTimes(1)
    })

    it('re-runs activation even when a default bootstrap subscription is already active (self-heal)', async () => {
      // Regression: an active subscription used to short-circuit activation, so
      // an org whose Billing tenant was never opened stayed stuck in
      // `billing/tenant-not-found`. Activation must run every time — the API is
      // idempotent and re-runs finance readiness, repairing the missing tenant.
      mockPlatform.subscriptions.create.mockResolvedValue({
        data: { id: 'sub_default', status: 'active' },
        error: null,
      })

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
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
        'org_7pQ2',
        { appSlug: '876-invoice', requireFinance: 'embedded' }
      )
      // The bypass is gone: the retrieve-then-skip path must not exist.
      expect(mockPlatform.subscriptions.retrieve).not.toHaveBeenCalled()
    })

    it('trims the submitted organization name', async () => {
      await POST(createRequest({ name: '  Acme Trading Ltd  ' }))

      expect(mockPlatform.organizations.create).toHaveBeenCalledWith({
        creatorUserId: 'user_2kL9mN4q',
        name: 'Acme Trading Ltd',
      })
    })

    it('activates Invoice for an existing organization without a name', async () => {
      mockPlatform.memberships.listRouting.mockResolvedValue(
        membershipsFor('org_existing')
      )

      const response = await POST(createRequest({}))

      expect(response.status).toBe(200)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
        'org_existing',
        { appSlug: '876-invoice', requireFinance: 'embedded' }
      )
    })

    it('re-runs activation for an existing org whose Invoice subscription is already active (no bypass)', async () => {
      mockPlatform.memberships.listRouting.mockResolvedValue(
        membershipsFor('org_existing')
      )
      mockPlatform.subscriptions.create.mockResolvedValue({
        data: { id: 'sub_already_active', status: 'active' },
        error: null,
      })

      const response = await POST(createRequest({}))

      expect(response.status).toBe(200)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
      // An already-active subscription must NOT short-circuit readiness.
      expect(mockPlatform.subscriptions.create).toHaveBeenCalledWith(
        'org_existing',
        { appSlug: '876-invoice', requireFinance: 'embedded' }
      )
      expect(mockPlatform.subscriptions.retrieve).not.toHaveBeenCalled()
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
        { appSlug: '876-invoice', requireFinance: 'embedded' }
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
        createRequest({ name: 'Acme Trading Ltd', creatorUserId: 'user_other' })
      )

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
    })
  })

  describe('authorization', () => {
    it('refuses to add Invoice when the viewer is only a member', async () => {
      mockPlatform.memberships.listRouting.mockResolvedValue(
        membershipsFor('org_existing', 'member')
      )

      const response = await POST(createRequest({}))

      expect(response.status).toBe(403)
      expect(mockPlatform.subscriptions.create).not.toHaveBeenCalled()
    })

    it('requires a name when the account has no organization yet', async () => {
      const response = await POST(createRequest({}))

      expect(response.status).toBe(422)
      expect(mockPlatform.organizations.create).not.toHaveBeenCalled()
      expect(mockPlatform.subscriptions.create).not.toHaveBeenCalled()
    })

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
        creatorUserId: 'user_session',
        name: 'Acme Trading Ltd',
      })
    })
  })

  describe('error handling', () => {
    it('returns 503 when memberships cannot be resolved', async () => {
      mockPlatform.memberships.listRouting.mockResolvedValue({
        data: null,
        error: { code: 'platform/unreachable', message: 'Unreachable.' },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(503)
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

    it('returns 503 with informative message when finance workspace is unavailable', async () => {
      mockPlatform.subscriptions.create.mockResolvedValue({
        data: null,
        error: {
          code: 'provisioning/finance-workspace-unavailable',
          message: 'Billing unavailable.',
        },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({
        data: null,
        error: {
          code: 'provisioning/finance-workspace-unavailable',
          message:
            'Your organization was created, but 876 could not finish setting up its Billing workspace. Try again in a moment; if it keeps failing, contact support.',
        },
      })
    })

    it('returns 503 when provisioning configuration is missing', async () => {
      mockPlatform.subscriptions.create.mockResolvedValue({
        data: null,
        error: {
          code: 'provisioning/finance-dependency-missing',
          message: 'Profile declares no finance dependency.',
        },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({
        data: null,
        error: {
          code: 'provisioning/finance-dependency-missing',
          message:
            '876 Invoice is temporarily unavailable because its provisioning configuration is incomplete.',
        },
      })
    })

    it('returns 502 when the subscription fails with other errors', async () => {
      mockPlatform.subscriptions.create.mockResolvedValue({
        data: null,
        error: { code: 'subscription/failed', message: 'Failed.' },
      })

      const response = await POST(createRequest({ name: 'Acme Trading Ltd' }))

      expect(response.status).toBe(502)
    })
  })
})
