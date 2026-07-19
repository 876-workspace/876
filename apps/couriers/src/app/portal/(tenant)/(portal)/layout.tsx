import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { PortalHeader } from '@/components/portal/portal-header'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getPortalTenant } from '@/lib/portal/tenant'

export default async function CustomerPortalLayout({
  children,
}: {
  children: ReactNode
}) {
  const [tenant, session] = await Promise.all([
    getPortalTenant(),
    getAuthSession(),
  ])
  if (!tenant) redirect('/portal/unavailable')

  const user = isSignedSession(session) ? session.user : null

  return (
    <div className="bg-muted/20 flex min-h-dvh flex-col">
      <PortalHeader tenantName={tenant.name} user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="text-muted-foreground border-t px-4 py-6 text-center text-xs">
        Powered by 876
      </footer>
    </div>
  )
}
