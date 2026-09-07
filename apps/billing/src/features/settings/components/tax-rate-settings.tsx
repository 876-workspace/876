'use client'

import { TaxRateSettingsPanel } from '@876/billing-ui/panels/tax-rate-settings-panel'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'
import type { TaxAuthorityResource, TaxRateResource } from '@/types/tax'

export function TaxRateSettings({
  authorities,
  rates,
  canManage,
  currentTimestamp,
}: {
  authorities: TaxAuthorityResource[]
  rates: TaxRateResource[]
  canManage: boolean
  currentTimestamp: number
}) {
  const router = useRouter()
  return (
    <TaxRateSettingsPanel
      authorities={authorities}
      rates={rates}
      canManage={canManage}
      currentTimestamp={currentTimestamp}
      onCreate={client.taxRates.create}
      onUpdate={client.taxRates.update}
      onSuccess={() => router.refresh()}
    />
  )
}
