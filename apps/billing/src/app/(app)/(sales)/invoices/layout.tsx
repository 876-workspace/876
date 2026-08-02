import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function InvoicesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('invoices')
  return children
}
