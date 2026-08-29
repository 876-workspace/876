import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function SupportLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/support')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/support']
  )
  return <>{children}</>
}
