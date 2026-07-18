import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/id', () => ({
  generateId: () => 'notification_1',
}))

import { enqueueSubscriptionNotification } from './notifications'

describe('enqueueSubscriptionNotification', () => {
  it('uses a tenant-scoped dedupe key for retry-safe delivery', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'notification_1' })

    await enqueueSubscriptionNotification(
      { subscriptionNotificationOutbox: { upsert } } as never,
      {
        tenantId: 'ten_1',
        subscriptionId: 'sub_1',
        invoiceId: 'inv_1',
        type: 'DRAFT_INVOICE_READY',
        dedupeKey: 'draft-invoice:inv_1',
        payload: { invoiceId: 'inv_1' },
        createdAt: 100,
      }
    )

    expect(upsert).toHaveBeenCalledWith({
      where: {
        billing_subscription_notifications_dedupe_key: {
          tenantId: 'ten_1',
          dedupeKey: 'draft-invoice:inv_1',
        },
      },
      create: expect.objectContaining({
        id: 'notification_1',
        type: 'DRAFT_INVOICE_READY',
        createdAt: 100,
      }),
      update: {
        payload: { invoiceId: 'inv_1' },
        updatedAt: 100,
      },
    })
  })
})
