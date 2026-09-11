import { describe, expect, it } from 'vitest'

import {
  SalesReceiptCreateSchema,
  SalesReceiptRefundSchema,
} from '../schemas/sales-receipt'

const payment = {
  paymentModeId: 'mode_1',
  depositAccountId: 'acct_1',
}

const line = {
  itemId: 'item_1',
  description: 'Counter sale',
  quantity: 1,
  unitAmount: '10000',
  taxAmount: '0',
  discountAmount: '0',
}

describe('Sales Receipt schemas', () => {
  it('accepts a manual immediate sale and normalizes optional money fields', () => {
    const parsed = SalesReceiptCreateSchema.parse({
      ...payment,
      customerId: 'cus_1',
      currency: 'JMD',
      lines: [line],
    })

    expect(parsed.bankCharges).toBe(0n)
    expect(parsed.discountAmount).toBe(0n)
  })

  it('requires customer and lines for a manual Sales Receipt', () => {
    const parsed = SalesReceiptCreateSchema.safeParse(payment)

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['customerId', 'lines'])
    )
  })

  it('does not let quote conversion override historical commercial data', () => {
    const parsed = SalesReceiptCreateSchema.safeParse({
      ...payment,
      quoteId: 'quote_1',
      customerId: 'cus_2',
      currency: 'USD',
      lines: [line],
    })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['quoteId'] }),
      ])
    )
  })

  it('rejects duplicate returned quantities for the same receipt line', () => {
    const parsed = SalesReceiptRefundSchema.safeParse({
      amount: '2500',
      returnLines: [
        { salesReceiptLineId: 'srl_1', quantity: 1 },
        { salesReceiptLineId: 'srl_1', quantity: 1 },
      ],
    })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['returnLines', 1, 'salesReceiptLineId'],
        }),
      ])
    )
  })
})
