import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function ExpensesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('expenses')
  return children
}
