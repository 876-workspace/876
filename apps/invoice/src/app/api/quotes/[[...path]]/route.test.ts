import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  proxyRequest: vi.fn(async () => new Response(null, { status: 204 })),
  getAuthSession: vi.fn(),
}))

vi.mock('@876/billing/proxy', () => ({
  proxy876BillingRequest: mocks.proxyRequest,
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: unknown) => session !== null,
}))

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { GET } = await import('./route')

describe('GET /api/quotes/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INVOICE_API_876_KEY', 'invoice-key')
    mocks.getAuthSession.mockResolvedValue({ user: { orgId: 'org_123' } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fixes quotes as the proxied resource instead of accepting a path-supplied resource', async () => {
    const request = new Request('http://localhost/api/quotes/payments/pay_123')

    const response = await GET(request, {
      params: Promise.resolve({ path: ['payments', 'pay_123'] }),
    })

    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      [
        'integrations',
        'organizations',
        'org_123',
        'quotes',
        'payments',
        'pay_123',
      ],
      {
        baseUrl: undefined,
        apiKey: 'invoice-key',
        organizationId: 'org_123',
        requestId: undefined,
      }
    )
    expect(response.status).toBe(204)
  })
})
