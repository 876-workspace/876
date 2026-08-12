import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function PurchasesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('purchases')
  return children
}
