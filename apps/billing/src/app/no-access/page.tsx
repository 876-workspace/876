import { redirect } from 'next/navigation'

import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { getWorkspaceContext } from '@/lib/auth/billing-context'

export const metadata = { title: 'Access restricted' }

export default async function NoAccessPage() {
  const context = await getWorkspaceContext()
  if (context) redirect('/')

  return (
    <Page className="mx-auto max-w-2xl py-16">
      <PageHeader>
        <PageTitle>Billing access is restricted</PageTitle>
        <PageDescription>
          Ask a Billing owner to grant the required workspace role, or review
          the organization&apos;s Billing subscription.
        </PageDescription>
      </PageHeader>
    </Page>
  )
}
