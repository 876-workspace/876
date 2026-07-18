import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { DetailField } from '@/components/detail-field'
import { DetailActionList } from '@/components/detail-action-list'
import { MetricCard } from '@/components/metric-card'
import { resolveCreditNote } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'

interface Props {
  params: Promise<{ creditNoteId: string }>
}

export const metadata: Metadata = {
  title: 'Credit Note details',
  description: 'Credit note totals, allocations, and lines.',
}

export default async function CreditNoteDetailPage({ params }: Props) {
  const { creditNoteId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const creditNote = await resolveCreditNote(context.tenant.id, creditNoteId)
  if (!creditNote) notFound()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total"
          value={formatMoney(
            String(creditNote.totalAmount),
            creditNote.currency
          )}
          detail={`${creditNote.lines.length} line item${creditNote.lines.length === 1 ? '' : 's'}`}
        />
        <MetricCard
          label="Balance amount"
          value={formatMoney(
            String(creditNote.balanceAmount),
            creditNote.currency
          )}
          detail={creditNote.currency}
        />
      </div>

      <DetailActionList
        title="Related records"
        description="Move between the customer account and the financial documents affected by this credit."
        actions={[
          {
            href: `/customers/${creditNote.customerId}`,
            label: creditNote.customer.name,
            description:
              'Review the statement, payments, invoices, and available credit for this customer.',
          },
          ...(creditNote.invoiceId
            ? [
                {
                  href: `/invoices/${creditNote.invoiceId}`,
                  label: 'Source invoice',
                  description:
                    'Open the invoice that originated this credit note.',
                },
              ]
            : []),
        ]}
      />

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Credit note information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Reason" value={creditNote.reason || '—'} />
          <DetailField label="Issued" value={formatDate(creditNote.issueAt)} />
          <DetailField
            label="Source invoice"
            value={
              creditNote.invoiceId ? (
                <Link
                  href={`/invoices/${creditNote.invoiceId}`}
                  className="font-mono hover:underline"
                >
                  {creditNote.invoiceId}
                </Link>
              ) : (
                '—'
              )
            }
            mono
          />
          <DetailField
            label="Created"
            value={formatDate(creditNote.createdAt)}
          />
          <DetailField
            label="Updated"
            value={formatDate(creditNote.updatedAt)}
          />
          <DetailField label="Credit Note ID" value={creditNote.id} mono />
        </dl>
      </section>

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Line items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-876-surface-border border-b">
                <th className="text-muted-foreground pb-2 font-medium">
                  Description
                </th>
                <th className="text-muted-foreground pb-2 text-right font-medium">
                  Qty
                </th>
                <th className="text-muted-foreground pb-2 text-right font-medium">
                  Unit price
                </th>
                <th className="text-muted-foreground pb-2 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-876-surface-border divide-y">
              {creditNote.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-3">{line.description}</td>
                  <td className="py-3 text-right tabular-nums">
                    {line.quantity}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatMoney(String(line.unitAmount), creditNote.currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatMoney(String(line.totalAmount), creditNote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {creditNote.allocations && creditNote.allocations.length > 0 && (
        <section className="876-card p-5">
          <h2 className="876-section-title mb-4">Applications</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-876-surface-border border-b">
                  <th className="text-muted-foreground pb-2 font-medium">
                    Invoice ID
                  </th>
                  <th className="text-muted-foreground pb-2 text-right font-medium">
                    Date applied
                  </th>
                  <th className="text-muted-foreground pb-2 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-876-surface-border divide-y">
                {creditNote.allocations.map((alloc) => (
                  <tr key={alloc.id}>
                    <td className="py-3 font-mono">
                      <Link
                        href={`/invoices/${alloc.invoiceId}`}
                        className="hover:underline"
                      >
                        {alloc.invoiceId}
                      </Link>
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatDate(alloc.createdAt)}
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums">
                      {formatMoney(String(alloc.amount), creditNote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creditNote.refunds && creditNote.refunds.length > 0 && (
        <section className="876-card p-5">
          <h2 className="876-section-title mb-4">Refunds</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-876-surface-border border-b">
                  <th className="text-muted-foreground pb-2 font-medium">
                    Date
                  </th>
                  <th className="text-muted-foreground pb-2 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-876-surface-border divide-y">
                {creditNote.refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="py-3 tabular-nums">
                      {formatDate(refund.refundedAt ?? refund.createdAt)}
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums">
                      {formatMoney(String(refund.amount), creditNote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
