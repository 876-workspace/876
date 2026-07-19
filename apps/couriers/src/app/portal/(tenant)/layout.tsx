import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getPortalTenant } from '@/lib/portal/tenant'

export default async function TenantPortalLayout({
  children,
}: {
  children: ReactNode
}) {
  const tenant = await getPortalTenant()
  if (!tenant) redirect('/portal/unavailable')

  return children
}
