import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { CustomerProfileCard } from '@/features/crm/components/customer-profile'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { RequestsTable } from '@/features/crm/components/requests-table'
import { resolveCustomerIdentity } from '@/features/crm/customer-identity'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '../../../../_data'

type Props = { params: Promise<{ slug: string; customerId: string }> }

export const metadata: Metadata = { title: 'Customer - Organizations' }

export default function CrmWorkspaceCustomerPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<CustomerFallback />}>
        <CustomerData params={params} />
      </Suspense>
    </div>
  )
}

async function CustomerData({ params }: Props) {
  const { slug, customerId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const base = workspaceBase(slug, 'crm')
  const customerResult = await $876.customerProfiles.retrieve(
    org.id,
    customerId
  )
  if (customerResult.error?.code === 'crm/tenant-not-found')
    return <NoCrmWorkspace />
  if (customerResult.error?.code === 'crm/customer-not-found') notFound()
  if (customerResult.error) throw new Error(customerResult.error.message)

  const { profile, customer } = customerResult.data
  const identity = resolveCustomerIdentity(customer, profile.billingCustomerId)

  return (
    <>
      <PageBreadcrumb href={`${base}/customers`} label="Customers" />
      <CustomerProfileCard
        identity={identity}
        status={profile.status}
        createdAt={profile.createdAt}
      />

      <div className="space-y-3">
        <h2 className="text-[0.9375rem] font-semibold">Requests</h2>
        <Suspense fallback={<Skeleton className="h-48 rounded-lg" />}>
          <CustomerRequests
            organizationId={org.id}
            customerId={profile.id}
            requestsHref={`${base}/requests`}
          />
        </Suspense>
      </div>
    </>
  )
}

/**
 * The customer's own requests.
 *
 * Filtered by the owning service through `customerId` rather than by listing
 * every request and trimming the result here — the API owns the filter, so the
 * count and any later pagination stay truthful.
 */
async function CustomerRequests({
  organizationId,
  customerId,
  requestsHref,
}: {
  organizationId: string
  customerId: string
  requestsHref: string
}) {
  const result = await $876.requests.list(organizationId, { customerId })
  if (result.error) throw new Error(result.error.message)

  return (
    <RequestsTable
      requestsHref={requestsHref}
      requests={result.data.data.map((request) => ({
        id: request.id,
        number: request.number,
        subject: request.subject,
        customerId: request.customerId,
        assigneeId: request.assigneeId,
        status: request.status,
        priority: request.priority,
        source: request.source,
        createdAt: request.createdAt,
      }))}
    />
  )
}

function CustomerFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}
