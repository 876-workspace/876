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

const { GET, POST } = await import('./route')

describe('/api/recurring-invoices/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INVOICE_API_876_KEY', 'invoice-key')
    mocks.getAuthSession.mockResolvedValue({ user: { orgId: 'org_123' } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('proxies a profile list read exactly once', async () => {
    const request = new Request(
      'http://localhost/api/recurring-invoices?status=active'
    )

    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['integrations', 'organizations', 'org_123', 'recurring-invoices'],
      expect.objectContaining({ organizationId: 'org_123' })
    )
    expect(response.status).toBe(204)
  })

  it('proxies a profile mutation with the exact subpath', async () => {
    const request = new Request(
      'http://localhost/api/recurring-invoices/rinv_1/pause',
      { method: 'POST' }
    )

    await POST(request, {
      params: Promise.resolve({ path: ['rinv_1', 'pause'] }),
    })

    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      [
        'integrations',
        'organizations',
        'org_123',
        'recurring-invoices',
        'rinv_1',
        'pause',
      ],
      expect.objectContaining({ organizationId: 'org_123' })
    )
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://localhost/api/recurring-invoices')

    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()
  })
})
