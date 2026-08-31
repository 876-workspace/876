import { describe, expect, it } from 'vitest'

import {
  PaymentModeListSchema,
  PaymentModeSchema,
} from '../payment-mode.schema'

function paymentMode() {
  return {
    object: 'payment_mode' as const,
    id: 'pmode_1',
    tenantId: 'ten_internal',
    name: 'Bank transfer',
    isDefault: false,
    isActive: true,
    isSystem: true,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('PaymentModeSchema', () => {
  it('strips backend-only fields from serialized Prisma rows', () => {
    const result = PaymentModeSchema.parse(paymentMode())

    expect(result).not.toHaveProperty('tenantId')
    expect(result).toEqual({
      object: 'payment_mode',
      id: 'pmode_1',
      name: 'Bank transfer',
      isDefault: false,
      isActive: true,
      isSystem: true,
      createdAt: 1,
      updatedAt: 1,
    })
  })

  it('validates payment mode list envelopes', () => {
    expect(
      PaymentModeListSchema.safeParse({
        object: 'list',
        data: [paymentMode()],
        has_more: false,
        total_count: 1,
        url: '/api/v1/payments/modes',
      }).success
    ).toBe(true)
  })
})
