import { UsersIcon } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { CustomersTable } from './_components/customers-table'

export const metadata = {
  title: 'Customers',
  description: 'Customers in the invoice workspace.',
}

const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

type Props = { searchParams: Promise<{ status?: string }> }

export default async function CustomersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  return (
    <Page>
      <ResourceToolbar
        title="Customers"
        titleFilter={
          <StatusFilterHeading
            label="Customers"
            value={selectedStatus}
            options={CUSTOMER_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/customers/new"
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import', href: '/customers/import' },
        ]}
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Customer' },
              { label: 'Company' },
              { label: 'Contact' },
              { label: 'Phone' },
              { label: 'Receivables' },
            ]}
            rows={5}
          />
        }
      >
        <CustomersTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function CustomersTableData({ searchParams }: Props) {
  void searchParams
  return (
    <CustomersTable
      customers={[]}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No customers yet</EmptyTitle>
            <EmptyDescription>
              Create a customer before preparing a quote, invoice, or sales
              receipt.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
