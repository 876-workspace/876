import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CreditCardIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Payments' },
  { value: 'pending', label: 'Pending', headingLabel: 'Pending Payments' },
  {
    value: 'completed',
    label: 'Completed',
    headingLabel: 'Completed Payments',
  },
  { value: 'failed', label: 'Failed', headingLabel: 'Failed Payments' },
  { value: 'refunded', label: 'Refunded', headingLabel: 'Refunded Payments' },
]

const PAYMENT_STATUS_VALUES = new Set(
  PAYMENT_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function PaymentsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && PAYMENT_STATUS_VALUES.has(status) ? status : 'all'
  const selectedLabel = PAYMENT_STATUS_OPTIONS.find(
    (option) => option.value === selectedStatus
  )?.label

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No payments yet.'
      : `No ${selectedLabel?.toLowerCase() ?? selectedStatus} payments.`

  return (
    <Page>
      <ResourceToolbar
        title="Payments"
        titleFilter={
          <StatusFilterHeading
            label="Payments"
            value={selectedStatus}
            options={PAYMENT_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/payments/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete payments',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CreditCardIcon />
          </EmptyMedia>
          <EmptyTitle>No payments</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
