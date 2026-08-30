import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function AppsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/apps')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/apps'])
  return <>{children}</>
}
