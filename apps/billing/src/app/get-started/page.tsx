import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { getContext } from '@/lib/auth/billing-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { SetupButton } from './setup-button'

export const metadata: Metadata = {
  title: 'Set up Billing',
  robots: { index: false, follow: false },
}

export default async function GetStartedPage() {
  const context = await getContext()
  if (!context) {
    const session = await getAuthSession()
    if (!isSignedSession(session))
      redirect(`/login?${AUTH_RETURN_TO_PARAM}=/get-started`)
    redirect('/no-access')
  }
  if (context.tenant && context.accessStatus === 'active') redirect('/')
  if (context.role === 'member' || context.accessStatus === 'blocked') {
    redirect('/no-access')
  }

  const organizationName = context.orgName ?? 'Your organization'
  const slug = `${context.orgSlug ?? 'billing'}-billing`

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="border-border bg-card mb-8 rounded-2xl border p-7 shadow-sm">
          <div className="bg-primary/10 text-primary mb-5 flex size-12 items-center justify-center rounded-xl text-lg font-semibold">
            B
          </div>
          <p className="876-eyebrow mb-2">876 Billing</p>
          <PageHeader className="mb-7">
            <PageTitle className="mb-2">Set up your workspace</PageTitle>
            <PageDescription className="leading-relaxed">
              Create the Billing workspace for {organizationName}. We will
              provision Jamaican dollars, English, Tax Administration Jamaica,
              standard GCT, access roles, and payment modes. No invoices or
              payment collection are enabled automatically.
            </PageDescription>
          </PageHeader>
          <SetupButton name={organizationName} slug={slug} />
        </div>
      </div>
    </main>
  )
}
