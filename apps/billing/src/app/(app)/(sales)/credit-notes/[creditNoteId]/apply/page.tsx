import { notFound } from 'next/navigation'

import { resolveCreditNote } from '@/app/(app)/_lib/detail-data'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service, type LegacyBillingRecord } from '@/lib/service'

import { CreditNoteApplyForm } from './_components/credit-note-apply-form'

export const metadata = { title: 'Apply credit note' }

type Props = { params: Promise<{ creditNoteId: string }> }

const COLLECTIBLE_STATUSES = new Set([
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
])

export default async function ApplyCreditNotePage({ params }: Props) {
  const context = await requirePagePermission('sales:write')
  const { creditNoteId } = await params
  const [creditNote, invoices, currencies] = await Promise.all([
    resolveCreditNote(context.tenant.id, creditNoteId),
    service.invoices.list(context.tenant.id),
    service.currencies.list(context.tenant.id),
  ])
  if (!creditNote || creditNote.status !== 'OPEN' || creditNote.balanceAmount <= 0n)
    notFound()

  const decimalPlaces =
    currencies.find(({ currency }) => currency.code === creditNote.currency)
      ?.currency.decimalPlaces ?? 2
  const eligibleInvoices = invoices.flatMap((invoice: LegacyBillingRecord) => {
    if (
      invoice.customerId !== creditNote.customerId ||
      invoice.currency !== creditNote.currency ||
      !COLLECTIBLE_STATUSES.has(invoice.status) ||
      invoice.amountDue <= 0n
    )
      return []

    return [
      {
        id: invoice.id,
        number: invoice.number,
        amountDue: invoice.amountDue.toString(),
      },
    ]
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Apply credit to invoices</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Allocate the remaining credit-note balance across this customer&apos;s
          open invoices.
        </p>
      </div>
      <CreditNoteApplyForm
        creditNoteId={creditNote.id}
        currency={creditNote.currency}
        decimalPlaces={decimalPlaces}
        balanceAmount={creditNote.balanceAmount.toString()}
        invoices={eligibleInvoices}
      />
    </div>
  )
}
