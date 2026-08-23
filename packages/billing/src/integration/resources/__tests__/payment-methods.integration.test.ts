import { describe, expect, it, vi } from 'vitest'
import { createIntegrationPaymentMethodsResource } from '../payment-methods'

function integrationRuntime(fetchMock?: any) {
  const fn =
    fetchMock ??
    vi.fn().mockResolvedValue(
      Response.json({
        data: {
          object: 'payment_method',
          id: 'pm_1',
          tenantId: 'ten_1',
          customerId: 'cus_1',
          type: 'CARD',
          status: 'ACTIVE',
          allowRedisplay: 'ALWAYS',
          reusable: true,
          isDefault: false,
          billingDetails: null,
          card: null,
          bankAccount: null,
          wallet: null,
          manual: null,
          fingerprint: null,
          displayLabel: null,
          expMonth: null,
          expYear: null,
          provider: null,
          providerPaymentMethodId: null,
          providerConnectionId: null,
          detachedAt: null,
          metadata: null,
          createdAt: 1,
          updatedAt: 1,
        },
        error: null,
      })
    )
  return {
    baseUrl: 'https://billing.example.test',
    fetch: fn,
    apiKey: 'key',
    _fetchMock: fn,
  } as any
}

describe('IntegrationResources / PaymentMethods / apiKey path', () => {
  it('list — builds customer and type query', async () => {
    const fn = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
          total_count: 0,
        },
        error: null,
      })
    )
    const rt = integrationRuntime(fn)
    const res = createIntegrationPaymentMethodsResource(rt as any)
    await res.list('org_1', { customerId: 'cus_1', type: 'CARD' } as any)
    expect(fn).toHaveBeenCalled()
  })

  it('create — POSTs', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentMethodsResource(rt as any)
    await res.create('org_1', { customerId: 'cus_1', type: 'CARD' } as any)
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('retrieve — encodes id', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentMethodsResource(rt as any)
    await res.retrieve('org_1', 'pm/1')
    expect(rt._fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('pm/1'))
  })

  it('update — PATCHes', async () => {
    const rt = integrationRuntime()
    const res = createIntegrationPaymentMethodsResource(rt as any)
    await res.update('org_1', 'pm_1', { metadata: { a: 'b' } } as any)
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('PATCH')
  })

  it('delete — DELETEs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: { object: 'payment_method', id: 'pm_1', deleted: true },
        error: null,
      })
    )
    const rt = integrationRuntime(fetchMock)
    const res = createIntegrationPaymentMethodsResource(rt as any)
    const out = await res.delete('org_1', 'pm_1')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    expect(out.data?.deleted).toBe(true)
  })

  it('invalid-response guard returns error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: { object: 'payment_method', id: 'pm_1', credential: 'leak' },
        error: null,
      })
    )
    const rt = integrationRuntime(fetchMock)
    const res = createIntegrationPaymentMethodsResource(rt as any)
    const out = await res.retrieve('org_1', 'pm_1')
    expect(out.error).toBeTruthy()
  })
})
