import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  proxyRequest: vi.fn(async () => new Response(null, { status: 204 })),
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

const { GET, POST } = await import('./route')

describe('/api/recurring-invoices/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_1', orgId: 'org_123' },
      accessToken: 'token_123',
    })
    mocks.cookieGet.mockReturnValue(undefined)
  })

  it('proxies a profile list read with the exact resource path', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/recurring-invoices?status=active'
    )

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['recurring-invoices'],
      expect.objectContaining({
        accessToken: 'token_123',
        organizationId: 'org_123',
      })
    )
    expect(response.status).toBe(204)

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('proxies a profile mutation with the exact subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/recurring-invoices/rinv_1/pause',
      { method: 'POST' }
    )

    // ACT
    await POST(request, { params: Promise.resolve({ path: ['rinv_1', 'pause'] }) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['recurring-invoices', 'rinv_1', 'pause'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://billing.test/api/recurring-invoices')

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
