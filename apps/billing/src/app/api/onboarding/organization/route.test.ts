import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  cookieDelete: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPlatformClient: vi.fn(),
  listRouting: vi.fn(),
  createOrganization: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { POST } from './route'

const signedSession = {
  user: { id: 'user_123', email: 'owner@example.com' },
  accessToken: 'access_token',
}

function request(body: string | Record<string, unknown>) {
  return new Request('http://billing.test/api/onboarding/organization', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

describe('Billing onboarding organization route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue(signedSession)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.cookies.mockResolvedValue({ delete: mocks.cookieDelete })
    mocks.getPlatformClient.mockResolvedValue({
      memberships: { listRouting: mocks.listRouting },
      organizations: { create: mocks.createOrganization },
    })
    mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })
    mocks.createOrganization.mockResolvedValue({
      data: { id: 'organization_123' },
      error: null,
    })
  })

  it('rejects an unsigned session before parsing or platform calls', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const response = await POST(request('{invalid'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'Sign in to continue.' },
    })
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it.each([
    ['malformed JSON', '{invalid'],
    ['a missing name', {}],
    ['a blank name', { name: '   ', currency_code: 'JMD', language: 'en' }],
    [
      'unknown fields',
      {
        name: 'Kingston Traders',
        currency_code: 'JMD',
        language: 'en',
        extra: true,
      },
    ],
    ['a missing currency', { name: 'Kingston Traders', language: 'en' }],
    [
      'a malformed currency',
      { name: 'Kingston Traders', currency_code: 'JM', language: 'en' },
    ],
    ['a missing language', { name: 'Kingston Traders', currency_code: 'JMD' }],
  ])('rejects %s without platform calls', async (_case, payload) => {
    const response = await POST(request(payload))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid organization details.')
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it('creates the organization for an account with no membership', async () => {
    const response = await POST(
      request({
        name: '  Kingston Traders  ',
        currency_code: 'usd',
        language: 'en',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      data: {
        object: 'onboarding_organization',
        organization_id: 'organization_123',
      },
      error: null,
    })
    expect(mocks.createOrganization).toHaveBeenCalledTimes(1)
    expect(mocks.createOrganization).toHaveBeenCalledWith({
      creatorUserId: 'user_123',
      name: 'Kingston Traders',
      currencyCode: 'USD',
      language: 'en',
    })
  })

  it('is idempotent: returns the existing org without creating a second', async () => {
    mocks.listRouting.mockResolvedValue({
      data: { data: [{ organization: { id: 'organization_existing' } }] },
      error: null,
    })

    const response = await POST(
      request({
        name: 'Kingston Traders',
        currency_code: 'JMD',
        language: 'en',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.organization_id).toBe('organization_existing')
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it('returns 500 when membership lookup fails, without creating an org', async () => {
    mocks.listRouting.mockResolvedValue({
      data: null,
      error: { code: 'error/unknown', message: 'boom' },
    })

    const response = await POST(
      request({
        name: 'Kingston Traders',
        currency_code: 'JMD',
        language: 'en',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.message).toBe('Failed to verify your account.')
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it('clears the session and signals re-auth when the owner no longer exists', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: { code: 'user/not-found', message: 'gone' },
    })

    const response = await POST(
      request({
        name: 'Kingston Traders',
        currency_code: 'JMD',
        language: 'en',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('auth/session-invalid')
    expect(mocks.cookieDelete).toHaveBeenCalledTimes(1)
  })

  it('maps a duplicate-slug conflict to 409 and preserves the code', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: {
        code: 'organization/duplicate-slug',
        message: 'Slug already taken.',
      },
    })

    const response = await POST(
      request({
        name: 'Kingston Traders',
        currency_code: 'JMD',
        language: 'en',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toEqual({
      code: 'organization/duplicate-slug',
      message: 'Slug already taken.',
    })
    expect(mocks.cookieDelete).not.toHaveBeenCalled()
  })

  it('maps an unexpected platform error to 502', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: { code: 'provider/error', message: 'upstream down' },
    })

    const response = await POST(
      request({
        name: 'Kingston Traders',
        currency_code: 'JMD',
        language: 'en',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error.code).toBe('provider/error')
  })
})
