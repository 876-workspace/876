import * as Sentry from '@sentry/nextjs'
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
import { redirect } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { getInvoiceContext } from '@/lib/auth/context'
import type { CustomerStatus } from '@876/billing'
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

const PROVISIONING_ERROR_CODES = new Set([
  'billing/tenant-not-found',
  'billing/unreachable',
])

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
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'

  // Map UI status (lowercase) to API status (UPPERCASE), or undefined for 'all'
  const apiStatus: CustomerStatus | undefined =
    selectedStatus === 'active'
      ? 'ACTIVE'
      : selectedStatus === 'archived'
        ? 'ARCHIVED'
        : undefined

  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const $876 = await get876Client(context.orgId)
  const result = await $876.customers.list({ status: apiStatus })
  if (result.error) {
    const provisioning = PROVISIONING_ERROR_CODES.has(result.error.code)

    // A permanent misconfiguration — a missing workspace membership or an
    // unscoped finance connection — is not transient, and "try again shortly"
    // sends someone into an endless reload. Report it, and show the operator
    // the code so the cause is diagnosable from the screen.
    if (!provisioning)
      Sentry.captureMessage('Invoice customers list failed', {
        level: 'error',
        tags: { category: 'billing_client' },
        extra: {
          call: 'customers.list',
          errorCode: result.error.code,
          organizationId: context.orgId,
        },
      })

    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          {provisioning
            ? 'Setting up your Invoice workspace'
            : 'Customers are unavailable right now'}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {provisioning ? 'Please try again shortly.' : result.error.message}
        </p>
        {provisioning ? null : (
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            {result.error.code}
          </p>
        )}
      </div>
    )
  }

  const customers = result.data.data.map((customer) => {
    const primary = customer.primaryContact
    const contactName = primary
      ? [primary.firstName, primary.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null
      : null
    return {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName ?? null,
      contactName,
      phone: customer.phone ?? customer.workPhone ?? null,
      receivables: customer.outstandingReceivable,
      currency: customer.defaultCurrency ?? 'JMD',
    }
  })

  return (
    <CustomersTable
      customers={customers}
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
