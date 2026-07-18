import type { PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'

type NotificationStore = Pick<
  PrismaTransaction,
  'subscriptionNotificationOutbox'
>

export function enqueueSubscriptionNotification(
  db: NotificationStore,
  params: {
    tenantId: string
    subscriptionId: string | null
    invoiceId: string | null
    type: 'DRAFT_INVOICE_READY' | 'ADVANCE_BILLING_FAILED'
    dedupeKey: string
    payload?: Record<string, string | number | boolean | null>
    createdAt: number
  }
) {
  return db.subscriptionNotificationOutbox.upsert({
    where: {
      billing_subscription_notifications_dedupe_key: {
        tenantId: params.tenantId,
        dedupeKey: params.dedupeKey,
      },
    },
    create: {
      id: generateId('SubscriptionNotificationOutbox'),
      tenantId: params.tenantId,
      subscriptionId: params.subscriptionId,
      invoiceId: params.invoiceId,
      type: params.type,
      dedupeKey: params.dedupeKey,
      payload: params.payload,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
    },
    update: {
      payload: params.payload,
      updatedAt: params.createdAt,
    },
  })
}
