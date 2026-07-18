import { notFound } from 'next/navigation'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'

export default async function SubscriptionActivityPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  const { subscriptionId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const subscription = await resolveSubscription(
    context.tenant.id,
    subscriptionId
  )
  if (!subscription) notFound()

  return (
    <>
      <section className="876-card p-5">
        <ol className="space-y-3">
          {subscription.events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span>{event.type.toLowerCase().replaceAll('_', ' ')}</span>
              <span className="text-muted-foreground text-xs">
                {formatDate(event.occurredAt)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
