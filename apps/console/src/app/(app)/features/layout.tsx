import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'

export default async function FeaturesLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/features')
  await requireConsolePermission(sessionUser.id, 'console:features')

  return <>{children}</>
}
