import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'
import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'

import { resolveInvoiceStatus } from '../_lib/invoices-list-config'
import { InvoicesList } from './invoices-list'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

const MISSING_WORKSPACE_CODES = new Set([
  'billing/tenant-not-found',
  'billing/database-not-ready',
  'billing/unreachable',
])

export async function InvoicesTableData({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const { selected, filter } = resolveInvoiceStatus(status)

  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <DocumentTextIcon />
        </EmptyMedia>
        <EmptyTitle>No invoices</EmptyTitle>
        <EmptyDescription>
          {selected === 'all' ? 'No invoices yet.' : `No ${selected} invoices.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <InvoicesList invoices={[]} orgSlug={orgSlug} emptyState={emptyState} />
    )

  const invoices = await billingIntegration.invoices.list(ctx.orgId, {
    status: filter,
  })

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
    <>
      {displayError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-[0.8125rem]">
          {displayError.message}
        </div>
      ) : null}

      <InvoicesList invoices={rows} orgSlug={orgSlug} emptyState={emptyState} />
    </>
  )
}
