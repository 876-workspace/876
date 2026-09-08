import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'

describe('customers.account', () => {
  it('parses the receivables and statement projection returned by Billing', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      Response.json({
        data: {
          object: 'customer_account',
          customer: {
            object: 'customer',
            id: 'cust_123',
            name: 'Customer',
            defaultCurrency: 'JMD',
          },
          currency: 'JMD',
          lifetimeBilled: '1500',
          lifetimePaid: '1000',
          outstandingReceivable: '500',
          overdueReceivable: '200',
          availableCredit: '0',
          netPosition: '500',
          openingBalance: '1500',
          closingBalance: '500',
          statement: [
            {
              object: 'customer_ledger_entry',
              id: 'ledger_1',
              type: 'PAYMENT_RECEIVED',
              direction: 'CREDIT',
              amount: '1000',
              currency: 'JMD',
              description: 'Payment received',
              effectiveAt: 1_788_000_000,
              invoiceId: null,
              paymentId: 'pay_123',
              creditNoteId: null,
              refundId: null,
              balance: '500',
            },
          ],
          // Express v1 compatibility aliases are deliberately allowed in the
          // wire response but are not a second typed account representation.
          unusedCredits: '0',
          entries: [],
        },
        error: null,
      })
    )
    const client = create876Client({
      baseUrl: 'https://billing.example.test',
      fetch,
    })

    const result = await client.customers.account('cust_123')

    expect(result.error).toBeNull()
    expect(result.data?.overdueReceivable).toBe('200')
    expect(result.data?.openingBalance).toBe('1500')
    expect(result.data?.statement[0]?.balance).toBe('500')
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/customers/cust_123/account',
      expect.objectContaining({ method: 'GET' })
    )
  })
})
