import { Suspense } from 'react'

import { RequestsList, RequestsListSkeleton } from '@876/crm-ui/request-list'
import { toRequestListRows } from '@876/crm-ui/request-list-rows'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@876/crm-ui/request-status'
import type { RequestStatus } from '@876/crm'
import { AppError } from '@876/ui/app-error'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/services/crm'

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
        primaryHref="/requests/new"
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<RequestsListSkeleton />}>
        <RequestsData status={selectedStatus} />
      </Suspense>
    </Page>
  )
}

async function RequestsData({ status }: { status: RequestStatus | 'all' }) {
  const context = await getWorkspaceContext()
  if (!context) return null

  const crm = getCrm()
  const result = await crm.requests.list(context.orgId, {
    status: status === 'all' ? undefined : status,
  })

  if (result.error?.code === 'crm/tenant-not-found') {
    return <RequestsList requestsHref="/requests" requests={[]} />
  }

  const customerResult = result.data
    ? await crm.customers.list(context.orgId)
    : null
  const rows = result.data
    ? toRequestListRows({
        requests: result.data.data,
        customers: customerResult?.data?.data ?? [],
      })
    : []
  const error = result.error ?? customerResult?.error ?? null

  return (
    <div className="space-y-3">
      {error ? (
        <AppError
          title="Some request data could not be loaded"
          error={error}
          variant="banner"
          showCode
        />
      ) : null}
      <RequestsList requestsHref="/requests" requests={rows} />
    </div>
  )
}
