import type { Metadata } from 'next'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { $876 } from '@/lib/876'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/support/request-status'
import { REQUESTS_SKELETON_COLUMNS } from '@/features/support/components/requests-skeleton-columns'
import { RequestsTable } from '@/features/support/components/requests-table'
import type { CrmRequestStatus } from '@/types/crm'
import { resolveOrg } from '../../_data'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Requests' }

  return { title: `${org.name ?? org.slug} • Requests - Organizations` }
}

/**
 * The organization requests tab.
 *
 * `params` and `searchParams` carry no I/O, so they are awaited here and the
 * toolbar renders synchronously; only the component that resolves the org and
 * calls CRM sits inside the boundary. The status is resolved here rather than
 * read from `useSearchParams()` in a client toolbar so this tab filters exactly
 * the way the Customers tab beside it does.
 */
export default async function OrganizationRequestsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params
  const { status } = await searchParams
  const selectedStatus = isRequestStatus(status) ? status : 'all'

  return (
    <div>
      <ResourceToolbar
        title="Requests"
        titleFilter={
          <StatusFilterHeading
            label="Requests"
            value={selectedStatus}
            options={REQUEST_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/orgs/${slug}/requests/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={<DataTableSkeleton columns={REQUESTS_SKELETON_COLUMNS} />}
      >
        <RequestsData slug={slug} status={selectedStatus} />
      </Suspense>
    </div>
  )
}

async function RequestsData({
  slug,
  status,
}: {
  slug: string
  status: CrmRequestStatus | 'all'
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await $876.requests.list(org.id, {
    status: status === 'all' ? undefined : status,
  })
  if (result.error) throw new Error(result.error.message)

  return (
    <RequestsTable
      requestsHref={`/orgs/${slug}/requests`}
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
