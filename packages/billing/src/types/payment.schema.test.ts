import { describe, expect, it } from 'vitest'

import { PaymentSchema } from './payment.schema'

describe('PaymentSchema status', () => {
  it.each([
    'REQUIRES_ACTION',
    'AUTHORIZED',
    'PROCESSING',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'DISPUTED',
  ] as const)('accepts persisted payment status %s', (status) => {
    expect(PaymentSchema.shape.status.parse(status)).toBe(status)
  })
})
