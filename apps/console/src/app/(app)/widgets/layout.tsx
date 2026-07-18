import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export default async function WidgetsLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await requireSession('/widgets')
  await requireConsolePermission(session.id, 'console:widgets')
  return <>{children}</>
}
