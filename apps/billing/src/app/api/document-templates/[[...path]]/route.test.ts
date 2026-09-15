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

const { DELETE, GET, PATCH, POST } = await import('./route')

describe('/api/document-templates/[[...path]]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({
      user: { id: 'user_1', orgId: 'org_123' },
      accessToken: 'token_123',
    })
    mocks.cookieGet.mockReturnValue(undefined)
  })

  it('authorizes a signed session then forwards the list read once', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/document-templates?documentType=invoice'
    )

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates'],
      expect.objectContaining({
        accessToken: 'token_123',
        organizationId: 'org_123',
      })
    )
    expect(response.status).toBe(200)

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a template create with the exact resource path', async () => {
    // ARRANGE
    const request = new Request('http://billing.test/api/document-templates', {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'invoice',
        name: 'Invoice template',
        layout: 'standard',
      }),
    })

    // ACT
    await POST(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a single template read with the exact subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/document-templates/dtpl_1'
    )

    // ACT
    await GET(request, { params: Promise.resolve({ path: ['dtpl_1'] }) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates', 'dtpl_1'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a template update with the exact subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/document-templates/dtpl_1',
      { method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }
    )

    // ACT
    await PATCH(request, { params: Promise.resolve({ path: ['dtpl_1'] }) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates', 'dtpl_1'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards the set-default action with the exact subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/document-templates/dtpl_1/set-default',
      { method: 'POST' }
    )

    // ACT
    await POST(request, {
      params: Promise.resolve({ path: ['dtpl_1', 'set-default'] }),
    })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates', 'dtpl_1', 'set-default'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('forwards a template delete with the exact subpath', async () => {
    // ARRANGE
    const request = new Request(
      'http://billing.test/api/document-templates/dtpl_1',
      { method: 'DELETE' }
    )

    // ACT
    await DELETE(request, { params: Promise.resolve({ path: ['dtpl_1'] }) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledTimes(1)
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates', 'dtpl_1'],
      expect.objectContaining({ organizationId: 'org_123' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('prefers the active organization cookie over the session organization', async () => {
    // ARRANGE
    mocks.cookieGet.mockReturnValue({ value: 'org_cookie' })
    const request = new Request('http://billing.test/api/document-templates')

    // ACT
    await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(mocks.proxyRequest).toHaveBeenCalledWith(
      request,
      ['document-templates'],
      expect.objectContaining({ organizationId: 'org_cookie' })
    )

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })

  it('rejects an unsigned session before reaching Billing', async () => {
    // ARRANGE
    mocks.getAuthSession.mockResolvedValue(null)
    const request = new Request('http://billing.test/api/document-templates')

    // ACT
    const response = await GET(request, { params: Promise.resolve({}) })

    // ASSERT
    expect(response.status).toBe(401)
    expect(mocks.proxyRequest).not.toHaveBeenCalled()

    // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks).
  })
})
