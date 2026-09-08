import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  proxyRequest: vi.fn(async () => new Response(null, { status: 204 })),
  getAuthSession: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('@876/billing/proxy', () => ({
  proxy876BillingRequest: mocks.proxyRequest,
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: unknown) => session !== null,
}))

vi.mock('@/lib/auth/finance-access', () => ({
  requireInvoiceFinancePermission: mocks.requirePermission,
}))

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { GET, PATCH } = await import('./route')

describe('/api/payments/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INVOICE_API_876_KEY', 'invoice-key')
    mocks.getAuthSession.mockResolvedValue({ user: { orgId: 'org_123' } })
    mocks.requirePermission.mockResolvedValue({ response: null })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires read permission before proxying a payment read', async () => {
    const request = new Request('http://localhost/api/payments/pay_1')

    const response = await GET(request, {
      params: Promise.resolve({ path: ['pay_1'] }),
    })

    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'org_123',
      'payments:read'
    )
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(204)
  })

  it('requires write permission before proxying a payment mutation', async () => {
    const request = new Request('http://localhost/api/payments/pay_1', {
      method: 'PATCH',
    })

    await PATCH(request, {
      params: Promise.resolve({ path: ['pay_1'] }),
    })

    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'org_123',
      'payments:write'
    )
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
  })

  it('does not proxy a mutation when the finance guard rejects it', async () => {
    mocks.requirePermission.mockResolvedValue({
      response: Response.json(
        {
          data: null,
          error: { code: 'invoice/forbidden', message: 'Forbidden.' },
        },
        { status: 403 }
      ),
    })
    const request = new Request('http://localhost/api/payments/pay_1', {
      method: 'PATCH',
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ path: ['pay_1'] }),
    })

    expect(response.status).toBe(403)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()
  })
})
