import { describe, expect, it } from 'vitest'

import {
  PaymentIntentSchema,
  PaymentIntentListSchema,
} from '../payment-intent.schema'

function validIntent(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment_intent' as const,
    id: 'pi_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    invoiceId: null,
    subscriptionId: null,
    amount: '1000',
    amountCapturable: '0',
    amountReceived: '0',
    currency: 'USD',
    status: 'REQUIRES_CONFIRMATION' as const,
    captureMethod: 'AUTOMATIC' as const,
    confirmationMethod: 'AUTOMATIC' as const,
    paymentMethodId: 'pm_1',
    mandateId: null,
    paymentMethodTypes: ['card'],
    setupFutureUsage: 'off_session',
    description: null,
    receiptEmail: null,
    statementDescriptor: null,
    statementDescriptorSuffix: null,
    lastPaymentError: null,
    nextAction: null,
    processing: null,
    attemptCount: 0,
    latestPaymentId: null,
    latestAttemptId: null,
    canceledAt: null,
    cancellationReason: null,
    provider: null,
    providerConnectionId: null,
    providerIntentId: null,
    idempotencyKey: null,
    metadata: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('PaymentIntentSchema', () => {
  it('accepts a valid payment intent', () => {
    expect(PaymentIntentSchema.safeParse(validIntent()).success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(
      PaymentIntentSchema.safeParse(validIntent({ status: 'INVALID' } as any))
        .success
    ).toBe(false)
  })

  it('rejects invalid currency length', () => {
    expect(
      PaymentIntentSchema.safeParse(validIntent({ currency: 'US' } as any))
        .success
    ).toBe(false)
    expect(
      PaymentIntentSchema.safeParse(validIntent({ currency: 'USDT' } as any))
        .success
    ).toBe(false)
  })

  it('rejects non-string amount', () => {
    expect(
      PaymentIntentSchema.safeParse(validIntent({ amount: 1000 } as any))
        .success
    ).toBe(false)
  })

  it('validates each status enum', () => {
    for (const status of [
      'REQUIRES_PAYMENT_METHOD',
      'REQUIRES_CONFIRMATION',
      'REQUIRES_ACTION',
      'PROCESSING',
      'REQUIRES_CAPTURE',
      'SUCCEEDED',
      'CANCELED',
    ] as const) {
      expect(
        PaymentIntentSchema.safeParse(validIntent({ status })).success
      ).toBe(true)
    }
  })

  it('rejects unknown fields (strict)', () => {
    expect(
      PaymentIntentSchema.safeParse({ ...validIntent(), unknown: 'x' } as any)
        .success
    ).toBe(false)
  })

  it('requires object discriminator', () => {
    expect(
      PaymentIntentSchema.safeParse({
        ...validIntent(),
        object: 'charge',
      } as any).success
    ).toBe(false)
  })
})

describe('PaymentIntentListSchema', () => {
  it('accepts a list envelope', () => {
    expect(
      PaymentIntentListSchema.safeParse({
        object: 'list',
        data: [validIntent()],
        has_more: false,
        url: '/api/v1/payment-intents',
        total_count: null,
      }).success
    ).toBe(true)
  })
})
