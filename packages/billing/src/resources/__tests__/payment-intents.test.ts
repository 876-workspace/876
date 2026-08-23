import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const BASE = 'https://billing.example.test'
const ORG = 'org_1'

function paymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment_intent',
    id: 'pi_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    invoiceId: null,
    subscriptionId: null,
    // Money crosses the wire as a string; a JS number would lose precision.
    amount: '150000',
    amountCapturable: '0',
    amountReceived: '0',
    currency: 'JMD',
    status: 'REQUIRES_CONFIRMATION',
    captureMethod: 'AUTOMATIC',
    confirmationMethod: 'AUTOMATIC',
    paymentMethodId: 'pm_1',
    mandateId: null,
    paymentMethodTypes: [],
    setupFutureUsage: 'NONE',
    description: null,
    receiptEmail: null,
    statementDescriptor: null,
    statementDescriptorSuffix: null,
    lastPaymentError: null,
    nextAction: null,
    processing: null,
    attemptCount: 0,
    latestPaymentId: null,
    latestAttemptId: null,
    canceledAt: null,
    cancellationReason: null,
    provider: null,
    providerConnectionId: null,
    providerIntentId: null,
    idempotencyKey: null,
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

const COLLECTION = `${BASE}/api/v1/organizations/${ORG}/payment-intents`

describe('paymentIntents', () => {
  it('lists against the organization-scoped collection', async () => {
    const fetchMock = jsonOnce({
      object: 'list',
      data: [paymentIntent()],
      has_more: false,
      total_count: 1,
      url: '/x',
    })

    const result = await client(fetchMock).paymentIntents.list()

    expect(result.error).toBeNull()
    expect(result.data?.data).toEqual([paymentIntent()])
    expect(fetchMock).toHaveBeenCalledWith(
      COLLECTION,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('forwards the customer and status filters', async () => {
    const fetchMock = jsonOnce({
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/x',
    })

    await client(fetchMock).paymentIntents.list({
      customerId: 'cus_1',
      status: 'SUCCEEDED',
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('customerId=cus_1')
    expect(url).toContain('status=SUCCEEDED')
  })

  it('creates through a POST to the collection', async () => {
    const fetchMock = jsonOnce(paymentIntent())

    const result = await client(fetchMock).paymentIntents.create({
      customerId: 'cus_1',
      amount: '150000',
      currency: 'JMD',
    })

    expect(result.data?.id).toBe('pi_1')
    expect(fetchMock).toHaveBeenCalledWith(
      COLLECTION,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('encodes an id containing a path separator', async () => {
    const fetchMock = jsonOnce(paymentIntent())

    await client(fetchMock).paymentIntents.retrieve('pi/1')

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      encodeURIComponent('pi/1')
    )
  })

  it.each([
    ['confirm', 'SUCCEEDED'],
    ['capture', 'SUCCEEDED'],
    ['cancel', 'CANCELED'],
  ] as const)('posts %s to its own action path', async (action, status) => {
    const fetchMock = jsonOnce(paymentIntent({ status }))

    const result = await client(fetchMock).paymentIntents[action]('pi_1')

    expect(result.data?.status).toBe(status)
    expect(fetchMock).toHaveBeenCalledWith(
      `${COLLECTION}/pi_1/${action}`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('rejects a status the state machine cannot produce', async () => {
    const fetchMock = jsonOnce(paymentIntent({ status: 'PAID' }))

    const result = await client(fetchMock).paymentIntents.retrieve('pi_1')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})
