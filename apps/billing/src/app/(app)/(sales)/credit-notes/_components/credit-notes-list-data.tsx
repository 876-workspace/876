import { ReceiptText } from '@876/ui/icons'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { CreditNotesList } from './credit-notes-list'

export async function CreditNotesListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const creditNotes = await service.creditNotes.list(context.tenant.id)

  const rows = creditNotes.map((cn) => ({
    id: cn.id,
    number: cn.number,
    status: cn.status,
    currency: cn.currency,
    totalAmount: String(cn.totalAmount),
    balanceAmount: String(cn.balanceAmount),
    customerId: cn.customerId,
    customer: cn.customer,
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <CreditNotesList
        creditNotes={rows}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>No credit notes yet</EmptyTitle>
              <EmptyDescription>
                Create a credit note when an invoice needs a documented
                reduction, customer credit, or refund.
              </EmptyDescription>
            </EmptyHeader>
            {context.permissions.includes('sales:write') ? (
              <EmptyContent>
                <Link
                  href="/credit-notes/new"
                  className={buttonVariants({ variant: 'info' })}
                >
                  Add credit note
                </Link>
              </EmptyContent>
            ) : null}
          </Empty>
        }
      />
    </div>
  )
}
