import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { workspace } from '@/lib/clients/workspace'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import {
  toFinanceCurrencyOptions,
  toFinanceLanguageOptions,
} from '@/features/provisioning/finance-provisioning-utils'
import { WorkspaceTabSkeleton } from '@/features/provisioning/components/provisioning-page-skeleton'
import {
  getProvisioningCatalog,
  getProvisioningReferenceData,
} from '@/lib/console/provisioning'
import { getProvisioningSetup } from './_data'

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
    { currencies: currenciesResult, languages: languagesResult },
  ] = await Promise.all([
    getProvisioningCatalog('finance', setupKey),
    workspace.provisioning.retrieve('finance', setupKey),
    getProvisioningSetup(setupKey),
    getProvisioningReferenceData(),
  ])
  if (setupResult.error?.code === 'provisioning/setup-not-found') notFound()
  if (catalogResult.error)
    return <AppError error={catalogResult.error} variant="banner" showCode />
  if (manifestResult.error)
    return <AppError error={manifestResult.error} variant="banner" showCode />
  if (setupResult.error)
    return <AppError error={setupResult.error} variant="banner" showCode />
  if (currenciesResult.error)
    return <AppError error={currenciesResult.error} variant="banner" showCode />
  if (languagesResult.error)
    return <AppError error={languagesResult.error} variant="banner" showCode />

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
