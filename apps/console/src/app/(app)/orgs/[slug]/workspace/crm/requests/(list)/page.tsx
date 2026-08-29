import { AppError } from '@876/ui/app-error'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import {
  RequestsList,
  RequestsListSkeleton,
} from '@/features/crm/components/requests-list'
import { loadRequestRowContext } from '@/features/crm/request-data'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'
import { $876 } from '@/lib/876'
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
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />

  const context = result.data ? await loadRequestRowContext(org.id) : null
  const rows =
    result.data && context
      ? toRequestListRows({ requests: result.data.data, ...context })
      : []

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some request data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <RequestsList
        requestsHref={`/orgs/${slug}/workspace/crm/requests`}
        requests={rows}
      />
    </div>
  )
}
