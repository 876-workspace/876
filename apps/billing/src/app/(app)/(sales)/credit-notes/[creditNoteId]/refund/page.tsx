import { notFound } from 'next/navigation'

import { resolveCreditNote } from '@/app/(app)/_lib/detail-data'
import { RefundForm } from '@/features/payments/components/refund-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Refund credit note' }

type Props = { params: Promise<{ creditNoteId: string }> }

export default async function RefundCreditNotePage({ params }: Props) {
  const context = await requirePagePermission('payments:write')
  const { creditNoteId } = await params
  const [creditNote, accounts, modes, currencies] = await Promise.all([
    resolveCreditNote(context.tenant.id, creditNoteId),
    service.bankAccounts.list(context.tenant.id),
    service.paymentModes.list(context.tenant.id),
    service.currencies.list(context.tenant.id),
  ])
  if (!creditNote || creditNote.status !== 'OPEN' || creditNote.balanceAmount <= 0n)
    notFound()

  const decimalPlaces =
    currencies.find(({ currency }) => currency.code === creditNote.currency)
      ?.currency.decimalPlaces ?? 2

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Refund credit note</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Return available credit to the customer and record the funding account
          and refund method.
        </p>
      </div>
      <RefundForm
        customerId={creditNote.customerId}
        currency={creditNote.currency}
        decimalPlaces={decimalPlaces}
        availableAmount={creditNote.balanceAmount.toString()}
        modes={modes
          .filter((mode) => mode.isActive)
          .map((mode) => ({ value: mode.id, label: mode.name }))}
        accounts={accounts
          .filter((account) => account.isActive)
          .map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
            currency: account.currency,
          }))}
        defaultModeId={modes.find((mode) => mode.isActive && mode.isDefault)?.id}
        creditNoteId={creditNote.id}
        sourceLabel={`${creditNote.number} · available credit note balance`}
        returnHref={`/credit-notes/${creditNote.id}`}
      />
    </div>
  )
}
