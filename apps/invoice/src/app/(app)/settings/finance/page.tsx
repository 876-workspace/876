import { redirect } from 'next/navigation'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { requireAppPermission } from '@/lib/auth/guards'

export default async function FinanceIndexPage() {
  await requireAppPermission('settings.view')

  const context = await getInvoiceContextResult()
  if (context.status !== 'ok') redirect('/settings')

  const access = await resolveInvoiceFinanceAccess(
    context.context.orgId,
    context.context.userId,
    context.context.role
  )
  if (access.status !== 'ok') redirect('/settings')

  const permissions = access.viewer.permissions
  if (permissions.includes('currencies:read')) {
    redirect('/settings/finance/currencies')
  }
  if (permissions.includes('payments:read')) {
    redirect('/settings/finance/payment-modes')
  }
  if (permissions.includes('taxes:read')) {
    redirect('/settings/finance/taxes')
  }

  redirect('/settings')
}
