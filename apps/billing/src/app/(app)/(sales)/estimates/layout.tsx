import type { ReactNode } from 'react'

import { requireBillingFeature } from '@/lib/auth/billing-context'

export default async function EstimatesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('estimates')
  return children
}
