import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { AppError } from '@876/ui/app-error'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/clients/billing'

import { CurrenciesPanel } from '../_components/finance-settings'

export const metadata = { title: 'Currencies - Finance - Settings' }

export default async function FinanceCurrenciesPage() {
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
  if (!permissions.includes('currencies:read')) {
    redirect('/settings/finance')
  }

  const billing = await getBilling(context.context.orgId)

  return (
    <Suspense fallback={<CurrenciesFallback />}>
      <CurrenciesData
        billing={billing}
        canManage={permissions.includes('currencies:write')}
      />
    </Suspense>
  )
}

async function CurrenciesData({
  billing,
  canManage,
}: {
  billing: Awaited<ReturnType<typeof getBilling>>
  canManage: boolean
}) {
  const result = await billing.currencies.list()
  if (result.error) {
    return (
      <AppError
        title="Currencies could not be loaded"
        error={result.error}
        variant="section"
      />
    )
  }

  return (
    <CurrenciesPanel
      currencies={result.data?.data ?? []}
      canManage={canManage}
    />
  )
}

function CurrenciesFallback() {
  return (
    <div
      className="876-card h-48 animate-pulse"
      aria-label="Loading currencies"
    />
  )
}
