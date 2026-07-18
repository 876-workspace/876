import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPlatformClient: vi.fn(),
  getRoutingMemberships: vi.fn(),
  setCookie: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: mocks.setCookie }),
}))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

type MembershipFixture = {
  id: string
  role: string
  status: string
  organization: {
    id: string
    name: string
    slug: string
    status: string
  }
}

function createMembership(
  overrides: Partial<MembershipFixture> = {}
): MembershipFixture {
  return {
    id: 'membership_island_123',
    role: 'owner',
    status: 'active',
    organization: {
      id: 'org_island_123',
      name: 'Island Commerce',
      slug: 'island-commerce',
      status: 'active',
    },
    ...overrides,
  }
}

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/switch-org', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createRawRequest(body: string): Request {
  return new Request('http://localhost/api/auth/switch-org', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

const BAD_REQUEST_ENVELOPE = {
  data: null,
  error: {
    code: 'error/bad-request',
    message: 'Enter a valid organization identifier.',
  },
}

const FORBIDDEN_ENVELOPE = {
  data: null,
  error: {
    code: 'auth/forbidden',
    message: 'Organization access is not permitted.',
  },
}

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const

describe('POST /api/auth/switch-org', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_althea_123', email: 'althea@island.test' },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPlatformClient.mockResolvedValue({
      auth: { getRoutingMemberships: mocks.getRoutingMemberships },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [createMembership()] },
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a 400 envelope for malformed JSON without loading auth state', async () => {
    const response = await POST(createRawRequest('{"organizationId":'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(BAD_REQUEST_ENVELOPE)
    expect(mocks.getAuthSession).not.toHaveBeenCalled()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.getRoutingMemberships).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it.each([
    ['an empty object', {}],
    ['a null body', null],
    ['a missing organization identifier', { organizationId: undefined }],
    ['an empty organization identifier', { organizationId: '' }],
    ['a whitespace organization identifier', { organizationId: '   ' }],
    ['a numeric organization identifier', { organizationId: 123 }],
    ['a null organization identifier', { organizationId: null }],
    ['a boolean organization identifier', { organizationId: true }],
    ['an object organization identifier', { organizationId: {} }],
    ['an array organization identifier', { organizationId: [] }],
  ])('returns a 400 envelope for %s', async (_name, body) => {
    const response = await POST(createRequest(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(BAD_REQUEST_ENVELOPE)
    expect(mocks.getAuthSession).not.toHaveBeenCalled()
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.getRoutingMemberships).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it.each(SECURITY_INPUTS)(
    'never authorizes security input %# or sets a cookie',
    async (organizationId) => {
      const response = await POST(createRequest({ organizationId }))

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual(FORBIDDEN_ENVELOPE)
      expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
      expect(mocks.getPlatformClient).toHaveBeenCalledTimes(1)
      expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
      expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
        userId: 'user_althea_123',
        status: 'active',
      })
      expect(mocks.setCookie).not.toHaveBeenCalled()
    }
  )

  it('returns the exact 401 envelope for an unsigned request without loading the platform client', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const response = await POST(
      createRequest({ organizationId: 'org_island_123' })
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'auth/unauthorized',
        message: 'Authentication is required.',
      },
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
    expect(mocks.getRoutingMemberships).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it('returns 403 when routing memberships cannot be fetched', async () => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: null,
      error: {
        code: 'platform/unavailable',
        message: 'Membership routing is temporarily unavailable.',
      },
    })

    const response = await POST(
      createRequest({ organizationId: 'org_island_123' })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual(FORBIDDEN_ENVELOPE)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
      userId: 'user_althea_123',
      status: 'active',
    })
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it.each([
    [
      'the organization is absent from memberships',
      [
        createMembership({
          organization: {
            id: 'org_montego_456',
            name: 'Montego Commerce',
            slug: 'montego-commerce',
            status: 'active',
          },
        }),
      ],
    ],
    [
      'the matching membership is inactive',
      [createMembership({ status: 'inactive' })],
    ],
    [
      'the matching organization is inactive',
      [
        createMembership({
          organization: {
            id: 'org_island_123',
            name: 'Island Commerce',
            slug: 'island-commerce',
            status: 'inactive',
          },
        }),
      ],
    ],
  ])('returns the same 403 envelope when %s', async (_name, memberships) => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: memberships },
      error: null,
    })

    const response = await POST(
      createRequest({ organizationId: 'org_island_123' })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual(FORBIDDEN_ENVELOPE)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
    expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
      userId: 'user_althea_123',
      status: 'active',
    })
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it.each([
    ['development', false],
    ['production', true],
  ] as const)(
    'sets the validated cookie and returns success in %s',
    async (nodeEnv, secure) => {
      vi.stubEnv('NODE_ENV', nodeEnv)

      const response = await POST(
        createRequest({ organizationId: 'org_island_123' })
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ data: { ok: true }, error: null })
      expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
      expect(mocks.getPlatformClient).toHaveBeenCalledTimes(1)
      expect(mocks.getRoutingMemberships).toHaveBeenCalledTimes(1)
      expect(mocks.getRoutingMemberships).toHaveBeenCalledWith({
        userId: 'user_althea_123',
        status: 'active',
      })
      expect(mocks.setCookie).toHaveBeenCalledTimes(1)
      expect(mocks.setCookie).toHaveBeenCalledWith(
        'billing_active_org',
        'org_island_123',
        {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure,
          maxAge: 31_536_000,
        }
      )
    }
  )
})
