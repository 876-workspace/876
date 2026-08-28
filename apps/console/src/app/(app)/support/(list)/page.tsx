import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { PlatformOrganizationUnavailable } from '@/features/crm/components/platform-organization-unavailable'
import {
  RequestsList,
  RequestsListSkeleton,
} from '@/features/crm/components/requests-list'
import {
  loadRequestRowContext,
  resolveRequestOrgId,
} from '@/features/crm/request-data'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'
import { $876 } from '@/lib/876'
import type { CrmRequestStatus } from '@/types/crm'

export const metadata = { title: 'Support' }

type Props = {
  searchParams: Promise<{ status?: string }>
}

export default async function SupportRequestsPage({ searchParams }: Props) {
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
        primaryHref="/support/new"
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

  const result = await $876.requests.list(orgId, {
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
      <RequestsList requestsHref="/support" requests={rows} />
    </div>
  )
}
