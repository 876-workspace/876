import type { ReactNode } from 'react'
import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'

import { PaymentsList } from './payments-list'

const MISSING_WORKSPACE_CODES = new Set([
  'billing/tenant-not-found',
  'billing/database-not-ready',
  'billing/unreachable',
])

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. It loads every payment; the status filter
 * is applied by `PaymentsList`, because a layout receives no `searchParams`
 * and the Billing integration payments list accepts no status parameter.
 */
export async function PaymentsListData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <PaymentsListColumn>
        <PaymentsList payments={[]} orgSlug={orgSlug} />
      </PaymentsListColumn>
    )

  const payments = await billingIntegration.payments.list(ctx.orgId)

  const displayError =
    payments.error && !MISSING_WORKSPACE_CODES.has(payments.error.code)
      ? payments.error
      : null

  const rows = payments.error
    ? []
    : payments.data.data.map((payment) => ({
        id: payment.id,
        number: payment.number,
        customerName: payment.customer.name,
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: payment.paymentDate,
        status: payment.status,
        depositAccountName: payment.depositAccount.name,
      }))

  return (
    <PaymentsListColumn>
      {displayError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-[0.8125rem]">
          {displayError.message}
        </div>
      ) : null}

      <PaymentsList payments={rows} orgSlug={orgSlug} />
    </PaymentsListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function PaymentsListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
