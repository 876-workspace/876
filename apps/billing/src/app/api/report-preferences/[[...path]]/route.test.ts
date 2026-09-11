import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  proxyRequest: vi.fn(async () => new Response(null, { status: 200 })),
  getAuthSession: vi.fn(),
  getContext: vi.fn(),
  cookieGet: vi.fn(),
}))

vi.mock('@876/billing/proxy', () => ({
  proxy876BillingRequest: mocks.proxyRequest,
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: unknown) => session !== null,
}))

vi.mock('@/lib/auth/billing-context', () => ({ getContext: mocks.getContext }))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
  headers: async () => new Headers(),
}))

const { GET, PATCH } = await import('./route')

describe('/api/report-preferences/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_1', orgId: 'org_123' },
      accessToken: 'token_123',
    })
    mocks.cookieGet.mockReturnValue(undefined)
    mocks.getContext.mockResolvedValue({ permissions: ['sales:write'] })
  })

  it('authorizes a signed session then forwards the read once', async () => {
    // ARRANGE
    const request = new Request('http://billing.test/api/report-preferences')

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['report-preferences'],
      expect.objectContaining({
        accessToken: 'token_123',
        organizationId: 'org_123',
      })
    )
    expect(response.status).toBe(200)

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('authorizes a signed session then forwards the update once', async () => {
    // ARRANGE
    const request = new Request('http://billing.test/api/report-preferences', {
      method: 'PATCH',
      body: JSON.stringify({ timezone: 'America/Jamaica' }),
    })

    // ACT
    await PATCH(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['report-preferences'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://billing.test/api/report-preferences')

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an update without sales write permission', async () => {
    // ARRANGE
    mocks.getContext.mockResolvedValue({ permissions: [] })
    const request = new Request('http://billing.test/api/report-preferences', {
      method: 'PATCH',
    })

    // ACT
    const response = await PATCH(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(response.status).toBe(403)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()
  })
})
