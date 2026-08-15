import { redirect } from 'next/navigation'

import { InvoiceShell } from '@/components/shell/shell'
import { getInvoiceContext } from '@/lib/auth/context'
import { requireValidSession } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireValidSession('/')

  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  if (
    context.accessStatus !== 'active' &&
    context.accessStatus !== 'trialing'
  ) {
    redirect('/no-access?reason=subscription')
  }

  const session = await getAuthSession()
  const email = isSignedSession(session) ? session.user.email : undefined

  return (
    <InvoiceShell orgName={context.orgName} userEmail={email}>
      {children}
    </InvoiceShell>
  )
}
