import type { ReactNode } from 'react'

import { requireAppPermission } from '@/lib/auth/require-crm-context'

export default async function RequestsLayout({ children }: { children: ReactNode }) {
  await requireAppPermission('requests.view')
  return children
}
