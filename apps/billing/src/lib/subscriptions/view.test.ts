import { describe, expect, it } from 'vitest'

import { buildSubscriptionTableRows } from './view'

describe('buildSubscriptionTableRows', () => {
  it('summarizes a multi-item agreement without losing product context', () => {
    const [row] = buildSubscriptionTableRows([
      {
        id: 'blsub_1',
        externalReference: 'sub_core_1',
        status: 'ACTIVE',
        currentPeriodEnd: 1_800_000_000,
        createdAt: 1_700_000_000,
        customer: {
          id: 'blcus_1',
          name: 'Efesto Technologies, Inc',
          customerType: 'CORE_ORGANIZATION',
        },
        items: [
          {
            quantity: 2,
            unitAmount: 5000n,
            currency: 'JMD',
            price: {
              intervalUnit: 'MONTH',
              intervalCount: 1,
              item: null,
              plan: {
                name: '876 Billing - Internal',
                product: { name: '876 Billing' },
              },
            },
          },
          {
            quantity: 1,
            unitAmount: 2500n,
            currency: 'JMD',
            price: {
              intervalUnit: 'MONTH',
              intervalCount: 1,
              item: { name: 'Priority support' },
              plan: null,
            },
          },
        ],
      } as never,
    ])

    expect(row).toEqual(
      expect.objectContaining({
        amount: '12500',
        currency: 'JMD',
        offering: {
          productName: '876 Billing',
          planName: '876 Billing - Internal',
          additionalItems: 1,
        },
      })
    )
  })
})
