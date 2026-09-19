import type { NextRequest } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockRetrieve = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSetDefault = vi.fn()
const mockRequire = vi.fn()

vi.mock('@/lib/clients/billing', () => ({
  billing: {
    paymentMethods: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      retrieve: (...args: unknown[]) => mockRetrieve(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      setDefault: (...args: unknown[]) => mockSetDefault(...args),
    },
  },
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: (...args: unknown[]) => mockRequire(...args),
}))

function req(url: string, init?: RequestInit) {
  const r = new Request(url, init) as unknown as NextRequest
  // `nextUrl` is a readonly getter on NextRequest, so it is defined rather
  // than assigned; a plain Request has no such property at all.
  Object.defineProperty(r, 'nextUrl', { value: new URL(url) })
  // ensure json() works for string bodies already handled by Request
  return r
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRequire.mockResolvedValue({ response: null })
})

describe('console payment-methods routes', () => {
  it('GET /api/payment-methods requires console permission', async () => {
    mockRequire.mockResolvedValue({
      response: new Response('forbidden', { status: 403 }),
    })
    const { GET } = await import('../route')
    const res = await GET(
      req('http://localhost/api/payment-methods?organizationId=org_1')
    )
    expect(res.status).toBe(403)
  })

  it('GET list returns 400 when organizationId missing', async () => {
    const { GET } = await import('../route')
    const res = await GET(req('http://localhost/api/payment-methods'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(JSON.stringify(body)).toContain('organizationId')
  })

  it('GET list proxies query to billing.paymentMethods.list', async () => {
    mockList.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })
    const { GET } = await import('../route')
    const res = await GET(
      req(
        'http://localhost/api/payment-methods?organizationId=org_1&customerId=cus_1&limit=5'
      )
    )
    expect(res.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith('org_1', {
      customerId: 'cus_1',
      limit: 5,
    })
    const body = await res.json()
    expect(body.data).toEqual({ object: 'list', data: [] })
  })

  it('GET list surfaces billing error as 400', async () => {
    mockList.mockResolvedValue({ data: null, error: { message: 'Failed' } })
    const { GET } = await import('../route')
    const res = await GET(
      req('http://localhost/api/payment-methods?organizationId=org_1')
    )
    expect(res.status).toBe(400)
  })

  it('POST create validates organizationId in body', async () => {
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST create validates JSON body', async () => {
    const { POST } = await import('../route')
    const res = await POST(
      req('http://localhost/api/payment-methods', {
        method: 'POST',
        body: 'not-json',
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST create proxies to billing.paymentMethods.create with 201', async () => {
    mockCreate.mockResolvedValue({
      data: { object: 'payment_method', id: 'pm_1' },
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
    expect(mockCreate).toHaveBeenCalledWith('org_1', {
      customerId: 'cus_1',
      type: 'CARD',
    })
  })

  it('POST create surfaces error as 400', async () => {
    mockCreate.mockResolvedValue({
      data: null,
      error: { message: 'Failed to create' },
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
})

describe('console payment-methods [id] routes', () => {
  it('GET retrieve requires organizationId', async () => {
    const { GET } = await import('../[id]/route')
    const res = await GET(req('http://localhost/api/payment-methods/pm_1'), {
      params: Promise.resolve({ id: 'pm_1' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET retrieve proxies to billing.paymentMethods.retrieve', async () => {
    mockRetrieve.mockResolvedValue({
      data: { object: 'payment_method', id: 'pm_1' },
      error: null,
    })
    const { GET } = await import('../[id]/route')
    const res = await GET(
      req('http://localhost/api/payment-methods/pm_1?organizationId=org_1'),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(200)
    expect(mockRetrieve).toHaveBeenCalledWith('org_1', 'pm_1')
  })

  it('PATCH update validates organizationId and body', async () => {
    const { PATCH } = await import('../[id]/route')
    const res = await PATCH(
      req('http://localhost/api/payment-methods/pm_1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('PATCH proxies to update', async () => {
    mockUpdate.mockResolvedValue({
      data: { object: 'payment_method', id: 'pm_1' },
      error: null,
    })
    const { PATCH } = await import('../[id]/route')
    const res = await PATCH(
      req('http://localhost/api/payment-methods/pm_1?organizationId=org_1', {
        method: 'PATCH',
        body: JSON.stringify({ allowRedisplay: 'ALWAYS' }),
      }),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith('org_1', 'pm_1', {
      allowRedisplay: 'ALWAYS',
    })
  })

  it('DELETE requires organizationId', async () => {
    const { DELETE } = await import('../[id]/route')
    const res = await DELETE(req('http://localhost/api/payment-methods/pm_1'), {
      params: Promise.resolve({ id: 'pm_1' }),
    })
    expect(res.status).toBe(400)
  })

  it('DELETE proxies to delete', async () => {
    mockDelete.mockResolvedValue({
      data: { object: 'payment_method', id: 'pm_1', deleted: true },
      error: null,
    })
    const { DELETE } = await import('../[id]/route')
    const res = await DELETE(
      req('http://localhost/api/payment-methods/pm_1?organizationId=org_1'),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith('org_1', 'pm_1')
  })
})

describe('console payment-methods [id]/default route', () => {
  it('POST setDefault requires organizationId', async () => {
    const { POST } = await import('../[id]/default/route')
    const res = await POST(
      req('http://localhost/api/payment-methods/pm_1/default'),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('POST setDefault proxies to setDefault', async () => {
    mockSetDefault.mockResolvedValue({
      data: { object: 'payment_method', id: 'pm_1' },
      error: null,
    })
    const { POST } = await import('../[id]/default/route')
    const res = await POST(
      req(
        'http://localhost/api/payment-methods/pm_1/default?organizationId=org_1'
      ),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(200)
    expect(mockSetDefault).toHaveBeenCalledWith('org_1', 'pm_1')
  })

  it('POST setDefault surfaces error as 400', async () => {
    mockSetDefault.mockResolvedValue({
      data: null,
      error: { message: 'not found' },
    })
    const { POST } = await import('../[id]/default/route')
    const res = await POST(
      req(
        'http://localhost/api/payment-methods/pm_1/default?organizationId=org_1'
      ),
      { params: Promise.resolve({ id: 'pm_1' }) }
    )
    expect(res.status).toBe(400)
  })
})
