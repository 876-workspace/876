import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { getPlatformClient } from '@/lib/clients/platform'
import { getContext } from '@/lib/auth/billing-context'
import { requireValidSession } from '@/lib/auth/guards'

import { CreateOrganization } from './_components/create-organization'
import { SetupButton } from './_components/setup-button'

export const metadata: Metadata = {
  title: 'Set up Billing',
  robots: { index: false, follow: false },
}

function GetStartedCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="border-border bg-card mb-8 rounded-2xl border p-7 shadow-sm">
          <div className="bg-primary/10 text-primary mb-5 flex size-12 items-center justify-center rounded-xl text-lg font-semibold">
            B
          </div>
          <p className="876-eyebrow mb-2">876 Billing</p>
          <PageHeader className="mb-7">
            <PageTitle className="mb-2">{title}</PageTitle>
            <PageDescription className="leading-relaxed">
              {description}
            </PageDescription>
          </PageHeader>
          {children}
        </div>
      </div>
    </main>
  )
}

export default async function GetStartedPage() {
  // A valid cookie is not a valid session. Get-started sits outside the guarded
  // app shell, so checking only the signature parked a deleted or disabled
  // account on the create-an-organization form it could never submit.
  const sessionUser = await requireValidSession('/get-started')

  const platform = await getPlatformClient()
  const context = await getContext()

  // Signed in but no organization yet — the brand-new-signup case. Create the
  // owner's organization first; the reload then lands on the workspace step.
  if (!context) {
    const suggestedName =
      [sessionUser.firstName, sessionUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || ''

    const currencyList = await platform.currencies.list()
    const currencies = (currencyList.data ?? []).map((currency) => ({
      code: currency.code,
      name: currency.name,
    }))

    return (
      <GetStartedCard
        title="Create your organization"
        description="876 Billing runs on your organization. Name it to get started — you can rename it later in settings."
      >
        <CreateOrganization
          suggestedName={suggestedName}
          currencies={
            currencies.length > 0
              ? currencies
              : [{ code: 'JMD', name: 'Jamaican Dollar' }]
          }
          defaultCurrency="JMD"
        />
      </GetStartedCard>
    )
  }

  if (context.tenant && context.accessStatus === 'active') redirect('/')
  if (context.accessStatus === 'blocked') redirect('/no-access')
  if (context.role === 'staff') redirect('/no-access')

  const organizationName = context.orgName ?? 'Your organization'
  const slug = `${context.orgSlug ?? 'billing'}-billing`

  if (context.tenant) {
    return (
      <GetStartedCard
        title="Activate 876 Billing"
        description="Your organization’s financial data is ready. Activate Billing to open the application."
      >
        <SetupButton workspaceExists />
      </GetStartedCard>
    )
  }

  // The workspace inherits the organization's single operating currency — it is
  // never chosen again here.
  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency = organization.data?.currency_code ?? 'JMD'

  return (
    <GetStartedCard
      title="Set up your workspace"
      description={`Create the Billing workspace for ${organizationName}. We will provision ${currency}, Tax Administration Jamaica, standard GCT, access roles, and payment modes. No invoices or payment collection are enabled automatically.`}
    >
      <SetupButton
        name={organizationName}
        slug={slug}
        defaultCurrency={currency}
        workspaceExists={false}
      />
    </GetStartedCard>
  )
}
