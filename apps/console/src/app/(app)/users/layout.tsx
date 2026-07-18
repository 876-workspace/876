import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export default async function UsersLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/users')
  await requireConsolePermission(sessionUser.id, 'console:users')

  return <>{children}</>
}
