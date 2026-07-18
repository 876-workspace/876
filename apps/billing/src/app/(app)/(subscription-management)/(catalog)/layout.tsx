import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function SubscriptionCatalogLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')
  return children
}
