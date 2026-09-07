'use client'

import { TaxAuthoritySettingsPanel } from '@876/billing-ui/panels/tax-authority-settings-panel'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'
import type { TaxAuthorityResource } from '@/types/tax'

export function TaxAuthoritySettings({
  authorities,
  countryCode,
  canManage,
}: {
  authorities: TaxAuthorityResource[]
  countryCode: string
  canManage: boolean
}) {
  const router = useRouter()
  return (
    <TaxAuthoritySettingsPanel
      authorities={authorities}
      countryCode={countryCode}
      canManage={canManage}
      onCreate={client.taxAuthorities.create}
      onUpdate={client.taxAuthorities.update}
      onSuccess={() => router.refresh()}
    />
  )
}
