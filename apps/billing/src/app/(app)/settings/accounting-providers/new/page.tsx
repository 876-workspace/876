import { redirect } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { ConnectionCreateForm } from '../_components/connection-create-form'
import {
  canManageBilling,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { getAccountingProviderClient } from '@/lib/services/accounting-providers'

export const metadata = { title: 'Add Accounting Provider - Settings' }

export default async function NewAccountingProviderPage() {
  const context = await requirePagePermission('settings:read')
  if (!canManageBilling(context.role)) redirect('/no-access?reason=permission')

  const accounting = await getAccountingProviderClient()
  const providersResult = await accounting.accountingProviders.list()
  const providers = providersResult.data?.data ?? []

  return (
    <Page>
      <PageBreadcrumb
        href="/settings/accounting-providers"
        label="Accounting providers"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Add accounting provider</PageTitle>
        <PageDescription>
          Create a mirror connection first, then authorize the provider from
          the connections page. 876 Billing stays canonical.
        </PageDescription>
      </PageHeader>

      {providersResult.error ? (
        <div className="border-warning/30 bg-warning/5 text-warning mb-5 rounded-lg border px-4 py-3 text-sm">
          Provider catalog could not be loaded. {providersResult.error.message}
        </div>
      ) : null}

      <ConnectionCreateForm
        providers={providers.map((provider) => ({
          value: provider.id,
          label: provider.name,
        }))}
      />
    </Page>
  )
}
