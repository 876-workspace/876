import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { AdminOrganization } from '@876/admin'
import { Button } from '@876/ui/button'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'

import { $876 } from '@/lib/876'
import { resolveOrg } from '../../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)

  return { title: `${org?.name ?? slug} • Billing Customers` }
}

export default async function OrganizationBillingCustomersPage({
  params,
}: Props) {
  const { slug } = await params

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="876-page-title">Billing customers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Billing-owned customer records.
          </p>
        </div>
        <Button render={<Link href={`/orgs/${slug}/billing/customers/new`} />}>
          Add customer
        </Button>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />}
      >
        <BillingCustomersShell slug={slug} />
      </Suspense>
    </div>
  )
}

async function BillingCustomersShell({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <BillingCustomersData org={org} />
}

async function BillingCustomersData({ org }: { org: AdminOrganization }) {
  const { data, error } = await $876.billing.integration.customers.list(org.id)

  return (
    <>
      {error ? (
        <div className="876-card text-muted-foreground p-5 text-sm">
          {error.message}
        </div>
      ) : data?.data.length ? (
        <div className="876-card overflow-hidden">
          <div className="divide-border divide-y">
            {data.data.map((customer) => (
              <article
                key={customer.id}
                className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {customer.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {customer.companyName ?? customer.customerKind}
                  </p>
                </div>
                <p className="text-muted-foreground truncate text-sm">
                  {customer.email ?? 'No email'}
                </p>
                <span className="text-muted-foreground text-xs">
                  {customer.status}
                </span>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="876-card text-muted-foreground p-5 text-sm">
          No Billing customers have been created for this organization.
        </div>
      )}
    </>
  )
}
