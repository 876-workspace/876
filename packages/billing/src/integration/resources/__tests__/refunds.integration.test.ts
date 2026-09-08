import { describe, expect, it, vi } from 'vitest'

import { create876BillingIntegrationClient } from '../../client'

function setup(response: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({ data: response, error: null }))
  const client = create876BillingIntegrationClient({
    baseUrl: 'https://billing.test',
    apiKey: 'key_1',
    fetch,
  })

  return { client, fetch }
}

describe('Billing integration refunds resource', () => {
  it('lists app-scoped refund evidence', async () => {
    const refund = {
      object: 'refund' as const,
      id: 'ref_1',
      customerId: 'cus_1',
      creditNoteId: null,
      paymentId: 'pay_1',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_1',
      number: 'REF-001',
      amount: '2500',
      currency: 'JMD',
      reason: 'Duplicate payment',
      notes: null,
      refundedAt: 1_788_825_600,
      createdAt: 1_788_825_600,
      updatedAt: 1_788_825_600,
    }
    const list = {
      object: 'list' as const,
      data: [refund],
      has_more: false,
      total_count: 1,
      url: '/api/v1/integrations/organizations/org_1/refunds',
    }
    const { client, fetch } = setup(list)

    const result = await client.refunds.list('org_1')

    expect(result).toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/refunds',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a payment refund through the typed integration client', async () => {
    const created = { object: 'refund' as const, id: 'ref_1' }
    const { client, fetch } = setup(created)
    const params = {
      customerId: 'cus_1',
      currency: 'JMD',
      amount: '2500',
      paymentId: 'pay_1',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_1',
      refundedAt: 1_788_825_600,
    }

    const result = await client.refunds.create('org_1', params)

    expect(result).toEqual({ data: created, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/refunds',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
      })
    )
  })
})
