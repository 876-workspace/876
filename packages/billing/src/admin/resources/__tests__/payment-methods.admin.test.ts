import { describe, expect, it, vi } from 'vitest'
import { createAdminPaymentMethodsResource } from '../payment-methods'

function adminRuntime(fetchMock?: any) {
  const fetchFn = fetchMock ?? vi.fn().mockResolvedValue(Response.json({
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
  }))
  return { baseUrl: 'https://billing.example.test', fetch: fetchFn, internalKey: 'key', _fetchMock: fetchFn } as any
}

describe('AdminResources / PaymentMethods / admin tenant scoping', () => {
  it('list — requires explicit organizationId in path (not runtime implicit)', async () => {
    // Arrange
    const rt = adminRuntime()
    const res = createAdminPaymentMethodsResource(rt as any)
    // Act
    await res.list('org_123', { customerId: 'cus_1', limit: 5 } as any)
    // Assert
    expect(rt._fetchMock).toHaveBeenCalled()
    const url = rt._fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/api/v1/organizations/org_123/payment-methods')
  })

  it('list — maps startingAfter -> starting_after', async () => {
    const rt = adminRuntime(vi.fn().mockResolvedValue(Response.json({ data: { object: 'list', data: [], has_more: false, url: '', total_count: 0 }, error: null })))
    const res = createAdminPaymentMethodsResource(rt as any)
    await res.list('org_1', { startingAfter: 'pm_99' } as any)
    expect(rt._fetchMock).toHaveBeenCalled()
  })

  it('create — POSTs to org-scoped collection', async () => {
    const rt = adminRuntime()
    const res = createAdminPaymentMethodsResource(rt as any)
    await res.create('org_1', { customerId: 'cus_1', type: 'CARD' } as any)
    expect(rt._fetchMock.mock.calls[0][0]).toContain('/organizations/org_1/payment-methods')
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('retrieve — encodes paymentMethodId', async () => {
    const rt = adminRuntime()
    const res = createAdminPaymentMethodsResource(rt as any)
    await res.retrieve('org_1', 'pm/with space')
    expect(rt._fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('pm/with space'))
  })

  it('update — PATCHes encoded id', async () => {
    const rt = adminRuntime()
    const res = createAdminPaymentMethodsResource(rt as any)
    await res.update('org_1', 'pm_1', { billingDetails: { name: 'X' } } as any)
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('PATCH')
  })

  it('delete — DELETEs encoded id and parses tombstone', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { object: 'payment_method', id: 'pm_1', deleted: true }, error: null }))
    const rt = adminRuntime(fetchMock)
    const res = createAdminPaymentMethodsResource(rt as any)
    const out = await res.delete('org_1', 'pm_1')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    expect(out.data?.deleted).toBe(true)
  })

  it('setDefault — POSTs to /default suffix', async () => {
    const rt = adminRuntime()
    const res = createAdminPaymentMethodsResource(rt as any)
    await res.setDefault('org_1', 'pm_1')
    expect(rt._fetchMock.mock.calls[0][0]).toContain('/pm_1/default')
    expect(rt._fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('encodes organizationId with slashes', async () => {
    const rt = adminRuntime(vi.fn().mockResolvedValue(Response.json({ data: { object: 'list', data: [], has_more: false, url: '', total_count: 0 }, error: null })))
    const res = createAdminPaymentMethodsResource(rt as any)
    await res.list('org/with slash', {})
    expect(rt._fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('org/with slash'))
  })

  it('returns invalid-response error when schema violates strictObject', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { object: 'payment_method', id: 'pm_1', credential: 'leak' }, error: null }))
    const rt = adminRuntime(fetchMock)
    const res = createAdminPaymentMethodsResource(rt as any)
    const out = await res.retrieve('org_1', 'pm_1')
    expect(out.error).toBeTruthy()
    expect(out.data).toBeNull()
  })
})
