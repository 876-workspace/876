import type { ReactNode } from 'react'
import { billingIntegration } from '@/lib/clients/billing'
import { getManageContext } from '@/lib/auth/manage-context'

import { InvoicesList } from './invoices-list'

const MISSING_WORKSPACE_CODES = new Set([
  'billing/tenant-not-found',
  'billing/database-not-ready',
  'billing/unreachable',
])

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. It loads every invoice; the status filter
 * is applied by `InvoicesList`, because a layout receives no `searchParams`.
 */
export async function InvoicesListData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <InvoicesListColumn>
        <InvoicesList invoices={[]} orgSlug={orgSlug} />
      </InvoicesListColumn>
    )

  const invoices = await billingIntegration.invoices.list(ctx.orgId)

  const displayError =
    invoices.error && !MISSING_WORKSPACE_CODES.has(invoices.error.code)
      ? invoices.error
      : null

  const rows = invoices.error
    ? []
    : invoices.data.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        totalAmount: invoice.totalAmount,
        amountDue: invoice.amountDue,
        currency: invoice.currency,
        status: invoice.status,
        customer: invoice.customer ?? null,
      }))

  return (
    <InvoicesListColumn>
      {displayError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-[0.8125rem]">
          {displayError.message}
        </div>
      ) : null}

      <InvoicesList invoices={rows} orgSlug={orgSlug} />
    </InvoicesListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function InvoicesListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
