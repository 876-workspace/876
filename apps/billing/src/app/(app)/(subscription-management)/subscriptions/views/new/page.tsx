import { PageBreadcrumb } from '@876/ui/page'

import { SubscriptionViewForm } from '@/components/subscription-view-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'New subscription view' }

export default async function NewSubscriptionViewPage() {
  await requirePagePermission('subscriptions:write')

  return (
    <div className="space-y-5">
      <PageBreadcrumb href="/subscriptions" label="Subscriptions" />
      <SubscriptionViewForm />
    </div>
  )
}
