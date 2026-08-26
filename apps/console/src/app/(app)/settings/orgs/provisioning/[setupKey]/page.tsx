import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { workspace } from '@/lib/876'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import { SetupHeader } from './_components/setup-header'

export const metadata = { title: 'Provisioning setup' }

type Props = { params: Promise<{ setupKey: string }> }

export default async function ProvisioningSetupPage({ params }: Props) {
  const { setupKey } = await params

  return (
    <Page className="space-y-6">
      <PageBreadcrumb
        href="/settings/orgs/provisioning"
        label="Provisioning setups"
        className="mb-4"
      />
      <Suspense fallback={<Skeleton className="h-20 w-full rounded-lg" />}>
        <SetupIdentity setupKey={setupKey} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <SetupDefaults setupKey={setupKey} />
      </Suspense>
    </Page>
  )
}

async function SetupIdentity({ setupKey }: { setupKey: string }) {
  const result = await workspace.provisioning.setups.retrieve(setupKey)
  if (result.error || !result.data) notFound()
  return <SetupHeader setup={result.data} />
}

async function SetupDefaults({ setupKey }: { setupKey: string }) {
  const [catalogResult, manifestResult] = await Promise.all([
    workspace.provisioning.catalog.retrieve('finance', setupKey),
    workspace.provisioning.draft.retrieve('finance', setupKey),
  ])
  if (catalogResult.error || !catalogResult.data)
    throw new Error(
      catalogResult.error?.message ?? 'Failed to load the finance catalog.'
    )
  if (manifestResult.error || !manifestResult.data)
    throw new Error(
      manifestResult.error?.message ?? 'Failed to load the setup defaults.'
    )

  return (
    <FinanceProvisioningEditor
      catalog={catalogResult.data}
      manifest={manifestResult.data}
      target={{ type: 'finance', key: setupKey }}
    />
  )
}
