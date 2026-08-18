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

import { getInvoice } from '@/lib/invoice'
import { redirectIfSignedOut } from '@/lib/auth/signed-out-error'
import type { BillingCustomerStatus } from '@876/billing/integration'
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

const TENANT_NOT_FOUND = 'billing/tenant-not-found'
const BILLING_UNREACHABLE = 'billing/unreachable'

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

  const apiStatus: BillingCustomerStatus | undefined =
    selectedStatus === 'active'
      ? 'ACTIVE'
      : selectedStatus === 'archived'
        ? 'ARCHIVED'
        : undefined

  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.customers.list({ status: apiStatus })
  if (result.error) {
    redirectIfSignedOut(result.error.code, '/customers')

    const isTenantNotFound = result.error.code === TENANT_NOT_FOUND
    const isUnreachable = result.error.code === BILLING_UNREACHABLE

    if (isTenantNotFound) {
      Sentry.captureMessage(
        'Invoice customers list: tenant not found invariant',
        {
          level: 'error',
          tags: { category: 'billing_integration' },
          extra: {
            call: 'customers.list',
            errorCode: result.error.code,
            organizationId: invoice.organizationId,
          },
        }
      )
      return (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Billing workspace missing</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.error.message}
          </p>
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            {result.error.code}
          </p>
        </div>
      )
    }
    if (isUnreachable) {
      Sentry.captureMessage('Invoice customers list: billing unreachable', {
        level: 'warning',
        tags: { category: 'billing_integration' },
        extra: {
          call: 'customers.list',
          errorCode: result.error.code,
          organizationId: invoice.organizationId,
        },
      })
      return (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Billing is unreachable</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Please retry shortly. If this persists, contact support.
          </p>
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            {result.error.code}
          </p>
        </div>
      )
    }

    Sentry.captureMessage('Invoice customers list failed', {
      level: 'error',
      tags: { category: 'billing_integration' },
      extra: {
        call: 'customers.list',
        errorCode: result.error.code,
        organizationId: invoice.organizationId,
      },
    })

    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          Customers are unavailable right now
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {result.error.message}
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          {result.error.code}
        </p>
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
