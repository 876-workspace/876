import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function UsersLayout({ children }: { children: ReactNode }) {
  const sessionUser = await requireSession('/users')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/users'])
  return <>{children}</>
}
