import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const BASE = 'https://billing.example.test'
const ORG = 'org_1'

/** The non-secret shape a payment method is allowed to carry on the wire. */
function paymentMethod(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment_method',
    id: 'pm_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    type: 'CARD',
    status: 'ACTIVE',
    allowRedisplay: 'UNSPECIFIED',
    reusable: true,
    isDefault: false,
    billingDetails: null,
    card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
    bankAccount: null,
    wallet: null,
    manual: null,
    fingerprint: null,
    displayLabel: 'visa •••• 4242',
    expMonth: 12,
    expYear: 2030,
    provider: null,
    providerPaymentMethodId: null,
    providerConnectionId: null,
    detachedAt: null,
    metadata: null,
    createdAt: 1_788_825_600,
    updatedAt: 1_788_825_600,
    ...overrides,
  }
}

function client(fetchMock: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl: BASE,
    organizationId: ORG,
    fetch: fetchMock as unknown as typeof fetch,
  })
}

function jsonOnce(data: unknown) {
  return vi.fn().mockResolvedValue(Response.json({ data, error: null }))
}

describe('paymentMethods', () => {
  it('lists against the organization-scoped collection', async () => {
    const fetchMock = jsonOnce({
      object: 'list',
      data: [paymentMethod()],
      has_more: false,
      total_count: 1,
      url: `/api/v1/organizations/${ORG}/payment-methods`,
    })

    const result = await client(fetchMock).paymentMethods.list()

    expect(result.error).toBeNull()
    expect(result.data?.data).toEqual([paymentMethod()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/organizations/${ORG}/payment-methods`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('forwards the customer filter and the Stripe cursor name', async () => {
    const fetchMock = jsonOnce({
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/x',
    })

    await client(fetchMock).paymentMethods.list({
      customerId: 'cus_1',
      startingAfter: 'pm_0',
      limit: 10,
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('customerId=cus_1')
    // The platform pagination contract is starting_after, not startingAfter.
    expect(url).toContain('starting_after=pm_0')
    expect(url).toContain('limit=10')
  })

  it('creates through a POST to the collection', async () => {
    const fetchMock = jsonOnce(paymentMethod())

    const result = await client(fetchMock).paymentMethods.create({
      customerId: 'cus_1',
      type: 'CARD',
      card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
      credential: {
        storage: 'provider_token',
        provider: 'fygaro',
        providerConnectionId: 'conn_1',
        providerToken: 'tok_1',
      },
    })

    expect(result.data?.id).toBe('pm_1')
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/organizations/${ORG}/payment-methods`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('encodes an id that contains a path separator', async () => {
    const fetchMock = jsonOnce(paymentMethod())

    await client(fetchMock).paymentMethods.retrieve('pm/1')

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      encodeURIComponent('pm/1')
    )
  })

  it('sets a default through its own action path', async () => {
    const fetchMock = jsonOnce(paymentMethod({ isDefault: true }))

    const result = await client(fetchMock).paymentMethods.setDefault('pm_1')

    expect(result.data?.isDefault).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/organizations/${ORG}/payment-methods/pm_1/default`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('detaches and returns a tombstone rather than a resource', async () => {
    const fetchMock = jsonOnce({
      object: 'payment_method',
      id: 'pm_1',
      deleted: true,
    })

    const result = await client(fetchMock).paymentMethods.delete('pm_1')

    expect(result.data).toEqual({
      object: 'payment_method',
      id: 'pm_1',
      deleted: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/organizations/${ORG}/payment-methods/pm_1`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('rejects a response carrying a sealed credential', async () => {
    // The server never sends one; the schema is the second line of defence.
    const fetchMock = jsonOnce({
      ...paymentMethod(),
      credential: { sealedValue: 'la1:whatever' },
    })

    const result = await client(fetchMock).paymentMethods.retrieve('pm_1')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})
