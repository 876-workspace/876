import type { Currency } from '@876/billing'
import { AppError, type AppErrorValue } from '@876/ui/app-error'

import { getAppError } from '@/lib/errors'
import { resolveFinanceErrorCode } from '@/lib/errors/finance'
import { createBillingIntegration } from '@/lib/services/billing'

import { CurrenciesPanel } from './finance-panels'

type Props = { orgId: string; orgSlug: string; canManage: boolean }

type ViewProps = {
  orgSlug: string
  currencies: Currency[]
  canManage: boolean
  error: AppErrorValue | null
}

/** Loads currencies through Couriers' Billing integration connection. */
export async function CurrenciesSection({ orgId, orgSlug, canManage }: Props) {
  const result = await createBillingIntegration().currencies.list(orgId)

  return (
    <CurrenciesSectionView
      orgSlug={orgSlug}
      currencies={result.data?.data ?? []}
      canManage={canManage}
      error={
        result.error
          ? getAppError(resolveFinanceErrorCode('currency', result.error.code))
          : null
      }
    />
  )
}

/** Renders currencies independently from the other finance sections. */
export function CurrenciesSectionView({
  orgSlug,
  currencies,
  canManage,
  error,
}: ViewProps) {
  if (error)
    return (
      <AppError
        title="Currencies could not be loaded"
        error={error}
        variant="section"
      />
    )

  return (
    <CurrenciesPanel
      orgSlug={orgSlug}
      currencies={currencies}
      canManage={canManage}
    />
  )
}
