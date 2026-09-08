import { describe, expect, it } from 'vitest'

import { PaymentSchema } from '../payment.schema'

const payment = {
  object: 'payment' as const,
  id: 'pay_1',
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
  customer: { object: 'customer' as const, id: 'cus_1', name: 'Acme Ltd' },
  paymentMode: {
    object: 'payment_mode' as const,
    id: 'mode_1',
    name: 'Bank transfer',
    isDefault: true,
    isActive: true,
    isSystem: false,
    createdAt: 1,
    updatedAt: 1,
  },
  depositAccount: {
    object: 'bank_account' as const,
    id: 'acct_1',
    name: 'Main bank',
    accountType: 'CHECKING' as const,
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
  createdAt: 1,
  updatedAt: 2,
}

describe('PaymentSchema', () => {
  it('accepts partially refunded payments with cumulative refund evidence', () => {
    expect(PaymentSchema.parse(payment)).toEqual(payment)
  })

  it('accepts a fully refunded payment status', () => {
    expect(
      PaymentSchema.parse({
        ...payment,
        status: 'REFUNDED',
        unappliedAmount: '0',
        amountRefunded: '15000',
      })
    ).toMatchObject({
      status: 'REFUNDED',
      unappliedAmount: '0',
      amountRefunded: '15000',
    })
  })

  it('rejects payment resources that omit amountRefunded', () => {
    const invalid = Object.fromEntries(
      Object.entries(payment).filter(([key]) => key !== 'amountRefunded')
    )
    expect(() => PaymentSchema.parse(invalid)).toThrow()
  })
})
