import { describe, expect, it } from 'vitest'

import { PaymentListSchema, PaymentSchema } from '../payment.schema'

function payment(overrides: object = {}) {
  return {
    object: 'payment' as const,
    id: 'pay_1',
    tenantId: 'ten_internal',
    sourceAppId: null,
    customerId: 'cus_1',
    paymentModeId: 'pmode_1',
    depositAccountId: 'acct_1',
    number: 'PAY-0001',
    status: 'SUCCEEDED' as const,
    revision: 0,
    amount: '11500',
    unappliedAmount: '0',
    bankCharges: '0',
    currency: 'JMD',
    paymentDate: 10,
    referenceNumber: null,
    notes: null,
    providerConnectionId: null,
    providerPaymentId: null,
    createdAt: 10,
    updatedAt: 10,
    customer: {
      object: 'customer' as const,
      id: 'cus_1',
      name: 'Mango Company',
    },
    paymentMode: {
      object: 'payment_mode' as const,
      id: 'pmode_1',
      tenantId: 'ten_internal',
      name: 'Bank transfer',
      isDefault: false,
      isActive: true,
      isSystem: true,
      createdAt: 1,
      updatedAt: 1,
    },
    depositAccount: {
      object: 'bank_account' as const,
      id: 'acct_1',
      tenantId: 'ten_internal',
      name: 'Operating account',
      accountType: 'CHECKING' as const,
      currency: 'JMD',
    },
    invoiceAllocations: [
      {
        object: 'payment_allocation' as const,
        id: 'pa_1',
        paymentId: 'pay_1',
        invoiceId: 'inv_1',
        amount: '11500',
        reversedAt: null,
        createdAt: 10,
        updatedAt: 10,
        invoice: {
          object: 'invoice' as const,
          id: 'inv_1',
          tenantId: 'ten_internal',
          number: 'INV-0001',
          totalAmount: '11500',
          amountDue: '0',
          status: 'PAID',
        },
      },
    ],
    ...overrides,
  }
}

describe('PaymentSchema', () => {
  it('accepts every payment status from the Billing data model', () => {
    for (const status of [
      'PENDING',
      'REQUIRES_ACTION',
      'AUTHORIZED',
      'PROCESSING',
      'SUCCEEDED',
      'FAILED',
      'CANCELED',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
      'DISPUTED',
    ] as const) {
      expect(PaymentSchema.safeParse(payment({ status })).success).toBe(true)
    }
  })

  it('strips internal fields from the payment and expanded relations', () => {
    const result = PaymentSchema.parse(payment())

    expect(result).not.toHaveProperty('tenantId')
    expect(result.paymentMode).not.toHaveProperty('tenantId')
    expect(result.depositAccount).not.toHaveProperty('tenantId')
    expect(result.invoiceAllocations[0]).not.toHaveProperty('paymentId')
    expect(result.invoiceAllocations[0]?.invoice).not.toHaveProperty('tenantId')
  })

  it('rejects statuses outside the authoritative data model', () => {
    expect(PaymentSchema.safeParse(payment({ status: 'RECEIVED' })).success).toBe(
      false
    )
  })

  it('validates payment list envelopes', () => {
    expect(
      PaymentListSchema.safeParse({
        object: 'list',
        data: [payment()],
        has_more: false,
        total_count: 1,
        url: '/api/v1/payments',
      }).success
    ).toBe(true)
  })
})
