import type { ReactNode } from 'react'

import { requirePagePermission } from '@/lib/auth/billing-context'

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('settings:read')
  return children
}
