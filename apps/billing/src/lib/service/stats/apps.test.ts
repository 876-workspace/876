import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listAppStats, retrieveAppStats } from './apps'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  const plan = {
    id: 'blplan_monthly',
    code: 'monthly',
    name: 'Monthly',
    entitlementReferenceId: 'prod_monthly',
    intervalUnit: 'MONTH',
    intervalCount: 1,
  }

  return {
    id: 'blsub_1',
    sourceAppId: 'app_1',
    externalReference: 'sub_core_1',
    customerId: 'blcus_1',
    status: 'ACTIVE',
    startAt: 1_700_000_000,
    currentPeriodEnd: 1_702_678_400,
    createdAt: 1_700_000_000,
    customer: { name: 'Ada Lovelace' },
    items: [
      {
        quantity: 1,
        unitAmount: 1_200n,
        price: {
          unitAmount: 1_200n,
          priceType: 'RECURRING',
          plan,
        },
      },
    ],
    invoices: [],
    ...overrides,
  }
}

describe('app billing stats', () => {
  let findMany: ReturnType<typeof vi.fn>
  let findProduct: ReturnType<typeof vi.fn>

  beforeEach(() => {
    findMany = vi.fn().mockResolvedValue([])
    findProduct = vi.fn().mockResolvedValue(null)
    mockPrismaRef.current = {
      tenant: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ defaultCurrency: 'JMD' }),
      },
      product: { findFirst: findProduct },
      subscription: { findMany },
    }

    vi.clearAllMocks()
  })

  it('rolls up statuses, normalized MRR, customers, and invoice amounts', async () => {
    findMany.mockResolvedValue([
      subscriptionRow({
        id: 'blsub_active',
        customerId: 'blcus_shared',
        items: [
          {
            quantity: 2,
            unitAmount: 1_200n,
            price: {
              unitAmount: 9_999n,
              priceType: 'RECURRING',
              plan: {
                id: 'blplan_monthly',
                code: 'monthly',
                name: 'Monthly',
                entitlementReferenceId: 'prod_monthly',
                intervalUnit: 'MONTH',
                intervalCount: 1,
              },
            },
          },
        ],
        invoices: [{ totalAmount: 10_000n, amountDue: 2_500n }],
      }),
      subscriptionRow({
        id: 'blsub_trial',
        customerId: 'blcus_shared',
        status: 'TRIALING',
        items: [
          {
            quantity: 1,
            unitAmount: null,
            price: {
              unitAmount: 12_000n,
              priceType: 'RECURRING',
              plan: {
                id: 'blplan_yearly',
                code: 'yearly',
                name: 'Yearly',
                entitlementReferenceId: null,
                intervalUnit: 'YEAR',
                intervalCount: 1,
              },
            },
          },
        ],
        invoices: [{ totalAmount: 5_000n, amountDue: 0n }],
      }),
      subscriptionRow({
        id: 'blsub_canceled',
        customerId: 'blcus_other',
        status: 'CANCELED',
        invoices: [{ totalAmount: 2_000n, amountDue: 200n }],
      }),
      subscriptionRow({
        id: 'blsub_paused',
        customerId: 'blcus_other',
        status: 'PAUSED',
        invoices: [],
      }),
    ])

    await expect(listAppStats('blten_1')).resolves.toEqual([
      {
        object: 'app_billing_stats',
        sourceAppId: 'app_1',
        activeSubscriptions: 1,
        trialingSubscriptions: 1,
        canceledSubscriptions: 1,
        customerCount: 2,
        monthlyRecurringRevenue: '3400',
        currency: 'JMD',
        invoicedTotal: '17000',
        paidTotal: '14300',
        outstandingTotal: '2700',
      },
    ])
  })

  it('returns a zeroed detail when only an attributed product exists', async () => {
    findProduct.mockResolvedValue({ id: 'blprod_1' })

    await expect(retrieveAppStats('blten_1', 'app_empty')).resolves.toEqual({
      object: 'app_billing_stats',
      sourceAppId: 'app_empty',
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      canceledSubscriptions: 0,
      customerCount: 0,
      monthlyRecurringRevenue: '0',
      currency: 'JMD',
      invoicedTotal: '0',
      paidTotal: '0',
      outstandingTotal: '0',
      plans: [],
    })
  })

  it('returns null when neither subscriptions nor an attributed product exist', async () => {
    await expect(retrieveAppStats('blten_1', 'app_missing')).resolves.toBeNull()
  })

  it('orders recent plan subscribers and caps them at 50', async () => {
    findProduct.mockResolvedValue({ id: 'blprod_1' })
    findMany.mockImplementation(
      async (args: { orderBy?: { createdAt?: string } }) => {
        const rows = Array.from({ length: 51 }, (_, index) =>
          subscriptionRow({
            id: `blsub_${index}`,
            externalReference: index % 2 === 0 ? `core_${index}` : null,
            customerId: `blcus_${index}`,
            customer: { name: `Customer ${index}` },
            createdAt: index,
            startAt: index,
            currentPeriodEnd: index + 100,
            items: [
              {
                quantity: 1,
                unitAmount: 100n,
                price: {
                  unitAmount: 100n,
                  priceType: 'RECURRING',
                  plan: {
                    id: 'blplan_monthly',
                    code: 'monthly',
                    name: 'Monthly',
                    entitlementReferenceId: 'prod_monthly',
                    intervalUnit: 'MONTH',
                    intervalCount: 1,
                  },
                },
              },
            ],
          })
        )

        return args.orderBy?.createdAt === 'desc' ? rows.reverse() : rows
      }
    )

    const expectedSubscribers = Array.from({ length: 50 }, (_, offset) => {
      const index = 50 - offset

      return {
        object: 'plan_subscriber',
        subscriptionId: `blsub_${index}`,
        externalReference: index % 2 === 0 ? `core_${index}` : null,
        customerId: `blcus_${index}`,
        customerName: `Customer ${index}`,
        status: 'ACTIVE',
        startAt: index,
        currentPeriodEnd: index + 100,
        monthlyRecurringRevenue: '100',
      }
    })

    await expect(retrieveAppStats('blten_1', 'app_1')).resolves.toEqual({
      object: 'app_billing_stats',
      sourceAppId: 'app_1',
      activeSubscriptions: 51,
      trialingSubscriptions: 0,
      canceledSubscriptions: 0,
      customerCount: 51,
      monthlyRecurringRevenue: '5100',
      currency: 'JMD',
      invoicedTotal: '0',
      paidTotal: '0',
      outstandingTotal: '0',
      plans: [
        {
          object: 'plan_billing_stats',
          planId: 'blplan_monthly',
          code: 'monthly',
          name: 'Monthly',
          entitlementReferenceId: 'prod_monthly',
          activeSubscriptions: 51,
          trialingSubscriptions: 0,
          monthlyRecurringRevenue: '5100',
          subscribers: expectedSubscribers,
        },
      ],
    })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    )
  })
})
