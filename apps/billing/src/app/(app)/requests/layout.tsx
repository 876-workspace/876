import type { ReactNode } from 'react'

import {
  requireBillingFeature,
  requirePagePermission,
} from '@/lib/auth/billing-context'

export default async function RequestsLayout({
  children,
}: {
  children: ReactNode
}) {
  await Promise.all([
    requirePagePermission('customers:read'),
    requireBillingFeature('requests'),
  ])

  return children
}
