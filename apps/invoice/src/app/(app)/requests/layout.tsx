import type { ReactNode } from 'react'

import { requireAppCapability } from '@/lib/auth/guards'
import { INVOICE_REQUESTS_SLUG } from '@/lib/features'

export default async function RequestsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAppCapability({
    permission: 'requests.view',
    feature: INVOICE_REQUESTS_SLUG,
  })

  return children
}
