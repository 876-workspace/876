import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { $876 } from '@/lib/876'
import { CRM_CUSTOMERS_SKELETON_COLUMNS } from '@/features/crm/components/customers-skeleton-columns'
import { CustomersTable } from '@/features/crm/components/customers-table'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { toCustomerRow } from '@/features/crm/customer-rows'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '../../../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Customers' }

  return { title: `${org.name ?? org.slug} • CRM customers - Organizations` }
}

/**
 * The customers an organization holds in its own CRM workspace.
 *
 * These are the organization's customers, not 876's. The Customers tab on the
 * organization page answers the other question — the organization's own
 * relationship with 876 — and the two must not be confused, which is exactly
 * why this one lives behind the workspace frame.
 */
export default async function CrmWorkspaceCustomersPage({ params }: Props) {
  const { slug } = await params

  return (
    <div>
      <ResourceToolbar title="Customers" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={CRM_CUSTOMERS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <CustomersData slug={slug} />
      </Suspense>
    </div>
  )
}

async function CustomersData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await $876.customerProfiles.list(org.id)
  // A missing workspace is a state, not a failure. Anything else still reaches
  // the error boundary, so a CRM outage cannot render as "no customers".
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />
  if (result.error) throw new Error(result.error.message)

  return (
    <CustomersTable
      customersHref={`${workspaceBase(slug, 'crm')}/customers`}
      customers={result.data.data.map(toCustomerRow)}
    />
  )
}
