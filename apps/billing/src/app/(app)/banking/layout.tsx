import type { ReactNode } from 'react'

import {
  requireBillingFeature,
  requirePagePermission,
} from '@/lib/auth/billing-context'

export default async function BankingLayout({
  children,
}: {
  children: ReactNode
}) {
  await Promise.all([
    requirePagePermission('banking:read'),
    requireBillingFeature('banking'),
  ])
  return children
}
