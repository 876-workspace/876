import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { proxy876BillingRequest } from './proxy'

describe('proxy876BillingRequest', () => {
  it('forwards only safe request headers with delegated identity', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        { data: { object: 'invoice', id: 'inv_1' }, error: null },
        {
          headers: {
            'x-request-id': 'req_upstream',
            'set-cookie': 'secret=1',
          },
        }
      )
    )
    const request = new Request(
      'https://billing.example.test/api/v1/invoices?limit=25',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer browser-supplied-token',
          cookie: 'private=session',
          'content-type': 'application/json',
          'idempotency-key': 'idem_123',
        },
        body: JSON.stringify({ customerId: 'cust_1' }),
      }
    )

    const response = await proxy876BillingRequest(request, ['invoices'], {
      baseUrl: 'https://billing-api.example.test',
      accessToken: 'trusted-token',
      organizationId: 'org_123',
      requestId: 'req_frontend',
      fetch: fetchMock,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    const headers = new Headers(init?.headers)
    expect(String(url)).toBe(
      'https://billing-api.example.test/api/v1/invoices?limit=25'
    )
    expect(headers.get('authorization')).toBe('Bearer trusted-token')
    expect(headers.get('x-billing-organization-id')).toBe('org_123')
    expect(headers.get('idempotency-key')).toBe('idem_123')
    expect(headers.has('cookie')).toBe(false)
    expect(response.headers.get('x-request-id')).toBe('req_upstream')
    expect(response.headers.has('set-cookie')).toBe(false)
  })

  it('returns the Billing envelope when the API is unavailable', async () => {
    const response = await proxy876BillingRequest(
      new Request('https://billing.example.test/api/v1/invoices'),
      ['invoices'],
      {
        accessToken: 'trusted-token',
        organizationId: 'org_123',
        fetch: vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
      }
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'billing/unreachable',
        message: 'Could not reach the Billing service.',
      },
    })
  })

  it('rejects dot segments before resolving the upstream URL', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const response = await proxy876BillingRequest(
      new Request('https://billing.example.test/api/v1/invoices'),
      ['..', 'health'],
      {
        accessToken: 'trusted-token',
        organizationId: 'org_123',
        fetch: fetchMock,
      }
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'billing/invalid-path',
        message: 'The Billing request path is invalid.',
      },
    })
  })
})
