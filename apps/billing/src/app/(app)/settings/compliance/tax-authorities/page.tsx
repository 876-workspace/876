import { redirect } from 'next/navigation'

import { TaxAuthoritySettings } from '@/components/tax-authority-settings'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import type { TaxAuthorityResource } from '@/types/tax'

export const metadata = {
  title: 'Tax Authorities',
  description: 'Configure workspace tax authorities.',
}

export default async function TaxAuthoritiesPage() {
  const context = await requirePagePermission('settings:read')
  if (!context.permissions.includes('taxes:read')) {
    redirect('/settings/compliance/tax-rates')
  }

  const authorityRows = await service.taxAuthorities.list(context.tenant.id)

  const authorities: TaxAuthorityResource[] = authorityRows.map(
    (authority) => ({ object: 'tax_authority', ...authority })
  )

  return (
    <TaxAuthoritySettings
      authorities={authorities}
      countryCode={context.tenant.countryCode}
      canManage={context.permissions.includes('taxes:write')}
    />
  )
}
