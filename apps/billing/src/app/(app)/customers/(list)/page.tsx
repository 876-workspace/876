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
import { CustomersTable } from '../_components/customers-table'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'
import { CustomersToolbar } from '../_components/customers-toolbar'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = {
  title: 'Customers',
  description: 'Customers in the billing workspace.',
}

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function CustomersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'

  return (
    <Page>
      <CustomersToolbar status={selectedStatus} />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <CustomersTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function CustomersTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as 'ACTIVE' | 'ARCHIVED')

  const context = await getWorkspaceContext()
  if (!context) return null

  const customers = await service.customers.list(
    context.tenant.id,
    filterStatus
  )
  const rows = customers.map((customer) => {
    const contact = customer.contacts[0]
    return {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      contactName:
        [contact?.firstName, contact?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null,
      phone: customer.phone ?? customer.workPhone,
      receivables: Number(customer.outstandingReceivable),
      currency: customer.defaultCurrency ?? context.tenant.defaultCurrency,
      status: customer.status,
    }
  })

  return (
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
  )
}
