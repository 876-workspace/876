import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  proxyRequest: vi.fn(async () => new Response(null, { status: 200 })),
  getAuthSession: vi.fn(),
  requireFinancePermission: vi.fn(),
}))

vi.mock('@876/billing/proxy', () => ({
  proxy876BillingRequest: mocks.proxyRequest,
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: unknown) => session !== null,
}))

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

vi.mock('@/lib/auth/finance-access', () => ({
  requireInvoiceFinancePermission: mocks.requireFinancePermission,
}))

const { GET, PATCH } = await import('./route')

describe('/api/report-preferences/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INVOICE_API_876_KEY', 'invoice-key')
    mocks.getAuthSession.mockResolvedValue({ user: { orgId: 'org_123' } })
    mocks.requireFinancePermission.mockResolvedValue({ response: null })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('authorizes a signed session then forwards the read once', async () => {
    // ARRANGE
    const request = new Request('http://localhost/api/report-preferences')

    // ACT
    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['integrations', 'organizations', 'org_123', 'report-preferences'],
      expect.objectContaining({ organizationId: 'org_123' })
    )
    expect(response.status).toBe(200)

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('authorizes a signed session then forwards the update once', async () => {
    // ARRANGE
    const request = new Request('http://localhost/api/report-preferences', {
      method: 'PATCH',
      body: JSON.stringify({ timezone: 'America/Jamaica' }),
    })

    // ACT
    await PATCH(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['integrations', 'organizations', 'org_123', 'report-preferences'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://localhost/api/report-preferences')

    // ACT
    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects a preference update without sales write permission', async () => {
    // ARRANGE
    mocks.requireFinancePermission.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })
    const request = new Request('http://localhost/api/report-preferences', {
      method: 'PATCH',
    })

    // ACT
    const response = await PATCH(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(response.status).toBe(403)
    expect(mocks.requireFinancePermission).toHaveBeenCalledWith(
      'org_123',
      'sales:write'
    )
    expect(mocks.proxyRequest).not.toHaveBeenCalled()
  })
})
