import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
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
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />
  if (result.error)
    return (
      <AppError
        title="Customer data is temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <CustomersTable
      customersHref={`${workspaceBase(slug, 'crm')}/customers`}
      customers={result.data.data.map(toCustomerRow)}
    />
  )
}
