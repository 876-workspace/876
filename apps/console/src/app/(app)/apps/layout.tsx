import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export default async function AppsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/apps')
  await requireConsolePermission(sessionUser.id, 'console:apps')

  return <>{children}</>
}
