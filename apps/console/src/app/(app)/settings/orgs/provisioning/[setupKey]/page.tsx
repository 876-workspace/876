import { Suspense } from 'react'
import { notFound } from 'next/navigation'

import { workspace } from '@/lib/services/workspace'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import {
  toFinanceCurrencyOptions,
  toFinanceLanguageOptions,
} from '@/features/provisioning/finance-provisioning-utils'
import { WorkspaceTabSkeleton } from '@/features/provisioning/components/provisioning-page-skeleton'
import { getProvisioningCatalog, getProvisioningSetup } from './_data'

export const metadata = { title: 'Provisioning setup' }

type Props = { params: Promise<{ setupKey: string }> }

/**
 * The bare `/settings/orgs/provisioning/[setupKey]` route directly renders
 * the Workspace defaults tab without intermediate redirects.
 */
export default async function ProvisioningSetupIndexPage({ params }: Props) {
  return (
    <Suspense fallback={<WorkspaceTabSkeleton />}>
      <ProvisioningSetupIndexData params={params} />
    </Suspense>
  )
}

async function ProvisioningSetupIndexData({ params }: Props) {
  const { setupKey } = await params

  const [
    catalogResult,
    manifestResult,
    setupResult,
    currenciesResult,
    languagesResult,
  ] = await Promise.all([
    getProvisioningCatalog(setupKey),
    workspace.provisioning.retrieve('finance', setupKey),
    getProvisioningSetup(setupKey),
    workspace.geo.listCurrencies(),
    workspace.geo.listLanguages(),
  ])
  if (catalogResult.error || !catalogResult.data) notFound()
  if (manifestResult.error || !manifestResult.data) notFound()
  if (setupResult.error || !setupResult.data) notFound()
  if (currenciesResult.error || !currenciesResult.data) notFound()
  if (languagesResult.error || !languagesResult.data) notFound()

  return (
    <FinanceProvisioningEditor
      catalog={catalogResult.data}
      manifest={manifestResult.data}
      setup={setupResult.data}
      target={{ type: 'finance', key: setupKey }}
      initialType="workspace"
      currencyOptions={toFinanceCurrencyOptions(currenciesResult.data)}
      languageOptions={toFinanceLanguageOptions(languagesResult.data)}
    />
  )
}
