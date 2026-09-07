import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { nowUnixSeconds } from '@876/core/timestamps'
import { AppError } from '@876/ui/app-error'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/services/billing'

import { TaxesPanel } from '../_components/finance-settings'

export const metadata = { title: 'Taxes - Finance - Settings' }

export default async function FinanceTaxesPage() {
  await requireAppPermission('settings.view')

  const context = await getInvoiceContextResult()
  if (context.status !== 'ok') redirect('/settings/finance')

  const access = await resolveInvoiceFinanceAccess(
    context.context.orgId,
    context.context.userId,
    context.context.role
  )
  if (access.status !== 'ok') redirect('/settings/finance')

  const permissions = access.viewer.permissions
  if (!permissions.includes('taxes:read')) {
    redirect('/settings/finance')
  }

  const billing = await getBilling(context.context.orgId)

  return (
    <Suspense fallback={<TaxesFallback />}>
      <TaxesData
        billing={billing}
        canManage={permissions.includes('taxes:write')}
      />
    </Suspense>
  )
}

async function TaxesData({
  billing,
  canManage,
}: {
  billing: Awaited<ReturnType<typeof getBilling>>
  canManage: boolean
}) {
  const [authorityResult, taxRateResult] = await Promise.all([
    billing.taxAuthorities.list(),
    billing.taxRates.list(),
  ])

  const error = authorityResult.error ?? taxRateResult.error
  if (error) {
    return (
      <AppError
        title="Tax settings could not be loaded"
        error={error}
        variant="section"
      />
    )
  }

  return (
    <TaxesPanel
      authorities={authorityResult.data?.data ?? []}
      rates={taxRateResult.data?.data ?? []}
      canManage={canManage}
      currentTimestamp={nowUnixSeconds()}
    />
  )
}

function TaxesFallback() {
  return (
    <div className="space-y-6" aria-label="Loading tax settings">
      <div className="876-card h-48 animate-pulse" />
      <div className="876-card h-48 animate-pulse" />
    </div>
  )
}
