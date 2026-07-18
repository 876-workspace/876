import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  cookieDelete: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPlatformClient: vi.fn(),
  getRoutingMemberships: vi.fn(),
  createOrganization: vi.fn(),
  replaceAnswers: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { POST } from './route'

const signedSession = {
  user: { id: 'user_123', email: 'owner@example.com' },
  accessToken: 'access_token',
}

function request(body: string | Record<string, unknown>) {
  return new Request(
    'http://couriers.test/api/manage/onboarding/organization',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  ) as never
}

describe('Couriers onboarding organization route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue(signedSession)
    mocks.isSignedSession.mockReturnValue(true)
    mocks.cookies.mockResolvedValue({ delete: mocks.cookieDelete })
    mocks.getPlatformClient.mockResolvedValue({
      auth: { getRoutingMemberships: mocks.getRoutingMemberships },
      orgs: { create: mocks.createOrganization },
      onboarding: { replaceAnswers: mocks.replaceAnswers },
    })
    mocks.getRoutingMemberships.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    mocks.createOrganization.mockResolvedValue({
      data: { id: 'organization_123' },
      error: null,
    })
    mocks.replaceAnswers.mockResolvedValue({ data: {}, error: null })
  })

  it('rejects unsigned sessions before parsing or platform calls', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const response = await POST(request('{invalid'))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toMatchObject({
      code: 'auth/no-session',
      message: 'Unauthorized.',
    })
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it.each([
    ['malformed JSON', '{invalid'],
    ['a missing name', { answers: {} }],
    ['a missing answers object', { name: 'Montego Couriers' }],
    [
      'unknown fields',
      { name: 'Montego Couriers', answers: {}, unexpected: true },
    ],
  ])('rejects %s without platform calls', async (_case, payload) => {
    const response = await POST(request(payload))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.message).toBe('Invalid onboarding organization.')
    expect(mocks.getPlatformClient).not.toHaveBeenCalled()
  })

  it('persists shared answers for an existing organization so interrupted onboarding can resume', async () => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: {
        data: [{ organization: { id: 'organization_existing' } }],
      },
      error: null,
    })

    const response = await POST(
      request({ name: 'Ignored Name', answers: { category: 'logistics' } })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      data: {
        object: 'onboarding_organization',
        organization_id: 'organization_existing',
      },
      error: null,
    })
    expect(mocks.createOrganization).not.toHaveBeenCalled()
    expect(mocks.replaceAnswers).toHaveBeenCalledWith(
      'organization_existing',
      'organization',
      'core',
      {
        countryCode: 'JM',
        answers: { category: 'logistics' },
      }
    )
  })

  it('fails safely when memberships cannot be checked', async () => {
    mocks.getRoutingMemberships.mockResolvedValue({
      data: null,
      error: { code: 'provider/unavailable', message: 'Provider unavailable' },
    })

    const response = await POST(
      request({ name: 'Montego Couriers', answers: {} })
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.message).toBe('Failed to verify workspace.')
    expect(mocks.createOrganization).not.toHaveBeenCalled()
  })

  it('creates the organization and persists the submitted answers', async () => {
    const answers = { business_category: 'logistics', fleet_size: 12 }

    const response = await POST(
      request({ name: '  Montego Couriers  ', answers })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual({
      object: 'onboarding_organization',
      organization_id: 'organization_123',
    })
    expect(mocks.createOrganization).toHaveBeenCalledWith({
      ownerUserId: 'user_123',
      name: 'Montego Couriers',
    })
    expect(mocks.replaceAnswers).toHaveBeenCalledWith(
      'organization_123',
      'organization',
      'core',
      {
        countryCode: 'JM',
        answers,
      }
    )
  })

  it('reuses the organization when answer persistence is retried after an interruption', async () => {
    const payload = {
      name: 'Montego Couriers',
      answers: { business_category: 'logistics' },
    }
    mocks.getRoutingMemberships
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          data: [{ organization: { id: 'organization_123' } }],
        },
        error: null,
      })
    mocks.replaceAnswers
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'provider/unavailable',
          message: 'Answer storage is temporarily unavailable.',
        },
      })
      .mockResolvedValueOnce({ data: {}, error: null })

    const interruptedResponse = await POST(request(payload))
    const retryResponse = await POST(request(payload))

    expect(interruptedResponse.status).toBe(500)
    expect(retryResponse.status).toBe(200)
    await expect(retryResponse.json()).resolves.toMatchObject({
      data: { organization_id: 'organization_123' },
    })
    expect(mocks.createOrganization).toHaveBeenCalledTimes(1)
    expect(mocks.replaceAnswers).toHaveBeenCalledTimes(2)
    expect(mocks.replaceAnswers).toHaveBeenLastCalledWith(
      'organization_123',
      'organization',
      'core',
      {
        countryCode: 'JM',
        answers: payload.answers,
      }
    )
  })

  it('invalidates a ghost session when its platform user no longer exists', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: { code: 'user/not-found', message: 'User does not exist' },
    })

    const response = await POST(
      request({ name: 'Montego Couriers', answers: {} })
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toEqual({
      code: 'auth/session-invalid',
      message: 'Your session is no longer valid. Please sign in again.',
    })
    expect(mocks.cookieDelete).toHaveBeenCalledWith('876-session')
    expect(mocks.replaceAnswers).not.toHaveBeenCalled()
  })

  it.each([
    'organization/duplicate-slug',
    'auth/organization-slug-taken',
    'organization/provider-conflict',
  ])('returns 409 and preserves the %s platform error', async (code) => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: { code, message: 'Organization is already in use.' },
    })

    const response = await POST(
      request({ name: 'Montego Couriers', answers: {} })
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toEqual({
      code,
      message: 'Organization is already in use.',
    })
    expect(mocks.replaceAnswers).not.toHaveBeenCalled()
  })

  it('returns 502 while preserving unexpected platform errors', async () => {
    mocks.createOrganization.mockResolvedValue({
      data: null,
      error: {
        code: 'provider/unavailable',
        message: 'Organization provider is unavailable.',
      },
    })

    const response = await POST(
      request({ name: 'Montego Couriers', answers: {} })
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toEqual({
      code: 'provider/unavailable',
      message: 'Organization provider is unavailable.',
    })
  })

  it('surfaces the real answer persistence error', async () => {
    mocks.replaceAnswers.mockResolvedValue({
      data: null,
      error: {
        code: 'onboarding/invalid-answers',
        message: 'Fleet size must be a positive number.',
      },
    })

    const response = await POST(
      request({
        name: 'Montego Couriers',
        answers: { fleet_size: -1 },
      })
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.message).toBe('Fleet size must be a positive number.')
  })
})
