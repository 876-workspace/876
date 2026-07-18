import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/settings/users')
  await requireConsolePermission(sessionUser.id, 'console:settings')

  return <>{children}</>
}
