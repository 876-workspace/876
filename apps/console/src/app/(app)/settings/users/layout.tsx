import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

type Props = { children: ReactNode }

export default async function MembersLayout({ children }: Props) {
  const sessionUser = await requireSession('/settings/users')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/settings/users']
  )

  return <>{children}</>
}
