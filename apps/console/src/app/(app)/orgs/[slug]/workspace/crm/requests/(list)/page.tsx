import type { Metadata } from 'next'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { $876 } from '@/lib/876'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import {
  RequestsList,
  RequestsListSkeleton,
} from '@/features/crm/components/requests-list'
import { loadRequestRowContext } from '@/features/crm/request-data'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import type { CrmRequestStatus } from '@/types/crm'
import { resolveOrg } from '../../../../_data'

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
        primaryHref={`/orgs/${slug}/workspace/crm/requests/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<RequestsListSkeleton />}>
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
  // A missing workspace is a state, not a failure — an organization gets one the
  // first time it uses CRM. Everything else still reaches the error boundary,
  // because an unreachable CRM must not read as an organization with no requests.
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />
  if (result.error) throw new Error(result.error.message)

  const context = await loadRequestRowContext(org.id)

  return (
    <RequestsList
      requestsHref={`/orgs/${slug}/workspace/crm/requests`}
      requests={toRequestListRows({ requests: result.data.data, ...context })}
    />
  )
}
