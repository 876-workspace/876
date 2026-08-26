import { Suspense } from 'react'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { workspace } from '@/lib/876'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import { ProvisioningNav } from './_components/provisioning-nav'

export const metadata = { title: 'Provisioning defaults' }

export default function FinanceProvisioningPage() {
  return (
    <Page className="space-y-6">
      <div>
        <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
        <h1 className="876-page-title">Provisioning defaults</h1>
      </div>
      <div className="border-border border-b pb-px">
        <ProvisioningNav />
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <FinanceProvisioningData />
      </Suspense>
    </Page>
  )
}

async function FinanceProvisioningData() {
  const [catalogResult, manifestResult] = await Promise.all([
    workspace.provisioning.catalog.retrieve('finance', 'shared'),
    workspace.provisioning.draft.retrieve('finance', 'shared'),
  ])
  if (catalogResult.error || !catalogResult.data)
    throw new Error(
      catalogResult.error?.message ?? 'Failed to load finance catalog.'
    )
  if (manifestResult.error || !manifestResult.data)
    throw new Error(
      manifestResult.error?.message ?? 'Failed to load finance defaults.'
    )

  return (
    <FinanceProvisioningEditor
      catalog={catalogResult.data}
      manifest={manifestResult.data}
    />
  )
}
