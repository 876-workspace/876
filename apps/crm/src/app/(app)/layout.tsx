import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { Shell } from '@/components/shell/shell'
import { getCrmContextResult } from '@/lib/auth/context'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const result = await getCrmContextResult()

  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'unavailable') redirect('/unavailable')
  if (result.status === 'no-organization') redirect('/onboarding')

  const { accessStatus, orgName, role } = result.context
  if (accessStatus === 'blocked') redirect('/no-access')
  if (accessStatus !== 'active' && accessStatus !== 'trialing') {
    if (role === 'owner' || role === 'admin') redirect('/onboarding')
    redirect('/no-access')
  }

  return <Shell orgName={orgName}>{children}</Shell>
}
