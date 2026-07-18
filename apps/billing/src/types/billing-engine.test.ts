import { describe, expect, it } from 'vitest'

import { InvoiceFinalizeSchema } from './invoice'
import { PaymentCreateSchema } from './payment'
import { CouponCreateSchema } from './discount'
import { PaymentProviderConnectionCreateSchema } from './payment-provider'
import { SubscriptionCreateSchema } from './subscription'

describe('billing engine contracts', () => {
  it('accepts a standalone payment without invoice allocations', () => {
    const payment = PaymentCreateSchema.parse({
      customerId: 'cus_123',
      paymentModeId: 'pmode_123',
      depositAccountId: 'ba_123',
      amount: '10000',
      currency: 'JMD',
      paymentDate: 1_783_771_200,
    })

    expect(payment.allocations).toEqual([])
    expect(payment.bankCharges).toBe(0n)
  })

  it('defaults invoice credit application to an explicit opt-in', () => {
    expect(InvoiceFinalizeSchema.parse({}).autoApplyCredits).toBe(false)
  })

  it('defaults new subscriptions to provider-neutral invoice collection', () => {
    const subscription = SubscriptionCreateSchema.parse({
      customerId: 'cus_123',
      items: [{ priceId: 'prc_123' }],
    })

    expect(subscription).toMatchObject({
      status: 'DRAFT',
      collectionMethod: 'SEND_INVOICE',
      billingTiming: 'IN_ADVANCE',
      prorationBehavior: 'CREATE_PRORATIONS',
      autoApplyCredits: true,
    })
  })

  it('rejects zero-value discounts', () => {
    expect(
      CouponCreateSchema.safeParse({
        name: 'No discount',
        amountOff: '0',
        currency: 'JMD',
        duration: 'ONCE',
      }).success
    ).toBe(false)
  })

  it('rejects raw credentials in provider settings', () => {
    expect(
      PaymentProviderConnectionCreateSchema.safeParse({
        providerId: 'pprov_amber_pay',
        name: 'Amber Pay',
        settings: { apiKey: 'do-not-store-this' },
      }).success
    ).toBe(false)
  })
})
