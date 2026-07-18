import { redirect } from 'next/navigation'

import { nowUnixSeconds } from '@876/core/timestamps'
import { TaxRateSettings } from '@/components/tax-rate-settings'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import type { TaxAuthorityResource, TaxRateResource } from '@/types/tax'

export const metadata = {
  title: 'Tax Rates',
  description: 'Configure workspace tax rates.',
}

export default async function TaxRatesPage() {
  const context = await requirePagePermission('settings:read')
  if (!context.permissions.includes('taxes:read')) {
    redirect('/settings/compliance/currencies')
  }

  const [authorityRows, rateRows] = await Promise.all([
    service.taxAuthorities.list(context.tenant.id),
    service.taxRates.list(context.tenant.id),
  ])

  const authorities: TaxAuthorityResource[] = authorityRows.map(
    (authority) => ({ object: 'tax_authority', ...authority })
  )
  const rates: TaxRateResource[] = rateRows.map(
    ({ taxAuthority, ...rate }) => ({
      object: 'tax_rate',
      ...rate,
      rate: rate.rate.toString(),
      taxAuthority: { object: 'tax_authority', ...taxAuthority },
    })
  )

  return (
    <TaxRateSettings
      authorities={authorities}
      rates={rates}
      canManage={context.permissions.includes('taxes:write')}
      currentTimestamp={nowUnixSeconds()}
    />
  )
}
