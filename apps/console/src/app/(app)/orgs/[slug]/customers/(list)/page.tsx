import { billing } from '@/lib/services/billing'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminOrganization } from '@876/platform/compat'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { resolveOrg } from '@/features/orgs/org-data'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'
import { CustomersTable } from '../_components/customers-table'

const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Customers' }

  return {
    title: `${org.name ?? org.slug} • Customers - Organizations`,
  }
}

export default async function OrganizationCustomersPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'

  return (
    <div>
      <ResourceToolbar
        title="Customers"
        titleFilter={
          <StatusFilterHeading
            label="Customers"
            value={selectedStatus}
            options={CUSTOMER_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/orgs/${slug}/customers/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={<DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />}
      >
        <CustomersShell slug={slug} status={selectedStatus} />
      </Suspense>
    </div>
  )
}

async function CustomersShell({
  slug,
  status,
}: {
  slug: string
  status: string
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <CustomersData org={org} status={status} />
}

async function CustomersData({
  org,
  status,
}: {
  org: AdminOrganization
  status: string
}) {
  const listParams =
    status === 'all'
      ? undefined
      : { status: status.toUpperCase() as 'ACTIVE' | 'ARCHIVED' }
  const { data, error } = await billing.customers.list(org.id, listParams)

  if (error) {
    return (
      <div className="876-card text-muted-foreground p-5 text-[0.8125rem]">
        {error.message}
      </div>
    )
  }

  return <CustomersTable customers={data?.data ?? []} />
}
