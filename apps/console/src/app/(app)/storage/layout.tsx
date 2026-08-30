import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function StorageLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/storage')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/storage'])
  return <>{children}</>
}
