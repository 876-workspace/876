import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function RolesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('roles:read')
  return children
}
