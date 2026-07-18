import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function SubscriptionsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('subscriptions:read')
  return children
}
