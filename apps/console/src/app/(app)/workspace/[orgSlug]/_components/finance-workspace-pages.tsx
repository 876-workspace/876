import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { BankAccountsGrid } from '@876/billing-ui/bank-accounts-grid'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { toBankAccountRows } from '@/features/billing/bank-account-rows'
import { toCustomerRows } from '@/features/billing/customer-rows'
import { toInvoiceRows } from '@/features/billing/invoice-rows'
import { toItemRow } from '@/features/billing/item-rows'
import { toPaymentRows } from '@/features/billing/payment-rows'
import { BILLING_ITEMS_SKELETON_COLUMNS } from '@/features/billing/components/items-skeleton-columns'
import { BILLING_CUSTOMERS_SKELETON_COLUMNS } from '@/features/billing/components/customers-skeleton-columns'
import { BILLING_INVOICES_SKELETON_COLUMNS } from '@/features/billing/components/invoices-skeleton-columns'
import { BILLING_PAYMENTS_SKELETON_COLUMNS } from '@/features/billing/components/payments-skeleton-columns'
import {
  CustomersTable,
  InvoicesTable,
  ItemsTable,
  PaymentsTable,
} from '@/features/billing/components/finance-tables'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { billing } from '@/lib/clients/billing'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = { params: Promise<{ orgSlug: string }> }

function staticTitleFilter(title: string) {
  return (
    <StatusFilterHeading
      label={title}
      value="all"
      options={[{ value: 'all', label: `All ${title}` }]}
    />
  )
}

/**
 * The finance workspace screens Billing and Invoice both render.
 *
 * 876 Billing and 876 Invoice are two products over one finance plane, so an
 * operator's Customers screen for either is the same screen against the same
 * organization — only the workspace segment its links point at differs. These
 * factories keep that a parameter rather than a second copy of each page,
 * exactly as `createWorkspaceLayout` does for the shell.
 *
 * Every page here is chrome first: the toolbar renders immediately and only the
 * data region suspends (`CLAUDE.md` → Loading States & Suspense Placement).
 */

function metadataFor(title: string, appLabel: string) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { orgSlug } = await params
    const org = await resolveOrg(orgSlug)
    if (!org) return { title }

    return { title: `${org.name ?? org.slug} • ${title} - ${appLabel}` }
  }
}

export function createWorkspaceCustomersPage(
  workspaceKey: string,
  appLabel: string
) {
  const generateMetadata = metadataFor('Customers', appLabel)

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar
          title="Customers"
          titleFilter={staticTitleFilter('Customers')}
          refresh
        />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={BILLING_CUSTOMERS_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <CustomersData params={params} workspaceKey={workspaceKey} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function CustomersData({
  params,
  workspaceKey,
}: Props & { workspaceKey: string }) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const result = await billing.customers.list(org.id)
  if (result.error)
    return (
      <AppError
        title="Customers are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <CustomersTable
      customers={toCustomerRows(result.data?.data ?? [])}
      baseHref={`${workspaceBase(orgSlug, workspaceKey)}/customers`}
      emptyState={
        <p className="text-muted-foreground py-10 text-center text-sm">
          No customers exist in this workspace yet.
        </p>
      }
    />
  )
}

export function createWorkspacePaymentsPage(
  workspaceKey: string,
  appLabel: string
) {
  const generateMetadata = metadataFor('Payments', appLabel)

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar
          title="Payments"
          titleFilter={staticTitleFilter('Payments')}
          refresh
        />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={BILLING_PAYMENTS_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <PaymentsData params={params} workspaceKey={workspaceKey} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function PaymentsData({
  params,
  workspaceKey,
}: Props & { workspaceKey: string }) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const result = await billing.payments.list(org.id)
  if (result.error)
    return (
      <AppError
        title="Payments are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <PaymentsTable
      payments={toPaymentRows(result.data?.data ?? [])}
      baseHref={`${workspaceBase(orgSlug, workspaceKey)}/payments`}
      emptyState={
        <p className="text-muted-foreground py-10 text-center text-sm">
          No payments have been received in this workspace yet.
        </p>
      }
    />
  )
}

export function createWorkspaceBankingPage(
  workspaceKey: string,
  appLabel: string
) {
  const generateMetadata = metadataFor('Banking', appLabel)

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar
          title="Banking"
          titleFilter={staticTitleFilter('Banking')}
          refresh
        />
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <BankingData params={params} workspaceKey={workspaceKey} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function BankingData({
  params,
  workspaceKey,
}: Props & { workspaceKey: string }) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const result = await billing.bankAccounts.list(org.id)
  if (result.error)
    return (
      <AppError
        title="Bank accounts are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <BankAccountsGrid
      accounts={toBankAccountRows(result.data?.data ?? [])}
      baseHref={`${workspaceBase(orgSlug, workspaceKey)}/banking`}
      emptyState={
        <p className="text-muted-foreground py-10 text-center text-sm">
          No bank accounts exist in this workspace yet.
        </p>
      }
    />
  )
}

export function createWorkspaceInvoicesPage(
  workspaceKey: string,
  appLabel: string
) {
  const generateMetadata = metadataFor('Invoices', appLabel)

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar
          title="Invoices"
          titleFilter={staticTitleFilter('Invoices')}
          refresh
        />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={BILLING_INVOICES_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <InvoicesData params={params} workspaceKey={workspaceKey} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function InvoicesData({
  params,
  workspaceKey,
}: Props & { workspaceKey: string }) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
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
        baseHref={`${workspaceBase(orgSlug, workspaceKey)}/invoices`}
        emptyState={
          <p className="text-muted-foreground py-10 text-center text-sm">
            No invoices exist in this workspace yet.
          </p>
        }
      />
    </>
  )
}

export function createWorkspaceItemsPage(
  workspaceKey: string,
  appLabel: string,
  emptyLine: string
) {
  const generateMetadata = metadataFor('Items', appLabel)

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar
          title="Items"
          titleFilter={staticTitleFilter('Items')}
          refresh
        />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={BILLING_ITEMS_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <ItemsData
            params={params}
            workspaceKey={workspaceKey}
            emptyLine={emptyLine}
          />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function ItemsData({
  params,
  workspaceKey,
  emptyLine,
}: Props & { workspaceKey: string; emptyLine: string }) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  // The tenant is read for its default currency only, so it starts alongside
  // the items rather than behind them.
  const [result, tenant] = await Promise.all([
    billing.items.list(org.id),
    billing.organizations.retrieve(org.id),
  ])

  if (result.error)
    return (
      <AppError
        title="Items are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <ItemsTable
      items={(result.data?.data ?? []).map(toItemRow)}
      defaultCurrency={tenant.data?.defaultCurrency ?? 'JMD'}
      baseHref={`${workspaceBase(orgSlug, workspaceKey)}/items`}
      emptyState={
        <p className="text-muted-foreground py-10 text-center text-sm">
          {emptyLine}
        </p>
      }
    />
  )
}
