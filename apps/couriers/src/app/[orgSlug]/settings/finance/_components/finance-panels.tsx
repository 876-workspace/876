'use client'

import { useRouter } from 'next/navigation'

import type { Currency, PaymentMode, TaxAuthority, TaxRate } from '@876/billing'
import { CurrencySettingsPanel } from '@876/billing-ui/panels/currency-settings-panel'
import { PaymentModeSettingsPanel } from '@876/billing-ui/panels/payment-mode-settings-panel'
import { TaxRateSettingsPanel } from '@876/billing-ui/panels/tax-rate-settings-panel'

import {
  financeCurrencies,
  financePaymentModes,
  financeTaxes,
} from '@/lib/client/finance'

type TaxesPanelProps = {
  orgSlug: string
  rates: TaxRate[]
  authorities: TaxAuthority[]
  canManage: boolean
  currentTimestamp: number
}

/** Couriers-hosted tax rate panel bound to the org's manage routes. */
export function TaxesPanel({
  orgSlug,
  rates,
  authorities,
  canManage,
  currentTimestamp,
}: TaxesPanelProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <TaxRateSettingsPanel
      authorities={authorities}
      rates={rates}
      canManage={canManage}
      currentTimestamp={currentTimestamp}
      onCreate={(params) => financeTaxes.create(orgSlug, params)}
      onUpdate={(id, params) => financeTaxes.update(orgSlug, id, params)}
      onSuccess={refresh}
    />
  )
}

type PaymentModesPanelProps = {
  orgSlug: string
  modes: PaymentMode[]
  canManage: boolean
}

/** Couriers-hosted payment mode panel bound to the org's manage routes. */
export function PaymentModesPanel({
  orgSlug,
  modes,
  canManage,
}: PaymentModesPanelProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <PaymentModeSettingsPanel
      modes={modes}
      canManage={canManage}
      onCreate={(params) => financePaymentModes.create(orgSlug, params)}
      onUpdate={(id, params) => financePaymentModes.update(orgSlug, id, params)}
      onDelete={(id) => financePaymentModes.remove(orgSlug, id)}
      onUploadImage={(id, file) =>
        financePaymentModes.uploadImage(orgSlug, id, file)
      }
      onSuccess={refresh}
    />
  )
}

type CurrenciesPanelProps = {
  orgSlug: string
  currencies: Currency[]
  canManage: boolean
}

/** Couriers-hosted currency panel bound to the org's manage routes. */
export function CurrenciesPanel({
  orgSlug,
  currencies,
  canManage,
}: CurrenciesPanelProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <CurrencySettingsPanel
      currencies={currencies.map((currency) => ({
        code: currency.currencyCode,
        name: currency.currency.name,
        symbol: currency.currency.symbol,
        decimalPlaces: currency.currency.decimalPlaces,
        isDefault: currency.isDefault,
        isEnabled: currency.isEnabled,
      }))}
      canManage={canManage}
      onEnable={(currency) => financeCurrencies.enable(orgSlug, { currency })}
      onUpdate={(currency, params) =>
        financeCurrencies.update(orgSlug, currency, params)
      }
      onDisable={(currency) => financeCurrencies.disable(orgSlug, currency)}
      onSetDefault={(currency) =>
        financeCurrencies.setDefault(orgSlug, currency)
      }
      onSuccess={refresh}
    />
  )
}
