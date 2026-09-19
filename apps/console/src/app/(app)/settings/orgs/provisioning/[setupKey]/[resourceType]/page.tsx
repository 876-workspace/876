import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { workspace } from '@/lib/clients/workspace'
import { FinanceProvisioningEditor } from '@/features/provisioning/components/finance-provisioning-editor'
import {
  toFinanceCurrencyOptions,
  toFinanceLanguageOptions,
} from '@/features/provisioning/finance-provisioning-utils'
import { ProvisioningResourceTypeSkeleton } from '@/features/provisioning/components/provisioning-page-skeleton'
import {
  getProvisioningCatalog,
  getProvisioningReferenceData,
} from '@/lib/console/provisioning'

export const metadata = { title: 'Provisioning setup' }

type Props = { params: Promise<{ setupKey: string; resourceType: string }> }

export default async function ProvisioningResourceTypePage({ params }: Props) {
  const { resourceType } = await params

  return (
    <Suspense
      fallback={
        <ProvisioningResourceTypeSkeleton resourceType={resourceType} />
      }
    >
      <ProvisioningResourceTypeData params={params} />
    </Suspense>
  )
}

async function ProvisioningResourceTypeData({ params }: Props) {
  const { setupKey, resourceType } = await params

  if (resourceType === 'workspace') {
    redirect(`/settings/orgs/provisioning/${encodeURIComponent(setupKey)}`)
  }

  const [
    catalogResult,
    manifestResult,
    { currencies: currenciesResult, languages: languagesResult },
  ] = await Promise.all([
    getProvisioningCatalog('finance', setupKey),
    workspace.provisioning.retrieve('finance', setupKey),
    getProvisioningReferenceData(),
  ])
  if (manifestResult.error?.code === 'provisioning/manifest-not-found')
    notFound()
  if (catalogResult.error)
    return <AppError error={catalogResult.error} variant="banner" showCode />
  if (manifestResult.error)
    return <AppError error={manifestResult.error} variant="banner" showCode />
  if (currenciesResult.error)
    return <AppError error={currenciesResult.error} variant="banner" showCode />
  if (languagesResult.error)
    return <AppError error={languagesResult.error} variant="banner" showCode />

  // Validate that the resourceType segment maps to a known catalog type.
  const typeExists = catalogResult.data.resource_types.some(
    (def) => def.resource_type === resourceType
  )
  if (!typeExists) notFound()

  return (
    <FinanceProvisioningEditor
      catalog={catalogResult.data}
      manifest={manifestResult.data}
      target={{ type: 'finance', key: setupKey }}
      initialType={resourceType}
      currencyOptions={toFinanceCurrencyOptions(currenciesResult.data)}
      languageOptions={toFinanceLanguageOptions(languagesResult.data)}
    />
  )
}
