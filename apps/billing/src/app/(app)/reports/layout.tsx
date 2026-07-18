import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function ReportsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('reports:read')
  return children
}
