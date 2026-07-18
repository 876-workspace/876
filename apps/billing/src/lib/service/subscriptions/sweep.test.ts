import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  billSubscription: vi.fn(),
  enqueueSubscriptionNotification: vi.fn(),
  processDueAmendments: vi.fn(),
  processDueLifecycleSchedules: vi.fn(),
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: { findMany: vi.fn() },
    subscriptionPreference: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('./amendments', () => ({
  processDueAmendments: mocks.processDueAmendments,
}))
vi.mock('./bill', () => ({ billSubscription: mocks.billSubscription }))
vi.mock('./lifecycle', () => ({
  processDueLifecycleSchedules: mocks.processDueLifecycleSchedules,
}))
vi.mock('./notifications', () => ({
  enqueueSubscriptionNotification: mocks.enqueueSubscriptionNotification,
}))

import { processDueSubscriptions } from './sweep'

function dueSubscription(id: string) {
  return {
    id,
    customerId: 'cus_1',
    collectionMethod: 'SEND_INVOICE',
    nextBillingAt: 200,
    paymentTermId: null,
    taxBehavior: 'EXCLUSIVE',
    invoiceModeOverride: null,
    customer: { consolidatedBillingOverride: null },
    items: [{ currency: 'JMD' }],
  }
}

describe('processDueSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.processDueAmendments.mockResolvedValue({ processed: 0, failed: 0 })
    mocks.processDueLifecycleSchedules.mockResolvedValue({
      processed: 0,
      failed: 0,
    })
    mocks.prisma.invoice.updateMany.mockResolvedValue({ count: 0 })
  })

  it('processes schedules first and queues retry-safe advance failure notices', async () => {
    mocks.prisma.subscriptionPreference.findUnique.mockResolvedValue({
      automateAdvanceBilling: true,
      advanceBillingMethod: 'INVOICE',
      consolidatedBillingEnabled: false,
      notifyAdvanceBillingFailure: true,
    })
    mocks.prisma.subscription.findMany
      .mockResolvedValueOnce([{ id: 'sub_advance', nextBillingAt: 300 }])
      .mockResolvedValueOnce([dueSubscription('sub_due')])
    mocks.billSubscription
      .mockRejectedValueOnce(new Error('gateway unavailable'))
      .mockResolvedValueOnce({ status: 'succeeded', invoiceId: 'inv_1' })
    mocks.enqueueSubscriptionNotification.mockResolvedValue({ id: 'snot_1' })

    await expect(
      processDueSubscriptions('ten_1', { asOf: 200, limit: 10 })
    ).resolves.toEqual({
      object: 'billing_run_summary',
      asOf: 200,
      processed: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
      invoiceIds: ['inv_1'],
    })

    expect(mocks.processDueAmendments).toHaveBeenCalledWith('ten_1', 200)
    expect(mocks.processDueLifecycleSchedules).toHaveBeenCalledWith(
      'ten_1',
      200
    )
    expect(mocks.processDueAmendments.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.prisma.subscription.findMany.mock.invocationCallOrder[0]
    )
    expect(mocks.enqueueSubscriptionNotification).toHaveBeenCalledWith(
      mocks.prisma,
      expect.objectContaining({
        tenantId: 'ten_1',
        subscriptionId: 'sub_advance',
        type: 'ADVANCE_BILLING_FAILED',
        dedupeKey: 'advance-failure:sub_advance:300',
      })
    )
  })

  it('reuses one open invoice for compatible consolidated subscriptions', async () => {
    mocks.prisma.subscriptionPreference.findUnique.mockResolvedValue({
      automateAdvanceBilling: false,
      advanceBillingMethod: 'INVOICE',
      consolidatedBillingEnabled: true,
      notifyAdvanceBillingFailure: true,
    })
    mocks.prisma.subscription.findMany.mockResolvedValue([
      dueSubscription('sub_1'),
      dueSubscription('sub_2'),
    ])
    mocks.billSubscription.mockResolvedValue({
      status: 'succeeded',
      invoiceId: 'inv_1',
    })
    mocks.prisma.invoice.findUnique.mockResolvedValue({ status: 'OPEN' })

    const result = await processDueSubscriptions('ten_1', {
      asOf: 200,
      limit: 10,
    })

    expect(result.invoiceIds).toEqual(['inv_1'])
    expect(result.succeeded).toBe(2)
    expect(mocks.billSubscription).toHaveBeenNthCalledWith(
      2,
      'ten_1',
      'sub_2',
      200,
      { consolidateWithInvoiceId: 'inv_1' }
    )
  })
})
