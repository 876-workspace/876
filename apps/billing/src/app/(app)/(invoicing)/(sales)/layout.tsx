import type { ReactNode } from 'react'

import {
  requireBillingFeature,
  requirePagePermission,
} from '@/lib/auth/billing-context'

export default async function SalesLayout({
  children,
}: {
  children: ReactNode
}) {
  await Promise.all([
    requirePagePermission('sales:read'),
    requireBillingFeature('sales'),
  ])
  return children
}
