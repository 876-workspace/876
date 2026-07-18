import { CreditCardIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { InvoicesTable } from './invoices-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import type { InvoiceStatus } from '@/types/invoice'

export const metadata = {
  title: 'Invoices',
  description: 'Commercial invoice drafts.',
}

const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['draft', 'sent', 'overdue', 'paid', 'void'].includes(
    status ?? ''
  )
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as InvoiceStatus)

  const context = await getWorkspaceContext()
  if (!context) return null

  const invoices = await service.invoices.list(context.tenant.id, filterStatus)

  return (
    <Page>
      <ResourceToolbar
        title="Invoices"
        titleFilter={
          <StatusFilterHeading
            label="Invoices"
            value={selectedStatus}
            options={INVOICE_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('sales:write')
            ? 'New Invoice'
            : undefined
        }
        primaryHref={
          context.permissions.includes('sales:write')
            ? '/invoices/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <InvoicesTable
        invoices={invoices}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>No invoices yet</EmptyTitle>
              <EmptyDescription>
                Create a draft invoice from a customer and item. It will not
                send or collect payment automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
