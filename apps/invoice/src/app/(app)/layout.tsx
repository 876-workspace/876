import { redirect } from 'next/navigation'

import { InvoiceShell } from '@/components/shell/shell'
import { getInvoiceContextResult } from '@/lib/auth/context'
import { requireValidSession } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireValidSession('/')

  const result = await getInvoiceContextResult()

  // A signed-in account with no organization has somewhere to go: it creates
  // one. Stranding it on /no-access is the defect `product-org-signup` exists
  // to prevent — no-access answers "not permitted", not "no org yet".
  if (result.status === 'no-organization') redirect('/onboarding')

  // A failed platform lookup is not an answer about this account. Send it to
  // onboarding, which reports the outage instead of asking for an org name.
  if (result.status !== 'ok') redirect('/onboarding')

  const context = result.context
  if (context.accessStatus !== 'active' && context.accessStatus !== 'trialing')
    redirect('/no-access?reason=subscription')

  const session = await getAuthSession()
  const email = isSignedSession(session) ? session.user.email : undefined

  return (
    <InvoiceShell orgName={context.orgName} userEmail={email}>
      {children}
    </InvoiceShell>
  )
}
