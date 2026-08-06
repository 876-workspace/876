import { Suspense } from 'react'
import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import { ProvisioningNav } from './_components/provisioning-nav'

export const metadata = { title: 'Provisioning defaults' }

/**
 * The heading and the section nav are known without fetching anything, so they
 * render on the click. Only the editor waits on the catalog and manifest.
 *
 * This is what lets `/orgs` drop its segment-level `loading.tsx`: with the
 * chrome static, this route no longer needs an ancestor boundary to cover it,
 * and that ancestor was flashing a detail-page header over the orgs list.
 */
export default function FinanceProvisioningPage() {
  return (
    <Page className="space-y-6">
      <div>
        <p className="876-eyebrow">Organizations</p>
        <h1 className="876-page-title mt-1">Provisioning defaults</h1>
      </div>
      <ProvisioningNav current="defaults" />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <FinanceProvisioningData />
      </Suspense>
    </Page>
  )
}

async function FinanceProvisioningData() {
  const [catalogResult, manifestResult] = await Promise.all([
    $876.provisioning.retrieveCatalog('finance', 'shared'),
    $876.provisioning.retrieve('finance', 'shared'),
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
