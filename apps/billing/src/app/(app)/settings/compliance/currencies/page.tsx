import { redirect } from 'next/navigation'

import { CurrencySettings } from '@/components/currency-settings'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Currencies',
  description: 'Configure workspace currencies.',
}

export default async function CurrenciesPage() {
  const context = await requirePagePermission('settings:read')
  if (!context.permissions.includes('currencies:read')) {
    redirect('/settings/compliance/tax-authorities')
  }

  const enabledCurrencies = await service.currencies.list(context.tenant.id)

  return (
    <CurrencySettings
      enabled={enabledCurrencies.map(({ currency, isDefault }) => ({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        isDefault,
      }))}
      canManage={context.permissions.includes('currencies:write')}
    />
  )
}
