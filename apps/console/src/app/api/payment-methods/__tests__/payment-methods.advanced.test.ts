import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockList = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/services/billing', () => ({
  billing: {
    paymentMethods: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      setDefault: vi.fn(),
    },
  },
}))

const mockRequire = vi.fn()
vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: (...args: unknown[]) => mockRequire(...args),
}))

function req(url: string, init?: RequestInit) {
  const r = new Request(url, init) as unknown as NextRequest
  // `nextUrl` is a readonly getter on NextRequest, so it is defined rather
  // than assigned; a plain Request has no such property at all.
  Object.defineProperty(r, 'nextUrl', { value: new URL(url) })
  return r
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequire.mockResolvedValue({ response: null })
})

describe('API Route / payment-methods / advanced contract', () => {
  it('rejects without permission before touching billing (middleware isolation)', async () => {
    // Arrange
    mockRequire.mockResolvedValue({
      response: new Response('forbidden', { status: 403 }),
    })
    const { GET } = await import('../route')
    // Act
    const res = await GET(
      req('http://localhost/api/payment-methods?organizationId=org_1')
    )
    // Assert
    expect(res.status).toBe(403)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('validates missing organizationId with 400 (contract)', async () => {
    const { GET } = await import('../route')
    const res = await GET(req('http://localhost/api/payment-methods'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { data: { id: string } }
    expect(JSON.stringify(body)).toMatch(/organizationId/)
  })

  it('forwards only allowed query params to billing', async () => {
    mockList.mockResolvedValue({
      data: { object: 'list', data: [{ id: 'pm_1' }] },
      error: null,
    })
    const { GET } = await import('../route')
    const res = await GET(
      req(
        'http://localhost/api/payment-methods?organizationId=org_1&customerId=cus_1&limit=2&unknown=evil'
      )
    )
    expect(res.status).toBe(200)
    // only customerId + limit forwarded, unknown dropped
    expect(mockList).toHaveBeenCalledWith('org_1', {
      customerId: 'cus_1',
      limit: 2,
    })
  })

  it('surfaces billing error as 400 with message', async () => {
    mockList.mockResolvedValue({
      data: null,
      error: { message: 'billing down', code: 'x' },
    })
    const { GET } = await import('../route')
    const res = await GET(
      req('http://localhost/api/payment-methods?organizationId=org_1')
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { data: { id: string } }
    expect(JSON.stringify(body)).toContain('billing down')
  })

  it('POST validates JSON and returns 400 on bad payload', async () => {
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: 'not-json',
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST validates organizationId in body (strict)', async () => {
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify({ type: 'CARD' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST creates and returns 201 on success', async () => {
    mockCreate.mockResolvedValue({
      data: { object: 'payment_method', id: 'pm_new' },
      error: null,
    })
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org_1',
          customerId: 'cus_1',
          type: 'CARD',
        }),
      })
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { id: string } }
    expect(body.data.id).toBe('pm_new')
  })

  it('POST surfaces create error as 400', async () => {
    mockCreate.mockResolvedValue({
      data: null,
      error: { message: 'create failed' },
    })
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify({ organizationId: 'org_1', type: 'MANUAL' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST requires permission (isolation)', async () => {
    mockRequire.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify({ organizationId: 'org_1' }),
      })
    )
    expect(res.status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
