import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function WidgetsLayout({ children }: { children: ReactNode }) {
  const sessionUser = await requireSession('/widgets')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/widgets'])
  return <>{children}</>
}
