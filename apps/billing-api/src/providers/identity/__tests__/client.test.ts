import { resetSettingsForTest } from '@/config'

import { HttpIdentityGateway } from '../client'
import { IdentityUnavailableError } from '../types'

const fetchMock = vi.fn()

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function envelope(data: unknown): Response {
  return jsonResponse({ data, error: null })
}

function membershipList(data: unknown[]): Response {
  return envelope({
    object: 'list',
    data,
    has_more: false,
    url: '/users/me/memberships',
    total_count: data.length,
  })
}

function membership(options?: {
  id?: string
  organizationId?: string
  organizationStatus?: string
  role?: string
  status?: string
}) {
  return {
    id: options?.id ?? 'om_123',
    role: options?.role ?? 'super_admin',
    status: options?.status ?? 'active',
    permissions: [],
    organization: {
      id: options?.organizationId ?? 'org_123',
      name: 'Test Org',
      slug: 'test-org',
      status: options?.organizationStatus ?? 'active',
      logo_url: null,
    },
  }
}

function activeToken() {
  return {
    active: true,
    sub: 'user_123',
    app_id: 'app_123',
    scope: 'billing.customers.write billing.items.read',
  }
}

function expectUnavailable(
  error: unknown,
  expected: Partial<IdentityUnavailableError>
): void {
  expect(error).toBeInstanceOf(IdentityUnavailableError)
  expect(error).toMatchObject(expected)
}

describe('HttpIdentityGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    process.env.API_URL = 'https://identity.test'
    process.env.BILLING_API_876_KEY = 'resource-server-key'
    process.env.BILLING_API_KEY = ''
    process.env.API_876_KEY = ''
    process.env.IDENTITY_API_TIMEOUT_SECONDS = '1'
    resetSettingsForTest(process.env)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the canonical super admin organization role from a successful list', async () => {
    fetchMock.mockResolvedValueOnce(membershipList([membership()]))

    const result = await new HttpIdentityGateway().organizationMembership(
      'access-token',
      'org_123'
    )

    expect(result).toEqual({ role: 'super-admin' })
  })

  it('preserves admin and normalizes every other organization role to member', async () => {
    fetchMock
      .mockResolvedValueOnce(membershipList([membership({ role: 'admin' })]))
      .mockResolvedValueOnce(membershipList([membership({ role: 'billing' })]))
    const gateway = new HttpIdentityGateway()

    await expect(
      gateway.organizationMembership('access-token', 'org_123')
    ).resolves.toEqual({ role: 'admin' })
    await expect(
      gateway.organizationMembership('access-token', 'org_123')
    ).resolves.toEqual({ role: 'staff' })
  })

  it('returns null only after a valid response proves no active membership exists', async () => {
    fetchMock
      .mockResolvedValueOnce(membershipList([]))
      .mockResolvedValueOnce(
        membershipList([membership({ organizationId: 'org_other' })])
      )
      .mockResolvedValueOnce(
        membershipList([membership({ organizationStatus: 'deleted' })])
      )
    const gateway = new HttpIdentityGateway()

    await expect(
      gateway.organizationMembership('access-token', 'org_123')
    ).resolves.toBeNull()
    await expect(
      gateway.organizationMembership('access-token', 'org_123')
    ).resolves.toBeNull()
    await expect(
      gateway.organizationMembership('access-token', 'org_123')
    ).resolves.toBeNull()
  })

  it('treats a malformed membership list as unavailable instead of no access', async () => {
    fetchMock.mockResolvedValueOnce(envelope({ object: 'list', data: null }))

    await expect(
      new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
    ).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      reason: 'invalid-response',
    })
  })

  it('treats malformed membership rows as unavailable instead of skipping into a false denial', async () => {
    fetchMock.mockResolvedValueOnce(
      membershipList([{ id: 'om_bad', role: 'super_admin', organization: null }])
    )

    await expect(
      new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
    ).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      reason: 'invalid-response',
    })
  })

  it('retries one network failure and succeeds without changing authorization semantics', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('socket reset'))
      .mockResolvedValueOnce(membershipList([membership()]))

    await expect(
      new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
    ).resolves.toEqual({ role: 'super-admin' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([408, 425, 429, 500, 502, 503, 504])(
    'retries retryable upstream status %s exactly once',
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ error: 'temporary' }, status))
        .mockResolvedValueOnce(membershipList([membership()]))

      await expect(
        new HttpIdentityGateway().organizationMembership(
          'access-token',
          'org_123'
        )
      ).resolves.toEqual({ role: 'super-admin' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    }
  )

  it('reports retry exhaustion as identity unavailable instead of organization forbidden', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'down' }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: 'still down' }, 503))

    try {
      await new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
      throw new Error('expected organizationMembership to reject')
    } catch (error) {
      expectUnavailable(error, {
        attempts: 2,
        reason: 'upstream',
        status: 503,
      })
    }
  })

  it('reports repeated timeout failures as identity unavailable', async () => {
    const timeout = Object.assign(new Error('timed out'), {
      name: 'TimeoutError',
    })
    fetchMock.mockRejectedValueOnce(timeout).mockRejectedValueOnce(timeout)

    try {
      await new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
      throw new Error('expected organizationMembership to reject')
    } catch (error) {
      expectUnavailable(error, { attempts: 2, reason: 'timeout' })
    }
  })

  it('does not reinterpret a non-retryable membership endpoint rejection as no membership', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rejected' }, 401))

    try {
      await new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
      throw new Error('expected organizationMembership to reject')
    } catch (error) {
      expectUnavailable(error, {
        attempts: 1,
        reason: 'upstream',
        status: 401,
      })
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails as unavailable when the resource-server credential is missing', async () => {
    process.env.BILLING_API_876_KEY = ''
    resetSettingsForTest(process.env)

    try {
      await new HttpIdentityGateway().organizationMembership(
        'access-token',
        'org_123'
      )
      throw new Error('expected organizationMembership to reject')
    } catch (error) {
      expectUnavailable(error, { attempts: 0, reason: 'configuration' })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps an authoritative inactive introspection result as invalid-token data', async () => {
    fetchMock.mockResolvedValueOnce(envelope({ active: false }))

    await expect(
      new HttpIdentityGateway().introspect('expired-token')
    ).resolves.toEqual({
      active: false,
      subject: null,
      appId: null,
      scopes: new Set(),
    })
  })

  it('does not turn malformed introspection into an invalid token', async () => {
    fetchMock.mockResolvedValueOnce(envelope({ active: true, sub: null }))

    await expect(
      new HttpIdentityGateway().introspect('access-token')
    ).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      reason: 'invalid-response',
    })
  })

  it('retries a transient introspection outage and preserves scopes', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'down' }, 502))
      .mockResolvedValueOnce(envelope(activeToken()))

    await expect(
      new HttpIdentityGateway().introspect('access-token')
    ).resolves.toEqual({
      active: true,
      subject: 'user_123',
      appId: 'app_123',
      scopes: new Set(['billing.customers.write', 'billing.items.read']),
    })
  })

  it('returns null for an authoritatively rejected app API key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid key' }, 401))

    await expect(
      new HttpIdentityGateway().appForApiKey('bad-key')
    ).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not turn an app-key identity outage into invalid-api-key', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'down' }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: 'still down' }, 500))

    await expect(
      new HttpIdentityGateway().appForApiKey('valid-looking-key')
    ).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      attempts: 2,
      reason: 'upstream',
      status: 500,
    })
  })

  it('rejects a successful app-key response without an app id as invalid upstream data', async () => {
    fetchMock.mockResolvedValueOnce(envelope({ object: 'app' }))

    await expect(
      new HttpIdentityGateway().appForApiKey('valid-looking-key')
    ).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      reason: 'invalid-response',
    })
  })

  it('retries malformed JSON once, then surfaces invalid-response', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('not-json', { status: 200 }))
      .mockResolvedValueOnce(new Response('still-not-json', { status: 200 }))

    await expect(
      new HttpIdentityGateway().introspect('access-token')
    ).rejects.toMatchObject({
      name: 'IdentityUnavailableError',
      attempts: 2,
      reason: 'invalid-response',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
