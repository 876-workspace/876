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

  // A signed-in account with no organization has somewhere to go: it creates
  // one. Stranding it on /no-access is the defect `product-org-signup` exists
  // to prevent — no-access answers "not permitted", not "no org yet".
  const context = await getInvoiceContext()
  if (!context) redirect('/onboarding')

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
