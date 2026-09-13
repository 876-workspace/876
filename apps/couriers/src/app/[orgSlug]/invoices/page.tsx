import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { INVOICES_SKELETON_COLUMNS } from './_components/invoices-skeleton-columns'
import { InvoicesTableData } from './_components/invoices-table-data'
import {
  INVOICE_STATUS_OPTIONS,
  resolveInvoiceStatus,
} from './_lib/invoices-list-config'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const { selected } = resolveInvoiceStatus(status)

  return (
    <Page>
      <ResourceToolbar
        title="Invoices"
        titleFilter={
          <StatusFilterHeading
            label="Invoices"
            value={selected}
            options={INVOICE_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/invoices/new`}
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
      <Suspense
        fallback={
          <DataTableSkeleton columns={INVOICES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <InvoicesTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
