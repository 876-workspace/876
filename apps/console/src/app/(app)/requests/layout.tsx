import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { ensurePlatformRequestWorkspace } from '@/lib/platform-org'

export default async function RequestsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/requests')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/requests']
  )
  await ensurePlatformRequestWorkspace()
  return <>{children}</>
}