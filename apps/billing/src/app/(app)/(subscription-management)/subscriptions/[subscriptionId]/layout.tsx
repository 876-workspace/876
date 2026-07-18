import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { resolveSubscription } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'
import { SubscriptionDetailActions } from '@/components/subscription-detail-actions'

export default async function SubscriptionDetailLayout({
  children,
  params,
}: {
  children: ReactNode
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

  const base = `/subscriptions/${subscription.id}`

  return (
    <DetailLayout
      backHref="/subscriptions"
      backLabel="Subscriptions"
      eyebrow="Commercial agreement"
      title={row.offering.productName}
      description={`${row.offering.planName ?? 'Custom subscription'} · ${row.customer.name}`}
      status={row.status.toLowerCase()}
      statusVariant="secondary"
      actions={
        context.permissions.includes('subscriptions:write') ? (
          <SubscriptionDetailActions id={subscription.id} />
        ) : null
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        ...(context.permissions.includes('subscriptions:write')
          ? [{ label: 'Management', href: `${base}/manage` }]
          : []),
        { label: 'Items', href: `${base}/items` },
        { label: 'Invoices', href: `${base}/invoices` },
        { label: 'Billing', href: `${base}/billing` },
        { label: 'Activity', href: `${base}/activity` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
