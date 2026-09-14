import { describe, expect, it, vi } from 'vitest'

import { create876BillingIntegrationClient } from '../../client'

const payment = {
  object: 'payment' as const,
  id: 'pay_1',
  source: { appId: 'invoice', externalReference: 'receipt-1' },
  number: 'PAY-001',
  amount: '15000',
  unappliedAmount: '3000',
  amountRefunded: '2000',
  status: 'PARTIALLY_REFUNDED' as const,
  providerConnectionId: null,
  providerPaymentId: null,
  bankCharges: '0',
  currency: 'JMD',
  paymentDate: 1_788_825_600,
  referenceNumber: 'BANK-123',
  notes: null,
  createdAt: 1,
  updatedAt: 2,
  customer: { object: 'customer' as const, id: 'cus_1', name: 'Acme Ltd' },
  paymentMode: {
    object: 'payment_mode' as const,
    id: 'mode_1',
    name: 'Bank transfer',
    isDefault: true,
    isActive: true,
    isSystem: false,
    imageFileId: null,
    imageUrl: null,
    createdAt: 1,
    updatedAt: 1,
  },
  depositAccount: {
    object: 'bank_account' as const,
    id: 'acct_1',
    name: 'Main bank',
    accountType: 'CHECKING',
    currency: 'JMD',
  },
  invoiceAllocations: [
    {
      object: 'payment_allocation' as const,
      id: 'alloc_1',
      amount: '10000',
      createdAt: 1,
      updatedAt: 1,
      invoice: {
        object: 'invoice' as const,
        id: 'inv_1',
        number: 'INV-001',
        totalAmount: '10000',
        amountDue: '0',
        status: 'PAID',
      },
    },
  ],
  bankTransaction: null,
}

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

describe('Billing integration payments resource', () => {
  it('accepts the payment reference returned by create', async () => {
    const created = { object: 'payment' as const, id: 'pay_1' }
    const { client } = setup(created)

    const result = await client.payments.create(
      'org_1',
      {
        customerId: 'cus_1',
        paymentModeId: 'mode_1',
        depositAccountId: 'acct_1',
        amount: '15000',
        currency: 'JMD',
        paymentDate: 1_788_825_600,
      },
      { idempotencyKey: 'payment-1' }
    )

    expect(result).toEqual({ data: created, error: null })
  })

  it('accepts partially refunded payment resources with refunded amount evidence', async () => {
    const resultList = {
      object: 'list' as const,
      data: [payment],
      has_more: false,
      total_count: 1,
      url: '/api/v1/integrations/organizations/org_1/payments',
    }
    const { client } = setup(resultList)

    const result = await client.payments.list('org_1')

    expect(result).toEqual({ data: resultList, error: null })
    expect(result.data?.data[0]).toMatchObject({
      status: 'PARTIALLY_REFUNDED',
      amountRefunded: '2000',
      unappliedAmount: '3000',
    })
  })

  it('accepts refund summaries on payment detail reads', async () => {
    const detail = {
      ...payment,
      refunds: [
        {
          object: 'refund' as const,
          id: 'ref_1',
          number: 'REF-001',
          amount: '2000',
          currency: 'JMD',
          reason: 'Duplicate payment',
          refundedAt: 1_788_825_600,
          createdAt: 1_788_825_600,
        },
      ],
    }
    const { client } = setup(detail)

    const result = await client.payments.retrieve('org_1', 'pay_1')

    expect(result.data?.refunds).toEqual(detail.refunds)
  })

  it('rejects a payment response that omits amountRefunded', async () => {
    const invalidPayment = Object.fromEntries(
      Object.entries(payment).filter(([key]) => key !== 'amountRefunded')
    )
    const { client } = setup({
      object: 'list',
      data: [invalidPayment],
      has_more: false,
      total_count: 1,
      url: '/example',
    })

    const result = await client.payments.list('org_1')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'billing/invalid-response',
      message: 'The Billing service returned an invalid response.',
    })
  })

  it('routes update, apply, and delete through the integration payment path', async () => {
    const created = { object: 'payment' as const, id: 'pay_1' }
    const updated = setup(created)
    const updateParams = {
      customerId: 'cus_1',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_1',
      amount: '15000',
      currency: 'JMD',
      paymentDate: 1_788_825_600,
      allocations: [],
    }

    await updated.client.payments.update('org_1', 'pay/1', updateParams)
    expect(updated.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payments/pay%2F1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(updateParams),
      })
    )

    const applied = setup(created)
    const applyParams = {
      allocations: [{ invoiceId: 'inv_1', amount: '5000' }],
    }
    await applied.client.payments.apply('org_1', 'pay/1', applyParams)
    expect(applied.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payments/pay%2F1/apply',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(applyParams),
      })
    )

    const deleted = setup({ object: 'payment', id: 'pay_1', deleted: true })
    await deleted.client.payments.delete('org_1', 'pay/1')
    expect(deleted.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payments/pay%2F1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
