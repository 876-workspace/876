import { describe, expect, it } from 'vitest'

import {
  serializeIntegrationPayment,
  serializePayment,
  serializePaymentMode,
} from '../payments.serializers'

const row = {
  id: 'pay_1',
  tenantId: 'ten_private',
  sourceAppId: 'invoice',
  sourceExternalReference: 'receipt-1',
  sourceIdempotencyKey: 'idem_private',
  sourcePayloadHash: 'hash_private',
  customerId: 'cus_1',
  paymentModeId: 'mode_1',
  depositAccountId: 'acct_1',
  providerConnectionId: null,
  providerPaymentId: null,
  paymentIntentId: 'pi_private',
  paymentMethodId: 'pm_private',
  billingDetailsSnapshot: { email: 'private@example.com' },
  paymentMethodSnapshot: { last4: '4242' },
  providerStatus: 'provider_private',
  failureCode: null,
  failureMessage: null,
  authorizationCode: 'auth_private',
  receiptUrl: 'https://provider.example/receipt',
  risk: { score: 99 },
  disputed: false,
  number: 'PAY-001',
  status: 'PARTIALLY_REFUNDED',
  revision: 3,
  amount: 15_000n,
  unappliedAmount: 3_000n,
  amountRefunded: 2_000n,
  bankCharges: 0n,
  currency: 'JMD',
  paymentDate: 1_788_825_600,
  referenceNumber: 'BANK-123',
  notes: null,
  createdAt: 1,
  updatedAt: 2,
  customer: { id: 'cus_1', name: 'Acme Ltd' },
  paymentMode: {
    id: 'mode_1',
    tenantId: 'ten_private',
    name: 'Bank transfer',
    isDefault: true,
    isActive: true,
    isSystem: false,
    createdAt: 1,
    updatedAt: 1,
  },
  depositAccount: {
    id: 'acct_1',
    tenantId: 'ten_private',
    name: 'Main bank',
    accountType: 'CHECKING',
    currency: 'JMD',
    description: 'private internal note',
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
  },
  invoiceAllocations: [
    {
      id: 'alloc_1',
      tenantId: 'ten_private',
      paymentId: 'pay_1',
      invoiceId: 'inv_1',
      amount: 10_000n,
      reversedAt: null,
      createdAt: 1,
      updatedAt: 1,
      invoice: {
        id: 'inv_1',
        tenantId: 'ten_private',
        customerId: 'cus_1',
        number: 'INV-001',
        totalAmount: 10_000n,
        amountDue: 0n,
        status: 'PAID',
        privateInternalField: 'never-public',
      },
    },
  ],
  refunds: [
    {
      id: 'ref_1',
      tenantId: 'ten_private',
      customerId: 'cus_1',
      paymentId: 'pay_1',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_1',
      number: 'REF-001',
      amount: 2_000n,
      currency: 'JMD',
      reason: 'Duplicate payment',
      notes: 'internal refund note',
      refundedAt: 1_788_825_600,
      createdAt: 1_788_825_600,
      updatedAt: 1_788_825_600,
    },
  ],
  bankTransaction: null,
}

describe('payments serializers', () => {
  it('returns the public tenant payment shape without Prisma internals', () => {
    const payment = serializePayment(row)

    expect(payment).toMatchObject({
      object: 'payment',
      id: 'pay_1',
      amount: '15000',
      unappliedAmount: '3000',
      amountRefunded: '2000',
      status: 'PARTIALLY_REFUNDED',
      paymentMode: { object: 'payment_mode', id: 'mode_1' },
      depositAccount: { object: 'bank_account', id: 'acct_1' },
      invoiceAllocations: [
        {
          object: 'payment_allocation',
          id: 'alloc_1',
          amount: '10000',
          invoice: { object: 'invoice', id: 'inv_1', totalAmount: '10000' },
        },
      ],
      refunds: [
        {
          object: 'refund',
          id: 'ref_1',
          number: 'REF-001',
          amount: '2000',
          currency: 'JMD',
          reason: 'Duplicate payment',
        },
      ],
    })
    expect(payment).not.toHaveProperty('tenantId')
    expect(payment).not.toHaveProperty('sourceAppId')
    expect(payment).not.toHaveProperty('sourceIdempotencyKey')
    expect(payment).not.toHaveProperty('billingDetailsSnapshot')
    expect(payment).not.toHaveProperty('paymentMethodSnapshot')
    expect(payment).not.toHaveProperty('risk')
    expect(payment.paymentMode).not.toHaveProperty('tenantId')
    expect(payment.depositAccount).not.toHaveProperty('tenantId')
    expect(payment.invoiceAllocations[0]?.invoice).not.toHaveProperty('tenantId')
    expect(payment.refunds?.[0]).not.toHaveProperty('tenantId')
    expect(payment.refunds?.[0]).not.toHaveProperty('paymentModeId')
    expect(payment.refunds?.[0]).not.toHaveProperty('depositAccountId')
    expect(payment.refunds?.[0]).not.toHaveProperty('notes')
  })

  it('adds normalized source attribution only for integration reads', () => {
    const payment = serializeIntegrationPayment(row)

    expect(payment.source).toEqual({
      appId: 'invoice',
      externalReference: 'receipt-1',
    })
    expect(payment).not.toHaveProperty('sourceAppId')
    expect(payment).not.toHaveProperty('sourceExternalReference')
  })

  it('does not expose tenant identity on payment-mode resources', () => {
    expect(serializePaymentMode(row.paymentMode)).toEqual({
      object: 'payment_mode',
      id: 'mode_1',
      name: 'Bank transfer',
      isDefault: true,
      isActive: true,
      isSystem: false,
      createdAt: 1,
      updatedAt: 1,
    })
  })
})
