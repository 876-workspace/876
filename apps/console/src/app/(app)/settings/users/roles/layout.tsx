import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function RolesLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/settings/users/roles')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/settings/users/roles']
  )
  return <>{children}</>
}
