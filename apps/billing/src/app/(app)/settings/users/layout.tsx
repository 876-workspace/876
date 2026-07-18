import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function UsersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('members:read')
  return children
}
