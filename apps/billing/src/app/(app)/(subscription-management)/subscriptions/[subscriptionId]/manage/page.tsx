import { notFound } from 'next/navigation'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { SubscriptionLifecycleForm } from '@/components/subscription-lifecycle-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'Manage subscription' }

export default async function ManageSubscriptionPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  const { subscriptionId } = await params
  const context = await requirePagePermission('subscriptions:write')
  const subscription = await resolveSubscription(
    context.tenant.id,
    subscriptionId
  )
  if (!subscription) notFound()

  return (
    <div className="max-w-4xl space-y-5">
      <section className="876-card p-5">
        <h2 className="876-section-title text-balance">Lifecycle management</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
          Schedule lifecycle changes without losing agreement or financial
          history.
        </p>
      </section>
      <SubscriptionLifecycleForm
        subscriptionId={subscription.id}
        status={subscription.status}
        cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
        remainingCycles={subscription.remainingCycles}
      />
    </div>
  )
}
