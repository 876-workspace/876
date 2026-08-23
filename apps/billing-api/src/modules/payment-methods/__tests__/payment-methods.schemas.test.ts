import { describe, expect, it } from 'vitest'

import {
  paymentMethodCreateSchema,
  paymentMethodListQuerySchema,
  paymentMethodUpdateSchema,
} from '../schemas'

describe('paymentMethodCreateSchema', () => {
  it('accepts a minimal CARD with vault credential', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CARD',
      card: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030 },
      credential: { storage: 'vault', value: '4111111111111111' },
    })
    expect(result.success).toBe(true)
  })

  it('accepts a MANUAL without credential', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'MANUAL',
      manual: { method: 'cash', displayName: 'Cash' },
    })
    expect(result.success).toBe(true)
  })

  it('accepts a WALLET with provider_token', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'WALLET',
      wallet: { type: 'apple_pay' },
      credential: {
        storage: 'provider_token',
        provider: 'stripe',
        providerConnectionId: 'conn_1',
        providerToken: 'tok_123',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts BANK_ACCOUNT with vault', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'BANK_ACCOUNT',
      bankAccount: { last4: '6789' },
      credential: { storage: 'vault', value: '0006789' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown type', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CRYPTO' as unknown as never,
    })
    expect(result.success).toBe(false)
  })

  it('rejects provider_token missing providerToken', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CARD',
      credential: {
        storage: 'provider_token',
        provider: 'stripe',
        providerConnectionId: 'conn_1',
      } as unknown as never,
    })
    expect(result.success).toBe(false)
  })

  it('rejects vault without value', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CARD',
      credential: { storage: 'vault' } as unknown as never,
    })
    expect(result.success).toBe(false)
  })

  it('rejects none credential with extra fields', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CARD',
      credential: { storage: 'none', value: 'extra' } as unknown as never,
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown fields (strict)', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CARD',
      unknownField: 'x' as unknown as never,
      credential: { storage: 'vault', value: 'pan' },
    })
    expect(result.success).toBe(false)
  })

  it('validates card last4 format', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'CARD',
      card: { brand: 'visa', last4: '42', expMonth: 12, expYear: 2030 },
      credential: { storage: 'vault', value: 'pan' },
    })
    expect(result.success).toBe(false)
  })

  it('validates manual method enum', () => {
    const result = paymentMethodCreateSchema.safeParse({
      customerId: 'cus_1',
      type: 'MANUAL',
      manual: { method: 'bitcoin' as unknown as never, displayName: 'BTC' },
    })
    expect(result.success).toBe(false)
  })
})

describe('paymentMethodUpdateSchema', () => {
  it('accepts a single field update', () => {
    expect(
      paymentMethodUpdateSchema.safeParse({ allowRedisplay: 'ALWAYS' }).success
    ).toBe(true)
    expect(
      paymentMethodUpdateSchema.safeParse({ billingDetails: { name: 'John' } })
        .success
    ).toBe(true)
    expect(
      paymentMethodUpdateSchema.safeParse({ metadata: { foo: 'bar' } }).success
    ).toBe(true)
  })

  it('rejects empty object', () => {
    expect(paymentMethodUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('rejects unknown field', () => {
    expect(
      paymentMethodUpdateSchema.safeParse({ unknown: 'x' } as unknown as never)
        .success
    ).toBe(false)
  })

  it('rejects invalid allowRedisplay', () => {
    expect(
      paymentMethodUpdateSchema.safeParse({
        allowRedisplay: 'INVALID' as unknown as never,
      }).success
    ).toBe(false)
  })
})

describe('paymentMethodListQuerySchema', () => {
  it('accepts empty query', () => {
    expect(paymentMethodListQuerySchema.safeParse({}).success).toBe(true)
  })

  it('coerces limit from string', () => {
    const result = paymentMethodListQuerySchema.safeParse({
      limit: '25' as unknown as never,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(25)
  })

  it('rejects limit out of range', () => {
    expect(paymentMethodListQuerySchema.safeParse({ limit: 0 }).success).toBe(
      false
    )
    expect(paymentMethodListQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false
    )
  })

  it('rejects invalid type', () => {
    expect(
      paymentMethodListQuerySchema.safeParse({
        type: 'INVALID' as unknown as never,
      }).success
    ).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(
      paymentMethodListQuerySchema.safeParse({
        status: 'UNKNOWN' as unknown as never,
      }).success
    ).toBe(false)
  })
})
