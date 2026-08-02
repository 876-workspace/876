import { notFound } from 'next/navigation'

import { InvoicesTable } from '@/features/documents/components/invoices-table'
import { resolveSubscription } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function SubscriptionInvoicesPage({
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
      {subscription.invoices.length > 0 ? (
        <InvoicesTable invoices={subscription.invoices} />
      ) : (
        <div className="876-card text-muted-foreground p-8 text-center text-sm">
          This subscription has no invoices yet.
        </div>
      )}
    </>
  )
}
