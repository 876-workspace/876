'use client'

import {
  CurrencySettingsPanel,
  type CurrencySettingsItem,
} from '@876/billing-ui/panels/currency-settings-panel'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'

export function CurrencySettings({
  enabled,
  canManage,
}: {
  enabled: CurrencySettingsItem[]
  canManage: boolean
}) {
  const router = useRouter()

  return (
    <CurrencySettingsPanel
      currencies={enabled}
      canManage={canManage}
      onEnable={(currency) => client.currencies.enable({ currency })}
      onDisable={client.currencies.remove}
      onSetDefault={(currency) => client.currencies.setDefault({ currency })}
      onSuccess={() => router.refresh()}
    />
  )
}
