import { describe, expect, it } from 'vitest'

import {
  paymentIntentCancelSchema,
  paymentIntentCreateSchema,
  paymentIntentListQuerySchema,
} from '../schemas'

describe('paymentIntentCreateSchema', () => {
  it('accepts minimal required fields and uppercases currency', () => {
    const result = paymentIntentCreateSchema.safeParse({
      customerId: 'cus_1',
      amount: 1000,
      currency: 'usd',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('USD')
      expect(result.data.amount).toBe(1000n)
    }
  })

  it('coerces amount from string', () => {
    const result = paymentIntentCreateSchema.safeParse({
      customerId: 'cus_1',
      amount: '5000' as unknown as never,
      currency: 'USD',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.amount).toBe(5000n)
  })

  it('rejects zero or negative amount', () => {
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 0,
        currency: 'USD',
      }).success
    ).toBe(false)
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: -100,
        currency: 'USD',
      }).success
    ).toBe(false)
  })

  it('rejects invalid currency length', () => {
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 100,
        currency: 'US',
      }).success
    ).toBe(false)
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 100,
        currency: 'USDT',
      }).success
    ).toBe(false)
  })

  it('accepts optional enums', () => {
    const result = paymentIntentCreateSchema.safeParse({
      customerId: 'cus_1',
      amount: 100,
      currency: 'USD',
      captureMethod: 'MANUAL',
      confirmationMethod: 'MANUAL',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid captureMethod', () => {
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 100,
        currency: 'USD',
        captureMethod: 'INVALID' as unknown as never,
      }).success
    ).toBe(false)
  })

  it('accepts paymentMethodTypes array', () => {
    const result = paymentIntentCreateSchema.safeParse({
      customerId: 'cus_1',
      amount: 100,
      currency: 'USD',
      paymentMethodTypes: ['card', 'bank_account'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 100,
        currency: 'USD',
        receiptEmail: 'not-an-email',
      }).success
    ).toBe(false)
  })

  it('rejects description over 500 chars', () => {
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 100,
        currency: 'USD',
        description: 'a'.repeat(501),
      }).success
    ).toBe(false)
  })

  it('rejects unknown field (strict)', () => {
    expect(
      paymentIntentCreateSchema.safeParse({
        customerId: 'cus_1',
        amount: 100,
        currency: 'USD',
        unknown: 'x' as unknown as never,
      }).success
    ).toBe(false)
  })
})

describe('paymentIntentCancelSchema', () => {
  it('accepts empty (all optional)', () => {
    expect(paymentIntentCancelSchema.safeParse({}).success).toBe(true)
  })

  it('accepts cancellationReason', () => {
    expect(
      paymentIntentCancelSchema.safeParse({ cancellationReason: 'fraud' })
        .success
    ).toBe(true)
  })

  it('rejects cancellationReason over 500', () => {
    expect(
      paymentIntentCancelSchema.safeParse({
        cancellationReason: 'a'.repeat(501),
      }).success
    ).toBe(false)
  })

  it('rejects unknown field', () => {
    expect(
      paymentIntentCancelSchema.safeParse({ unknown: 'x' } as unknown as never)
        .success
    ).toBe(false)
  })
})

describe('paymentIntentListQuerySchema', () => {
  it('accepts empty', () => {
    expect(paymentIntentListQuerySchema.safeParse({}).success).toBe(true)
  })

  it('accepts valid status', () => {
    expect(
      paymentIntentListQuerySchema.safeParse({ status: 'SUCCEEDED' }).success
    ).toBe(true)
    expect(
      paymentIntentListQuerySchema.safeParse({
        status: 'REQUIRES_CONFIRMATION',
      }).success
    ).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(
      paymentIntentListQuerySchema.safeParse({
        status: 'INVALID' as unknown as never,
      }).success
    ).toBe(false)
  })

  it('coerces limit', () => {
    const result = paymentIntentListQuerySchema.safeParse({
      limit: '10' as unknown as never,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(10)
  })

  it('rejects limit out of range', () => {
    expect(paymentIntentListQuerySchema.safeParse({ limit: 0 }).success).toBe(
      false
    )
    expect(paymentIntentListQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false
    )
  })
})
