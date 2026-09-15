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

const { DELETE, GET, PATCH, POST } = await import('./route')

describe('/api/document-templates/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INVOICE_API_876_KEY', 'invoice-key')
    mocks.getAuthSession.mockResolvedValue({ user: { orgId: 'org_123' } })
    mocks.requireFinancePermission.mockResolvedValue({ response: null })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('forwards a template list read to the integration collection path', async () => {
    // ARRANGE
    const request = new Request(
      'http://localhost/api/document-templates?documentType=invoice'
    )

    // ACT
    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(mocks.requireFinancePermission).toHaveBeenCalledWith(
      'org_123',
      'sales:read'
    )
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['integrations', 'organizations', 'org_123', 'document-templates'],
      expect.objectContaining({ organizationId: 'org_123' })
    )
    expect(response.status).toBe(200)

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a template resolve read to the resolved subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://localhost/api/document-templates/resolved?documentType=invoice'
    )

    // ACT
    await GET(request, {
      params: Promise.resolve({ path: ['resolved'] }),
    })

    // ASSERT
    expect(mocks.requireFinancePermission).toHaveBeenCalledWith(
      'org_123',
      'sales:read'
    )
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      [
        'integrations',
        'organizations',
        'org_123',
        'document-templates',
        'resolved',
      ],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a template create with the sales write permission', async () => {
    // ARRANGE
    const request = new Request('http://localhost/api/document-templates', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'invoice', name: 'Standard' }),
    })

    // ACT
    await POST(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(mocks.requireFinancePermission).toHaveBeenCalledWith(
      'org_123',
      'sales:write'
    )
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['integrations', 'organizations', 'org_123', 'document-templates'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a template update to the resource subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://localhost/api/document-templates/dtpl_1',
      {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      }
    )

    // ACT
    await PATCH(request, {
      params: Promise.resolve({ path: ['dtpl_1'] }),
    })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      [
        'integrations',
        'organizations',
        'org_123',
        'document-templates',
        'dtpl_1',
      ],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects a template read without sales read permission', async () => {
    // ARRANGE
    mocks.requireFinancePermission.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })
    const request = new Request('http://localhost/api/document-templates')

    // ACT
    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(response.status).toBe(403)
    expect(mocks.requireFinancePermission).toHaveBeenCalledWith(
      'org_123',
      'sales:read'
    )
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects a template delete without sales write permission', async () => {
    // ARRANGE
    mocks.requireFinancePermission.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })
    const request = new Request(
      'http://localhost/api/document-templates/dtpl_1',
      { method: 'DELETE' }
    )

    // ACT
    const response = await DELETE(request, {
      params: Promise.resolve({ path: ['dtpl_1'] }),
    })

    // ASSERT
    expect(response.status).toBe(403)
    expect(mocks.requireFinancePermission).toHaveBeenCalledWith(
      'org_123',
      'sales:write'
    )
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://localhost/api/document-templates')

    // ACT
    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
