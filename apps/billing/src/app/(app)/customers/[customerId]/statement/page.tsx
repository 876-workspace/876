import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'

import { MetricCard } from '@/components/metric-card'
import { resolveCustomer } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [customer, account] = await Promise.all([
    resolveCustomer(context.tenant.id, customerId),
    service.customers.account(context.tenant.id, customerId),
  ])
  if (!customer || !account) notFound()

  const currency = account.currency ?? context.tenant.defaultCurrency

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Lifetime billed"
          value={formatMoney(account.lifetimeBilled, currency)}
          detail="Finalized invoice total"
        />
        <MetricCard
          label="Lifetime paid"
          value={formatMoney(account.lifetimePaid, currency)}
          detail="Successful payments less refunds"
        />
        <MetricCard
          label="Outstanding"
          value={formatMoney(account.outstandingReceivable, currency)}
          detail="Open invoice balances"
        />
        <MetricCard
          label="Available credit"
          value={formatMoney(account.availableCredit, currency)}
          detail="Unapplied payments and credits"
        />
      </div>

      <section className="876-card overflow-hidden">
        <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-balance">Account statement</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Auditable charges, payments, credits, and refunds for{' '}
              {customer.name}.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-muted-foreground text-xs">Net amount owed</p>
            <p className="mt-1 font-semibold tabular-nums">
              {formatMoney(account.netPosition, currency)}
            </p>
          </div>
        </header>

        {account.statement.length === 0 ? (
          <p className="text-muted-foreground px-5 py-12 text-center text-sm">
            No posted account activity yet. Draft invoices do not appear until
            they are finalized.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="border-b">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Activity</th>
                  <th className="px-5 py-3 text-left font-medium">Reference</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {account.statement.map((entry) => {
                  const reference = statementReference(entry)
                  return (
                    <tr key={entry.id} className="border-b last:border-b-0">
                      <td className="px-5 py-4 tabular-nums">
                        {formatDate(entry.effectiveAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              entry.direction === 'DEBIT'
                                ? 'warning'
                                : 'success'
                            }
                            className="capitalize"
                          >
                            {entry.type.toLowerCase().replaceAll('_', ' ')}
                          </Badge>
                        </div>
                        {entry.description ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {entry.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        {reference ? (
                          <Link
                            href={reference.href}
                            className="text-primary font-medium hover:underline"
                          >
                            {reference.label}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-medium tabular-nums">
                        {entry.direction === 'CREDIT' ? '−' : ''}
                        {formatMoney(entry.amount, entry.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function statementReference(entry: {
  invoiceId: string | null
  paymentId: string | null
  creditNoteId: string | null
  refundId: string | null
}) {
  if (entry.invoiceId)
    return {
      href: `/invoices/${entry.invoiceId}`,
      label: 'View invoice',
    }
  if (entry.paymentId)
    return {
      href: `/payments/${entry.paymentId}`,
      label: 'View payment',
    }
  if (entry.creditNoteId)
    return {
      href: `/credit-notes/${entry.creditNoteId}`,
      label: 'View credit note',
    }
  if (entry.refundId) return { href: '/payments', label: 'View refund' }
  return null
}
