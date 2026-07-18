import { notFound } from 'next/navigation'

import { SubscriptionsTable } from '@/app/(app)/(subscription-management)/subscriptions/subscriptions-table'
import { resolveCustomer } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'

export default async function CustomerSubscriptionsPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [customer, subscriptions] = await Promise.all([
    resolveCustomer(context.tenant.id, customerId),
    service.subscriptions.list(context.tenant.id, { customerId }),
  ])
  if (!customer) notFound()

  const rows = buildSubscriptionTableRows(subscriptions)

  return (
    <>
      {rows.length > 0 ? (
        <SubscriptionsTable
          subscriptions={rows}
          defaultCurrency={context.tenant.defaultCurrency}
          showCustomer={false}
        />
      ) : (
        <div className="876-card text-muted-foreground p-8 text-center text-sm">
          This customer has no subscriptions yet.
        </div>
      )}
    </>
  )
}
