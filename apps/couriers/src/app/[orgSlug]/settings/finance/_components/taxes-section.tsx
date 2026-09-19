import type { TaxAuthority, TaxRate } from '@876/billing'
import { nowUnixSeconds } from '@876/core/timestamps'
import { AppError, type AppErrorValue } from '@876/ui/app-error'

import { getAppError } from '@/lib/errors'
import { resolveFinanceErrorCode } from '@/lib/errors/finance'
import { createBillingIntegration } from '@/lib/clients/billing'

import { TaxesPanel } from './finance-panels'

type Props = { orgId: string; orgSlug: string; canManage: boolean }

type ViewProps = {
  orgSlug: string
  rates: TaxRate[]
  authorities: TaxAuthority[]
  canManage: boolean
  currentTimestamp: number
  error: AppErrorValue | null
}

/** Loads tax rates for the Finance page's Taxes section. */
export async function TaxesSection({ orgId, orgSlug, canManage }: Props) {
  const billing = createBillingIntegration()
  const [rateResult, authorityResult] = await Promise.all([
    billing.taxRates.list(orgId),
    billing.taxAuthorities.list(orgId),
  ])
  const failure = rateResult.error ?? authorityResult.error

  return (
    <TaxesSectionView
      orgSlug={orgSlug}
      canManage={canManage}
      rates={rateResult.data?.data ?? []}
      authorities={authorityResult.data?.data ?? []}
      error={
        failure
          ? getAppError(resolveFinanceErrorCode('tax', failure.code))
          : null
      }
      currentTimestamp={nowUnixSeconds()}
    />
  )
}

/** Renders the Taxes section, isolating its failure from sibling sections. */
export function TaxesSectionView({
  orgSlug,
  rates,
  authorities,
  canManage,
  currentTimestamp,
  error,
}: ViewProps) {
  if (error)
    return (
      <AppError
        title="Taxes could not be loaded"
        error={error}
        variant="section"
      />
    )

  return (
    <TaxesPanel
      orgSlug={orgSlug}
      rates={rates}
      authorities={authorities}
      canManage={canManage}
      currentTimestamp={currentTimestamp}
    />
  )
}
