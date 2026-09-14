import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Shell } from '@/components/shell/shell'
import {
  redirectForCommerceAccess,
  resolveCommerceAccess,
} from '@/lib/auth/guards'
import { getCommerceContextResult } from '@/lib/auth/context'
export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getCommerceContextResult()
  if (context.status === 'signed-out') return redirect('/login')
  if (context.status === 'wrong-account') return redirect('/wrong-account')
  if (context.status === 'no-organization') return redirect('/onboarding')
  if (context.status === 'unavailable') redirect('/unavailable')

  redirectForCommerceAccess(
    resolveCommerceAccess({
      signedIn: true,
      enterpriseRealm: true,
      hasOrganization: true,
      isAdmin: context.isAdmin,
      accessStatus: context.accessStatus,
    })
  )

  return <Shell>{children}</Shell>
}
