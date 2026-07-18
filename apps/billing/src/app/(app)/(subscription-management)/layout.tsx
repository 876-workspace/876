import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function SubscriptionManagementLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('subscriptions')
  return children
}
