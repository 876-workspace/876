import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { resolveCreditNote } from '@/app/(app)/detail-data'
import { CreditNoteActions } from './credit-note-actions'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'

export default async function CreditNoteDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ creditNoteId: string }>
}) {
  const { creditNoteId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const creditNote = await resolveCreditNote(context.tenant.id, creditNoteId)
  if (!creditNote) notFound()

  const base = `/credit-notes/${creditNote.id}`

  const statusVariant =
    creditNote.status === 'CLOSED'
      ? 'success'
      : creditNote.status === 'VOID'
        ? 'secondary'
        : creditNote.status === 'OPEN'
          ? 'info'
          : 'secondary'

  return (
    <DetailLayout
      backHref="/credit-notes"
      backLabel="Credit Notes"
      eyebrow="Credit note"
      title={creditNote.number}
      description={`${creditNote.customer.name} · ${formatMoney(String(creditNote.totalAmount), creditNote.currency)}`}
      status={
        creditNote.status.charAt(0) + creditNote.status.slice(1).toLowerCase()
      }
      statusVariant={statusVariant}
      actions={
        <CreditNoteActions
          creditNoteId={creditNote.id}
          status={creditNote.status}
          balanceAmount={String(creditNote.balanceAmount)}
          currency={creditNote.currency}
          customerId={creditNote.customerId}
          canWrite={context.permissions.includes('sales:write')}
        />
      }
      tabs={[{ label: 'Overview', href: base, exact: true }]}
    >
      {children}
    </DetailLayout>
  )
}
