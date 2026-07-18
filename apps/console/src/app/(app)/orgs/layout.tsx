import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export default async function OrgsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/orgs')
  await requireConsolePermission(sessionUser.id, 'console:organizations')

  return <>{children}</>
}
