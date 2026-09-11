import { describe, expect, it } from 'vitest'

import { buildCustomerAccountProjection } from '../customer-account.projection'

const customer = {
  object: 'customer' as const,
  id: 'cust_123',
  name: 'Customer',
  defaultCurrency: 'JMD',
  outstandingReceivable: '1000',
  unusedCredits: '1000',
}

function entry(
  id: string,
  direction: 'DEBIT' | 'CREDIT',
  amount: string,
  type: string
) {
  return {
    object: 'customer_ledger_entry' as const,
    id,
    customerId: customer.id,
    subscriptionId: null,
    invoiceId: type.startsWith('INVOICE') ? `inv_${id}` : null,
    paymentId: type.startsWith('PAYMENT') ? `pay_${id}` : null,
    creditNoteId: null,
    refundId: null,
    type,
    direction,
    amount,
    currency: 'JMD',
    description: null,
    effectiveAt: 100,
    createdAt: 100,
  }
}

describe('buildCustomerAccountProjection', () => {
  it('credits received cash once even when it remains unapplied', () => {
    const result = buildCustomerAccountProjection(
      customer,
      [
        entry('payment', 'CREDIT', '1000', 'PAYMENT_RECEIVED'),
        entry('invoice', 'DEBIT', '1000', 'INVOICE_FINALIZED'),
      ],
      [
        { type: 'INVOICE_FINALIZED', direction: 'DEBIT', amount: 1000n },
        { type: 'PAYMENT_RECEIVED', direction: 'CREDIT', amount: 1000n },
      ],
      0n
    )

    expect(result.outstandingReceivable).toBe('1000')
    expect(result.availableCredit).toBe('1000')
    expect(result.netPosition).toBe('0')
    expect(result.closingBalance).toBe('0')
    expect(result.lifetimePaid).toBe('1000')
  })

  it('keeps allocation economically neutral after cash was already received', () => {
    const result = buildCustomerAccountProjection(
      { ...customer, outstandingReceivable: '0', unusedCredits: '0' },
      [
        entry('payment', 'CREDIT', '1000', 'PAYMENT_RECEIVED'),
        entry('invoice', 'DEBIT', '1000', 'INVOICE_FINALIZED'),
      ],
      [
        { type: 'INVOICE_FINALIZED', direction: 'DEBIT', amount: 1000n },
        { type: 'PAYMENT_RECEIVED', direction: 'CREDIT', amount: 1000n },
      ],
      0n
    )

    expect(result.netPosition).toBe('0')
    expect(result.closingBalance).toBe('0')
    expect(result.statement).toHaveLength(2)
  })

  it('derives the opening balance for a truncated latest-entry statement', () => {
    const payment = entry('latest', 'CREDIT', '1000', 'PAYMENT_RECEIVED')
    const result = buildCustomerAccountProjection(
      { ...customer, outstandingReceivable: '500', unusedCredits: '0' },
      [payment],
      [
        { type: 'INVOICE_FINALIZED', direction: 'DEBIT', amount: 1500n },
        { type: 'PAYMENT_RECEIVED', direction: 'CREDIT', amount: 1000n },
      ],
      200n
    )

    expect(result.openingBalance).toBe('1500')
    expect(result.statement[0]?.balance).toBe('500')
    expect(result.closingBalance).toBe('500')
    expect(result.overdueReceivable).toBe('200')
  })

  it('removes reversed and refunded cash from lifetime paid', () => {
    const result = buildCustomerAccountProjection(
      { ...customer, outstandingReceivable: '1000', unusedCredits: '0' },
      [],
      [
        { type: 'INVOICE_FINALIZED', direction: 'DEBIT', amount: 1000n },
        { type: 'PAYMENT_RECEIVED', direction: 'CREDIT', amount: 1500n },
        { type: 'PAYMENT_REVERSED', direction: 'DEBIT', amount: 1000n },
        { type: 'REFUND_ISSUED', direction: 'DEBIT', amount: 200n },
      ],
      1000n
    )

    expect(result.lifetimePaid).toBe('300')
    expect(result.closingBalance).toBe('700')
  })

  it('defaults sales, credit, and subscription extras when omitted', () => {
    const result = buildCustomerAccountProjection(customer, [], [], 0n)

    expect(result.lifetimeSales).toBe('0')
    expect(result.lifetimeCredits).toBe('0')
    expect(result.lastSaleAt).toBeNull()
    expect(result.activeSubscriptionCount).toBe(0)
    expect(result.subscriptionMrr).toEqual([])
  })

  it('carries lifetime sales, credits, and subscription extras', () => {
    const result = buildCustomerAccountProjection(customer, [], [], 0n, {
      lifetimeSales: '15000',
      lifetimeCredits: '2000',
      lastSaleAt: 1_787_000_000,
      activeSubscriptionCount: 2,
      subscriptionMrr: [{ currency: 'JMD', mrr: '10000', arr: '120000' }],
    })

    expect(result.lifetimeSales).toBe('15000')
    expect(result.lifetimeCredits).toBe('2000')
    expect(result.lastSaleAt).toBe(1_787_000_000)
    expect(result.activeSubscriptionCount).toBe(2)
    expect(result.subscriptionMrr).toEqual([
      { currency: 'JMD', mrr: '10000', arr: '120000' },
    ])
  })
})
