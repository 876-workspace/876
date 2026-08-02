import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function QuotesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('quotes')
  return children
}
