import { notFound } from 'next/navigation'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'

export default async function SubscriptionItemsPage({
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

  const [row] = buildSubscriptionTableRows([subscription])
  if (!row) notFound()
  const currency = row.currency ?? context.tenant.defaultCurrency

  return (
    <>
      <section className="876-card overflow-hidden">
        <div className="divide-border divide-y">
          {subscription.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">
                  {item.price.plan?.product.name ??
                    item.price.item?.name ??
                    'Custom price'}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.price.plan?.name ??
                    item.price.nickname ??
                    item.price.id}
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                Qty {item.quantity}
              </p>
              <p className="font-medium">
                {formatMoney(
                  item.unitAmount?.toString(),
                  item.currency ?? currency
                )}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
