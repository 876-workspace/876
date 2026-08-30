import { describe, expect, it } from 'vitest'
import {
  PaymentIntentSchema,
  PaymentIntentListSchema,
} from '../payment-intent.schema'

function aPaymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment_intent' as const,
    id: 'pi_abc123',
    tenantId: 'ten_001',
    customerId: 'cus_9f2a1b',
    invoiceId: 'inv_001',
    subscriptionId: 'sub_001',
    amount: '2500',
    amountCapturable: '0',
    amountReceived: '0',
    currency: 'USD',
    status: 'REQUIRES_PAYMENT_METHOD' as const,
    captureMethod: 'AUTOMATIC' as const,
    confirmationMethod: 'AUTOMATIC' as const,
    paymentMethodId: 'pm_1',
    mandateId: null,
    paymentMethodTypes: ['card'],
    setupFutureUsage: 'off_session',
    description: 'Invoice payment',
    receiptEmail: 'billing@acme.test',
    statementDescriptor: 'ACME',
    statementDescriptorSuffix: null,
    lastPaymentError: null,
    nextAction: null,
    processing: null,
    attemptCount: 0,
    latestPaymentId: null,
    latestAttemptId: null,
    canceledAt: null,
    cancellationReason: null,
    provider: 'stripe',
    providerConnectionId: 'conn_1',
    providerIntentId: 'pi_stripe_1',
    idempotencyKey: 'idem_1',
    metadata: null,
    createdAt: 1_720_000_000,
    updatedAt: 1_720_000_000,
    ...overrides,
  }
}

describe('PaymentIntentSchema / unit / core validation', () => {
  it('accepts realistic requires_payment_method intent', () => {
    // Arrange
    const input = aPaymentIntent()
    // Act
    const result = PaymentIntentSchema.safeParse(input)
    // Assert
    expect(result.success).toBe(true)
    expect(result.data).toMatchInlineSnapshot(`
      {
        "amount": "2500",
        "amountCapturable": "0",
        "amountReceived": "0",
        "attemptCount": 0,
        "canceledAt": null,
        "cancellationReason": null,
        "captureMethod": "AUTOMATIC",
        "confirmationMethod": "AUTOMATIC",
        "createdAt": 1720000000,
        "currency": "USD",
        "customerId": "cus_9f2a1b",
        "description": "Invoice payment",
        "id": "pi_abc123",
        "idempotencyKey": "idem_1",
        "invoiceId": "inv_001",
        "lastPaymentError": null,
        "latestAttemptId": null,
        "latestPaymentId": null,
        "mandateId": null,
        "metadata": null,
        "nextAction": null,
        "object": "payment_intent",
        "paymentMethodId": "pm_1",
        "paymentMethodTypes": [
          "card",
        ],
        "processing": null,
        "provider": "stripe",
        "providerConnectionId": "conn_1",
        "providerIntentId": "pi_stripe_1",
        "receiptEmail": "billing@acme.test",
        "setupFutureUsage": "off_session",
        "statementDescriptor": "ACME",
        "statementDescriptorSuffix": null,
        "status": "REQUIRES_PAYMENT_METHOD",
        "subscriptionId": "sub_001",
        "tenantId": "ten_001",
        "updatedAt": 1720000000,
      }
    `)
  })

  it('rejects invalid status (strict enum)', () => {
    const result = PaymentIntentSchema.safeParse(
      aPaymentIntent({ status: 'UNKNOWN' } as any)
    )
    expect(result.success).toBe(false)
  })

  it.each([
    'REQUIRES_PAYMENT_METHOD',
    'REQUIRES_CONFIRMATION',
    'REQUIRES_ACTION',
    'PROCESSING',
    'REQUIRES_CAPTURE',
    'SUCCEEDED',
    'CANCELED',
  ])('accepts status %s', (status) => {
    expect(
      PaymentIntentSchema.safeParse(aPaymentIntent({ status } as any)).success
    ).toBe(true)
  })

  it('rejects currency not exactly 3 chars', () => {
    expect(
      PaymentIntentSchema.safeParse(aPaymentIntent({ currency: 'US' } as any))
        .success
    ).toBe(false)
    expect(
      PaymentIntentSchema.safeParse(aPaymentIntent({ currency: 'USDT' } as any))
        .success
    ).toBe(false)
  })

  it('allows nullable provider fields', () => {
    const input = aPaymentIntent({
      provider: null,
      providerIntentId: null,
      providerConnectionId: null,
      invoiceId: null,
      subscriptionId: null,
      paymentMethodId: null,
    })
    expect(PaymentIntentSchema.safeParse(input).success).toBe(true)
  })

  it('rejects extra top-level credential field (strict)', () => {
    const input = { ...aPaymentIntent(), credential: 'leak' } as any
    expect(PaymentIntentSchema.safeParse(input).success).toBe(false)
  })

  it('requires amount as string (minor amount serialized)', () => {
    expect(
      PaymentIntentSchema.safeParse(aPaymentIntent({ amount: 2500 } as any))
        .success
    ).toBe(false)
    expect(
      PaymentIntentSchema.safeParse(aPaymentIntent({ amount: '2500' } as any))
        .success
    ).toBe(true)
  })

  it('validates captureMethod enum', () => {
    expect(
      PaymentIntentSchema.safeParse(
        aPaymentIntent({ captureMethod: 'MANUAL' } as any)
      ).success
    ).toBe(true)
    expect(
      PaymentIntentSchema.safeParse(
        aPaymentIntent({ captureMethod: 'INVALID' } as any)
      ).success
    ).toBe(false)
  })
})

describe('PaymentIntentListSchema / contract / envelope', () => {
  it('parses valid list envelope', () => {
    const input = {
      object: 'list' as const,
      data: [aPaymentIntent({ id: 'pi_1' }), aPaymentIntent({ id: 'pi_2' })],
      has_more: false,
      url: '/api/v1/organizations/org_1/payment-intents',
      total_count: 2,
    }
    expect(PaymentIntentListSchema.safeParse(input).success).toBe(true)
  })

  it('rejects list with invalid item', () => {
    const input = {
      object: 'list' as const,
      data: [{ ...aPaymentIntent(), status: 'BAD' } as any],
      has_more: false,
      url: '/api/v1/organizations/org_1/payment-intents',
      total_count: 1,
    }
    expect(PaymentIntentListSchema.safeParse(input).success).toBe(false)
  })

  it('produces stable snapshot for empty list', () => {
    const input = {
      object: 'list' as const,
      data: [] as any[],
      has_more: false,
      url: '/api/v1/organizations/org_1/payment-intents',
      total_count: 0,
    }
    const result = PaymentIntentListSchema.safeParse(input)
    expect(result.data).toMatchInlineSnapshot(`
      {
        "data": [],
        "has_more": false,
        "object": "list",
        "total_count": 0,
        "url": "/api/v1/organizations/org_1/payment-intents",
      }
    `)
  })
})
