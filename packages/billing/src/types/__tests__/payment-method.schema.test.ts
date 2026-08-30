import { describe, expect, it } from 'vitest'

import {
  PaymentMethodSchema,
  DeletedPaymentMethodSchema,
  PaymentMethodListSchema,
} from '../payment-method.schema'

function validMethod(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment_method' as const,
    id: 'pm_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    type: 'CARD' as const,
    status: 'ACTIVE' as const,
    allowRedisplay: 'ALWAYS' as const,
    reusable: true,
    isDefault: false,
    billingDetails: null,
    card: { brand: 'visa', last4: '4242' },
    bankAccount: null,
    wallet: null,
    manual: null,
    fingerprint: null,
    displayLabel: 'Visa •••• 4242',
    expMonth: 12,
    expYear: 2030,
    provider: null,
    providerPaymentMethodId: null,
    providerConnectionId: null,
    detachedAt: null,
    metadata: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('PaymentMethodSchema', () => {
  it('accepts a valid payment method', () => {
    expect(PaymentMethodSchema.safeParse(validMethod()).success).toBe(true)
  })

  it('rejects credential field (never client-safe)', () => {
    const withCredential = {
      ...validMethod(),
      credential: { sealedValue: 'la1:secret' },
    } as any
    const result = PaymentMethodSchema.safeParse(withCredential)
    expect(result.success).toBe(false)
  })

  it('rejects unknown type', () => {
    expect(
      PaymentMethodSchema.safeParse(validMethod({ type: 'CRYPTO' } as any))
        .success
    ).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(
      PaymentMethodSchema.safeParse(validMethod({ status: 'UNKNOWN' } as any))
        .success
    ).toBe(false)
  })

  it('requires isDefault boolean', () => {
    expect(
      PaymentMethodSchema.safeParse(
        validMethod({ isDefault: undefined } as any)
      ).success
    ).toBe(false)
  })

  it('rejects unknown fields (strict)', () => {
    expect(
      PaymentMethodSchema.safeParse({ ...validMethod(), unknown: 'x' } as any)
        .success
    ).toBe(false)
  })

  it('validates each type enum', () => {
    for (const type of ['CARD', 'BANK_ACCOUNT', 'WALLET', 'MANUAL'] as const) {
      expect(PaymentMethodSchema.safeParse(validMethod({ type })).success).toBe(
        true
      )
    }
  })

  it('validates each status enum', () => {
    for (const status of [
      'PENDING',
      'ACTIVE',
      'REQUIRES_ACTION',
      'EXPIRED',
      'DETACHED',
      'FAILED',
    ] as const) {
      expect(
        PaymentMethodSchema.safeParse(validMethod({ status })).success
      ).toBe(true)
    }
  })
})

describe('PaymentMethodListSchema', () => {
  it('accepts a list envelope', () => {
    expect(
      PaymentMethodListSchema.safeParse({
        object: 'list',
        data: [validMethod()],
        has_more: false,
        url: '/api/v1/payment-methods',
        total_count: null,
      }).success
    ).toBe(true)
  })

  it('rejects list item with credential', () => {
    expect(
      PaymentMethodListSchema.safeParse({
        object: 'list',
        data: [{ ...validMethod(), credential: { sealedValue: 'x' } } as any],
        has_more: false,
        url: '/api/v1/payment-methods',
        total_count: null,
      }).success
    ).toBe(false)
  })
})

describe('DeletedPaymentMethodSchema', () => {
  it('accepts deleted tombstone', () => {
    expect(
      DeletedPaymentMethodSchema.safeParse({
        object: 'payment_method',
        id: 'pm_1',
        deleted: true,
      }).success
    ).toBe(true)
  })
  it('rejects missing deleted flag', () => {
    expect(
      DeletedPaymentMethodSchema.safeParse({
        object: 'payment_method',
        id: 'pm_1',
      } as any).success
    ).toBe(false)
  })
})
