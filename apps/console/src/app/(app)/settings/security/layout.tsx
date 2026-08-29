import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function SettingsSecurityLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/settings/security')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/settings/security']
  )
  return <>{children}</>
}
