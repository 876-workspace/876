import type { ReactNode } from 'react'

import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'

export function InvoiceShell({
  children,
  orgName,
  userEmail,
}: {
  children: ReactNode
  orgName: string
  userEmail?: string
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader orgName={orgName} userEmail={userEmail} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
