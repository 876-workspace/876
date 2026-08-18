import * as Sentry from '@sentry/nextjs'
import { CreditCardIcon } from '@876/ui/icons'
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
import { redirectIfSignedOut } from '@/lib/auth/signed-out-error'
import { InvoicesTable } from './_components/invoices-table'

export const metadata = {
  title: 'Invoices',
  description: 'Commercial invoice drafts.',
}

const INVOICE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

const TENANT_NOT_FOUND = 'billing/tenant-not-found'
const BILLING_UNREACHABLE = 'billing/unreachable'

type Props = { searchParams: Promise<{ status?: string }> }

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['draft', 'sent', 'overdue', 'paid', 'void'].includes(
    status ?? ''
  )
    ? status!
    : 'all'
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
        primaryLabel="New"
        primaryHref="/invoices/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Invoice', cell: 'avatar' as const },
              { label: 'Customer' },
              { label: 'Amount' },
              { label: 'Status', cell: 'badge' as const },
            ]}
            rows={5}
          />
        }
      >
        <InvoicesTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function InvoicesTableData({ searchParams }: Props) {
  const { status } = await searchParams
  void status
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const $876 = await get876Client(context.orgId)
  const result = await $876.invoices.list()
  if (result.error) {
    redirectIfSignedOut(result.error.code, '/invoices')

    const isTenantNotFound = result.error.code === TENANT_NOT_FOUND
    const isUnreachable = result.error.code === BILLING_UNREACHABLE
    if (isTenantNotFound) {
      Sentry.captureMessage(
        'Invoice invoices list: tenant not found invariant',
        {
          level: 'error',
          tags: { category: 'billing_client' },
          extra: {
            call: 'invoices.list',
            errorCode: result.error.code,
            organizationId: context.orgId,
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
      Sentry.captureMessage('Invoice invoices list: billing unreachable', {
        level: 'warning',
        tags: { category: 'billing_client' },
        extra: {
          call: 'invoices.list',
          errorCode: result.error.code,
          organizationId: context.orgId,
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
    Sentry.captureMessage('Invoice invoices list failed', {
      level: 'error',
      tags: { category: 'billing_client' },
      extra: {
        call: 'invoices.list',
        errorCode: result.error.code,
        organizationId: context.orgId,
      },
    })
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          Invoices are unavailable right now
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
  const invoices = result.data.data.map((invoice) => {
    const inv = invoice as unknown as Record<string, unknown>
    return {
      id: String(inv.id),
      number: String(inv.number ?? inv.id),
      totalAmount: (inv.totalAmount as string) ?? '0',
      amountDue:
        (inv.amountDue as string) ?? (inv.totalAmount as string) ?? '0',
      currency: String(inv.currency ?? 'JMD'),
      status: String(inv.status ?? 'DRAFT'),
      customer: {
        name: String(
          (inv.customer as Record<string, unknown>)?.name ??
            inv.customerName ??
            '—'
        ),
      },
    }
  })
  return (
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
              Create a draft invoice from a customer and item. It will not send
              or collect payment automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
