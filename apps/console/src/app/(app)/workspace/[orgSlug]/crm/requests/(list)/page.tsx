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
import { crm } from '@/lib/services/crm'
import type { CrmRequestStatus } from '@/types/crm'

import { resolveOrg } from '@/features/orgs/org-data'
import { workspaceBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Requests' }

  return { title: `${org.name ?? org.slug} • Requests - Organizations` }
}

export default async function OrganizationRequestsPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
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
        primaryHref={`${workspaceBase(orgSlug, 'crm')}/requests/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<RequestsListSkeleton />}>
        <RequestsData orgSlug={orgSlug} status={selectedStatus} />
      </Suspense>
    </div>
  )
}

async function RequestsData({
  orgSlug,
  status,
}: {
  orgSlug: string
  status: CrmRequestStatus | 'all'
}) {
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const result = await crm.requests.list(org.id, {
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
        requestsHref={`${workspaceBase(orgSlug, 'crm')}/requests`}
        requests={rows}
      />
    </div>
  )
}
