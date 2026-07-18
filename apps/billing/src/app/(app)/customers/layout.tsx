import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function CustomersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('customers:read')
  return children
}
