import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import {
  RequestsList,
  RequestsListSkeleton,
} from '@/features/crm/components/requests-list'
import {
  loadRequestRowContext,
  resolveRequestOrgId,
} from '@/features/crm/request-data'
import { PLATFORM_REQUESTS_HREF } from '@/features/crm/request-paths'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'
import { crm } from '@/lib/services/crm'
import type { CrmRequestStatus } from '@/types/crm'

export const metadata = { title: 'Requests' }

type Props = {
  searchParams: Promise<{ status?: string }>
}

export default async function RequestsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = isRequestStatus(status) ? status : 'all'

  return (
    <Page className="mx-auto w-full max-w-[1400px]">
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
        primaryHref={`${PLATFORM_REQUESTS_HREF}/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<RequestsListSkeleton />}>
        <RequestsData status={selectedStatus} />
      </Suspense>
    </Page>
  )
}

async function RequestsData({ status }: { status: CrmRequestStatus | 'all' }) {
  const orgId = await resolveRequestOrgId()
  if (!orgId) return <PlatformOrganizationUnavailable />

  const result = await crm.requests.list(orgId, {
    status: status === 'all' ? undefined : status,
  })
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />

  const context = result.data ? await loadRequestRowContext(orgId) : null
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
      <RequestsList requestsHref={PLATFORM_REQUESTS_HREF} requests={rows} />
    </div>
  )
}
