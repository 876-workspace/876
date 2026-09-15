import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  proxyRequest: vi.fn(async () => new Response(null, { status: 200 })),
  getAuthSession: vi.fn(),
  cookieGet: vi.fn(),
}))

vi.mock('@876/billing/proxy', () => ({
  proxy876BillingRequest: mocks.proxyRequest,
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: unknown) => session !== null,
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
  headers: async () => new Headers(),
}))

const { GET, PATCH } = await import('./route')

describe('/api/branding/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_1', orgId: 'org_123' },
      accessToken: 'token_123',
    })
    mocks.cookieGet.mockReturnValue(undefined)
  })

  it('authorizes a signed session then forwards the branding read once', async () => {
    // ARRANGE
    const request = new Request('http://billing.test/api/branding')

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['branding'],
      expect.objectContaining({
        accessToken: 'token_123',
        organizationId: 'org_123',
      })
    )
    expect(response.status).toBe(200)

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a branding update with the exact resource path', async () => {
    // ARRANGE
    const request = new Request('http://billing.test/api/branding', {
      method: 'PATCH',
      body: JSON.stringify({ appearance: 'dark' }),
    })

    // ACT
    await PATCH(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['branding'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('prefers the active organization cookie over the session organization', async () => {
    // ARRANGE
    mocks.cookieGet.mockReturnValue({ value: 'org_cookie' })
    const request = new Request('http://billing.test/api/branding')

    // ACT
    await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['branding'],
      expect.objectContaining({ organizationId: 'org_cookie' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://billing.test/api/branding')

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned update before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://billing.test/api/branding', {
      method: 'PATCH',
      body: JSON.stringify({ appearance: 'dark' }),
    })

    // ACT
    const response = await PATCH(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
