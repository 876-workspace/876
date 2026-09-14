'use client'

import { useRouter } from 'next/navigation'

import type { Currency, PaymentMode, TaxAuthority, TaxRate } from '@876/billing'
import { CurrencySettingsPanel } from '@876/billing-ui/panels/currency-settings-panel'
import { PaymentModeSettingsPanel } from '@876/billing-ui/panels/payment-mode-settings-panel'
import { TaxAuthoritySettingsPanel } from '@876/billing-ui/panels/tax-authority-settings-panel'
import { TaxRateSettingsPanel } from '@876/billing-ui/panels/tax-rate-settings-panel'

import { client } from '@/lib/client'

export function CurrenciesPanel({
  currencies,
  canManage,
}: {
  currencies: Currency[]
  canManage: boolean
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <CurrencySettingsPanel
      currencies={currencies.map((item) => ({
        code: item.currencyCode,
        name: item.currency.name,
        symbol: item.currency.symbol,
        decimalPlaces: item.currency.decimalPlaces,
        isDefault: item.isDefault,
        isEnabled: item.isEnabled,
      }))}
      canManage={canManage}
      onEnable={(currency) => client.currencies.enable(currency)}
      onUpdate={client.currencies.update}
      onDisable={client.currencies.disable}
      onSetDefault={(currency) => client.currencies.setDefault(currency)}
      onSuccess={refresh}
    />
  )
}

export function PaymentModesPanel({
  paymentModes,
  canManage,
}: {
  paymentModes: PaymentMode[]
  canManage: boolean
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <PaymentModeSettingsPanel
      modes={paymentModes}
      canManage={canManage}
      onCreate={client.paymentModes.create}
      onUpdate={client.paymentModes.update}
      onDelete={client.paymentModes.delete}
      onSuccess={refresh}
    />
  )
}

export function TaxesPanel({
  authorities,
  rates,
  canManage,
  currentTimestamp,
}: {
  authorities: TaxAuthority[]
  rates: TaxRate[]
  canManage: boolean
  currentTimestamp: number
}) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <div className="space-y-8">
      <TaxAuthoritySettingsPanel
        authorities={authorities}
        countryCode={authorities[0]?.countryCode ?? 'JM'}
        canManage={canManage}
        onCreate={client.taxAuthorities.create}
        onUpdate={client.taxAuthorities.update}
        onSuccess={refresh}
      />
      <TaxRateSettingsPanel
        authorities={authorities}
        rates={rates}
        canManage={canManage}
        currentTimestamp={currentTimestamp}
        onCreate={client.taxRates.create}
        onUpdate={client.taxRates.update}
        onSuccess={refresh}
      />
    </div>
  )
}
