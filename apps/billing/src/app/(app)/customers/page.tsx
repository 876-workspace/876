import { UsersIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { CustomersTable } from './customers-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Customers',
  description: 'Customers in the billing workspace.',
}

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function CustomersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as 'ACTIVE' | 'ARCHIVED')

  const context = await getWorkspaceContext()
  if (!context) return null

  const canWrite = context.permissions.includes('customers:write')

  const customers = await service.customers.list(
    context.tenant.id,
    filterStatus
  )
  const rows = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    phone: customer.phone ?? customer.workPhone,
    receivables: Number(customer.outstandingReceivable),
    currency: customer.defaultCurrency ?? context.tenant.defaultCurrency,
    status: customer.status,
  }))

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
        primaryLabel={canWrite ? 'New Customer' : undefined}
        primaryHref={canWrite ? '/customers/new' : undefined}
        primaryVariant="info"
        refresh
        dropdownActions={
          canWrite
            ? [{ label: 'Import', icon: 'import', href: '/customers/import' }]
            : []
        }
      />

      <CustomersTable
        customers={rows}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No customers yet</EmptyTitle>
              <EmptyDescription>
                Create a customer before preparing a quote, invoice, or
                subscription.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
