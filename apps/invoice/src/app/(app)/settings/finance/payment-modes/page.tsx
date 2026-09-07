import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { AppError } from '@876/ui/app-error'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { requireAppPermission } from '@/lib/auth/guards'
import { getBilling } from '@/lib/services/billing'

import { PaymentModesPanel } from '../_components/finance-settings'

export const metadata = { title: 'Payment Modes - Finance - Settings' }

export default async function FinancePaymentModesPage() {
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
  if (!permissions.includes('payments:read')) {
    redirect('/settings/finance')
  }

  const billing = await getBilling(context.context.orgId)

  return (
    <Suspense fallback={<PaymentModesFallback />}>
      <PaymentModesData
        billing={billing}
        canManage={permissions.includes('payments:write')}
      />
    </Suspense>
  )
}

async function PaymentModesData({
  billing,
  canManage,
}: {
  billing: Awaited<ReturnType<typeof getBilling>>
  canManage: boolean
}) {
  const result = await billing.paymentModes.list()
  if (result.error) {
    return (
      <AppError
        title="Payment modes could not be loaded"
        error={result.error}
        variant="section"
      />
    )
  }

  return (
    <PaymentModesPanel
      paymentModes={result.data?.data ?? []}
      canManage={canManage}
    />
  )
}

function PaymentModesFallback() {
  return (
    <div
      className="876-card h-48 animate-pulse"
      aria-label="Loading payment modes"
    />
  )
}
