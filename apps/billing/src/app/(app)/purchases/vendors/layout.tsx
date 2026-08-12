import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function VendorsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('vendors')
  return children
}
