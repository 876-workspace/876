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
import { Page } from '@876/ui/page'

import { CreditNotesTable } from './credit-notes-table'
import { ResourceToolbar } from '@/components/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import type { CreditNoteStatus } from '@/lib/db'

export const metadata = {
  title: 'Credit Notes',
  description: 'Customer credit notes.',
}

const CREDIT_NOTE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Credit Notes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Credit Notes' },
  { value: 'open', label: 'Open', headingLabel: 'Open Credit Notes' },
  { value: 'closed', label: 'Closed', headingLabel: 'Closed Credit Notes' },
  { value: 'void', label: 'Void', headingLabel: 'Void Credit Notes' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function CreditNotesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const validStatuses = ['draft', 'open', 'closed', 'void']
  const selectedStatus = validStatuses.includes(status ?? '') ? status! : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as CreditNoteStatus)

  const context = await getWorkspaceContext()
  if (!context) return null

  const creditNotes = await service.creditNotes.list(
    context.tenant.id,
    filterStatus
  )

  // Serialize bigint fields before passing to the client component.
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
    <Page>
      <ResourceToolbar
        title="Credit Notes"
        titleFilter={
          <StatusFilterHeading
            label="Credit Notes"
            value={selectedStatus}
            options={CREDIT_NOTE_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('sales:write') ? 'Add' : undefined
        }
        primaryHref={
          context.permissions.includes('sales:write')
            ? '/credit-notes/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <CreditNotesTable
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
    </Page>
  )
}
