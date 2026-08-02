import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function CreditNotesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('sales')
  return children
}
