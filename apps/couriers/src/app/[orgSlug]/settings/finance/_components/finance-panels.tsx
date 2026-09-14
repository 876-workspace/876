'use client'

import { useRouter } from 'next/navigation'

import type { PaymentMode, TaxAuthority, TaxRate } from '@876/billing'
import { PaymentModeSettingsPanel } from '@876/billing-ui/panels/payment-mode-settings-panel'
import { TaxRateSettingsPanel } from '@876/billing-ui/panels/tax-rate-settings-panel'

import { financePaymentModes, financeTaxes } from '@/lib/client/finance'

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
      onSuccess={refresh}
    />
  )
}
