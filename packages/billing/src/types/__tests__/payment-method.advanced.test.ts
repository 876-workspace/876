import { describe, expect, it } from 'vitest'
import { PaymentMethodSchema, DeletedPaymentMethodSchema, PaymentMethodListSchema } from '../payment-method.schema'

// Data builder — realistic, centralized factory per guide 1.8-1.9
function aPaymentMethod(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment_method' as const,
    id: 'pm_2a8f9c1e3b4d4e6f',
    tenantId: 'ten_001',
    customerId: 'cus_9f2a1b',
    type: 'CARD' as const,
    status: 'ACTIVE' as const,
    allowRedisplay: 'ALWAYS' as const,
    reusable: true,
    isDefault: false,
    billingDetails: { name: 'Acme Inc', email: 'billing@acme.test' },
    card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
    bankAccount: null,
    wallet: null,
    manual: null,
    fingerprint: 'fp_abc123',
    displayLabel: 'Visa •••• 4242',
    expMonth: 12,
    expYear: 2030,
    provider: 'stripe',
    providerPaymentMethodId: 'pm_stripe_1',
    providerConnectionId: 'conn_1',
    detachedAt: null,
    metadata: { createdBy: 'console' },
    createdAt: 1_720_000_000,
    updatedAt: 1_720_000_001,
    ...overrides,
  }
}

function aList(count = 2) {
  return {
    object: 'list' as const,
    data: Array.from({ length: count }, (_, i) => aPaymentMethod({ id: `pm_${i+1}` })),
    has_more: false,
    url: '/api/v1/organizations/org_1/payment-methods',
    total_count: count,
  }
}

describe('PaymentMethodSchema / unit / schema validation', () => {
  it('accepts a realistic CARD payment method (happy path)', () => {
    // Arrange
    const input = aPaymentMethod()
    // Act
    const result = PaymentMethodSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    expect(result.data).toMatchInlineSnapshot(`
      {
        "allowRedisplay": "ALWAYS",
        "bankAccount": null,
        "billingDetails": {
          "email": "billing@acme.test",
          "name": "Acme Inc",
        },
        "card": {
          "brand": "visa",
          "exp_month": 12,
          "exp_year": 2030,
          "last4": "4242",
        },
        "createdAt": 1720000000,
        "customerId": "cus_9f2a1b",
        "detachedAt": null,
        "displayLabel": "Visa •••• 4242",
        "expMonth": 12,
        "expYear": 2030,
        "fingerprint": "fp_abc123",
        "id": "pm_2a8f9c1e3b4d4e6f",
        "isDefault": false,
        "manual": null,
        "metadata": {
          "createdBy": "console",
        },
        "object": "payment_method",
        "provider": "stripe",
        "providerConnectionId": "conn_1",
        "providerPaymentMethodId": "pm_stripe_1",
        "reusable": true,
        "status": "ACTIVE",
        "tenantId": "ten_001",
        "type": "CARD",
        "updatedAt": 1720000001,
        "wallet": null,
      }
    `)
  })

  it('rejects when credential leaks into client response (security contract)', () => {
    // Arrange
    const withCredential = aPaymentMethod({ credential: { sealedValue: 'la1:secret' } } as any)
    // Act
    const result = PaymentMethodSchema.safeParse(withCredential as any)
    // Assert
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toBeDefined()
  })

  it('rejects unexpected top-level fields via strictObject', () => {
    // Arrange
    const input = { ...aPaymentMethod(), unexpected: 'x' } as any
    // Act
    const result = PaymentMethodSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(false)
  })

  it.each([
    ['CARD'],
    ['BANK_ACCOUNT'],
    ['WALLET'],
    ['MANUAL'],
  ])('accepts type=%s', (type) => {
    // Arrange, Act, Assert — no branching logic in test body
    const result = PaymentMethodSchema.safeParse(aPaymentMethod({ type } as any))
    expect(result.success).toBe(true)
  })

  it.each([
    ['PENDING'],
    ['ACTIVE'],
    ['REQUIRES_ACTION'],
    ['EXPIRED'],
    ['DETACHED'],
    ['FAILED'],
  ])('accepts status=%s', (status) => {
    const result = PaymentMethodSchema.safeParse(aPaymentMethod({ status } as any))
    expect(result.success).toBe(true)
  })

  it.each([
    ['CRYPTO'],
    ['BANK'],
    ['CARD_TYPE_FAKE'],
    [''],
  ])('rejects invalid type %s (black-box — only public schema)', (type) => {
    expect(PaymentMethodSchema.safeParse(aPaymentMethod({ type } as any)).success).toBe(false)
  })

  it.each([
    ['UNKNOWN'],
    ['FAKE'],
    ['active'],
    [''],
  ])('rejects invalid status %s', (status) => {
    expect(PaymentMethodSchema.safeParse(aPaymentMethod({ status } as any)).success).toBe(false)
  })

  it('requires non-empty id, tenantId, customerId', () => {
    // Arrange
    const emptyId = aPaymentMethod({ id: '' })
    const emptyTenant = aPaymentMethod({ tenantId: '' })
    const emptyCustomer = aPaymentMethod({ customerId: '' })
    // Act & Assert
    expect(PaymentMethodSchema.safeParse(emptyId).success).toBe(false)
    expect(PaymentMethodSchema.safeParse(emptyTenant).success).toBe(false)
    expect(PaymentMethodSchema.safeParse(emptyCustomer).success).toBe(false)
  })

  it('allows nullable display fields to be null', () => {
    // Arrange
    const input = aPaymentMethod({ displayLabel: null, card: null, bankAccount: null, fingerprint: null, provider: null })
    // Act
    const result = PaymentMethodSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
  })
})

describe('PaymentMethod deleted tombstone / unit / strict', () => {
  it('accepts deleted payment method tombstone', () => {
    // Arrange
    const tombstone = { object: 'payment_method' as const, id: 'pm_1', deleted: true as const }
    // Act
    const result = DeletedPaymentMethodSchema.safeParse(tombstone)
    // Assert
    expect(result.success).toBe(true)
  })

  it('rejects deleted without id', () => {
    expect(DeletedPaymentMethodSchema.safeParse({ object: 'payment_method', deleted: true } as any).success).toBe(false)
  })

  it('rejects deleted with extra fields', () => {
    expect(DeletedPaymentMethodSchema.safeParse({ object: 'payment_method', id: 'pm_1', deleted: true, extra: 1 } as any).success).toBe(false)
  })
})

describe('PaymentMethodListSchema / contract / list envelope', () => {
  it('accepts a valid list envelope with has_more and url', () => {
    // Arrange
    const input = aList(3)
    // Act
    const result = PaymentMethodListSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    expect((result as any).data.data).toHaveLength(3)
  })

  it('rejects list with credential inside data', () => {
    const input = { ...aList(1), data: [{ ...aPaymentMethod(), credential: 'leak' } as any] }
    expect(PaymentMethodListSchema.safeParse(input as any).success).toBe(false)
  })

  it('produces stable inline snapshot for empty list (golden master)', () => {
    const input = { object: 'list' as const, data: [] as any[], has_more: false, url: '/api/v1/organizations/org_1/payment-methods', total_count: 0 }
    const result = PaymentMethodListSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).toMatchInlineSnapshot(`
      {
        "data": [],
        "has_more": false,
        "object": "list",
        "total_count": 0,
        "url": "/api/v1/organizations/org_1/payment-methods",
      }
    `)
  })
})
