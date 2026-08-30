import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function FeaturesLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/features')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/features'])
  return <>{children}</>
}
