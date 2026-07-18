import { describe, expect, it } from 'vitest'

import { PaymentCreateSchema } from './payment'

function validPayment() {
  return {
    customerId: 'cus_123',
    paymentModeId: 'pmode_123',
    depositAccountId: 'ba_123',
    amount: '10000',
    bankCharges: '100',
    currency: 'jmd',
    paymentDate: 1_788_825_600,
    referenceNumber: 'CHK-2048',
    allocations: [{ invoiceId: 'inv_123', amount: '9900' }],
  }
}

describe('PaymentCreateSchema', () => {
  it('normalizes currency and minor amounts', () => {
    const result = PaymentCreateSchema.parse(validPayment())

    expect(result.currency).toBe('JMD')
    expect(result.amount).toBe(10_000n)
    expect(result.bankCharges).toBe(100n)
    expect(result.allocations[0]?.amount).toBe(9_900n)
  })

  it('defaults bank charges to zero', () => {
    const input = validPayment()
    delete (input as Partial<typeof input>).bankCharges

    expect(PaymentCreateSchema.parse(input).bankCharges).toBe(0n)
  })

  it('rejects duplicate invoice allocations', () => {
    const input = validPayment()
    input.allocations.push({ invoiceId: 'inv_123', amount: '1' })

    expect(PaymentCreateSchema.safeParse(input).success).toBe(false)
  })

  it('rejects allocations above the payment amount', () => {
    const input = validPayment()
    input.allocations[0]!.amount = '10001'

    expect(PaymentCreateSchema.safeParse(input).success).toBe(false)
  })

  it('rejects bank charges that consume the payment', () => {
    const input = validPayment()
    input.bankCharges = input.amount

    expect(PaymentCreateSchema.safeParse(input).success).toBe(false)
  })
})
