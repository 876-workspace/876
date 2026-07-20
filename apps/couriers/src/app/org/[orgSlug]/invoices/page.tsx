import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

const INVOICE_STATUS_VALUES = new Set(
  INVOICE_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && INVOICE_STATUS_VALUES.has(status) ? status : 'all'
  const selectedLabel = INVOICE_STATUS_OPTIONS.find(
    (option) => option.value === selectedStatus
  )?.label

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No invoices yet.'
      : `No ${selectedLabel?.toLowerCase() ?? selectedStatus} invoices.`

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
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/invoices/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete invoices',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DocumentTextIcon />
          </EmptyMedia>
          <EmptyTitle>No invoices</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
