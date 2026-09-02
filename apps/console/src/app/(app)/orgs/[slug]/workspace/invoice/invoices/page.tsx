import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { InvoicesTable } from '@876/billing-ui/invoices-table'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { BILLING_INVOICES_SKELETON_COLUMNS } from '@/features/billing/components/invoices-skeleton-columns'
import { formatBillingAmount } from '@/features/billing/money'
import { toInvoiceRows } from '@/features/billing/invoice-rows'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { billing } from '@/lib/services/billing'

import { resolveOrg } from '../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Invoices' }

  return { title: `${org.name ?? org.slug} • Invoices - Invoice` }
}

export default async function InvoiceWorkspaceInvoicesPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="space-y-4">
      <ResourceToolbar title="Invoices" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={BILLING_INVOICES_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <InvoicesData slug={slug} />
      </Suspense>
    </div>
  )
}

async function InvoicesData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  // Invoices carry a customerId, not a name. One customer page resolves every
  // row's name; a retrieve per invoice would be an N+1 on a list screen.
  const [invoices, customers] = await Promise.all([
    billing.invoices.list(org.id),
    billing.customers.list(org.id),
  ])

  if (invoices.error)
    return (
      <AppError
        title="Invoices are temporarily unavailable"
        error={invoices.error}
        variant="banner"
        showCode
      />
    )

  return (
    <>
      {customers.error ? (
        <AppError
          title="Customer names could not be resolved"
          error={customers.error}
          variant="inline"
          showCode
        />
      ) : null}
      <InvoicesTable
        invoices={toInvoiceRows(
          invoices.data?.data ?? [],
          customers.data?.data ?? []
        )}
        baseHref={`${workspaceBase(slug, 'invoice')}/invoices`}
        formatAmount={formatBillingAmount}
        emptyState={
          <p className="text-muted-foreground py-10 text-center text-sm">
            No invoices exist in this workspace yet.
          </p>
        }
      />
    </>
  )
}
