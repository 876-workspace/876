import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { PAYMENTS_SKELETON_COLUMNS } from './_components/payments-skeleton-columns'
import { PaymentsTableData } from './_components/payments-table-data'
import {
  PAYMENT_STATUS_OPTIONS,
  resolvePaymentStatus,
} from './_lib/payments-list-config'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function PaymentsPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const { selected } = resolvePaymentStatus(status)

  return (
    <Page>
      <ResourceToolbar
        title="Payments"
        titleFilter={
          <StatusFilterHeading
            label="Payments"
            value={selected}
            options={PAYMENT_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/payments/new`}
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
      <Suspense
        fallback={
          <DataTableSkeleton columns={PAYMENTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <PaymentsTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
