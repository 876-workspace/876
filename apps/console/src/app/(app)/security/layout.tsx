import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function SecurityLayout({ children }: { children: ReactNode }) {
  const sessionUser = await requireSession('/security')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/security']
  )
  return <>{children}</>
}
