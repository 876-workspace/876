import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@876/ui/page'

import { SubscriptionViewForm } from '@/components/subscription-view-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Edit subscription view' }

export default async function EditSubscriptionViewPage({
  params,
}: {
  params: Promise<{ viewId: string }>
}) {
  const { viewId } = await params
  const context = await requirePagePermission('subscriptions:write')
  const views = await service.subscriptions.views.list(
    context.tenant.id,
    context.userId
  )
  const view = views.find(
    (entry) => entry.id === viewId && entry.ownerUserId === context.userId
  )
  if (!view) notFound()

  return (
    <div className="space-y-5">
      <PageBreadcrumb
        href={`/subscriptions?view=${encodeURIComponent(viewId)}`}
        label={view.name}
      />
      <SubscriptionViewForm
        viewId={viewId}
        initial={{
          name: view.name,
          visibility: view.visibility,
          isFavorite: view.isFavorite,
          sortField:
            view.sortField === 'createdAt' ||
            view.sortField === 'currentPeriodEnd' ||
            view.sortField === 'status'
              ? view.sortField
              : null,
          sortDirection:
            view.sortDirection === 'asc' || view.sortDirection === 'desc'
              ? view.sortDirection
              : null,
          rules: view.rules.map((rule) => ({
            field: rule.field as
              | 'status'
              | 'customerId'
              | 'customerName'
              | 'currency'
              | 'collectionMethod'
              | 'billingTiming'
              | 'taxBehavior'
              | 'createdAt'
              | 'currentPeriodEnd',
            operator: rule.operator,
            value: rule.value ?? '',
          })),
          columns: view.columns.map((column) => column.field),
        }}
      />
    </div>
  )
}
