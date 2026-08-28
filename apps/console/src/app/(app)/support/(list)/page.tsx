import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { PlatformOrganizationUnavailable } from '@/features/crm/components/platform-organization-unavailable'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { REQUESTS_SKELETON_COLUMNS } from '@/features/crm/components/requests-skeleton-columns'
import { RequestsTable } from '@/features/crm/components/requests-table'
import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'
import { $876 } from '@/lib/876'
import { getPlatformOrganization } from '@/lib/platform-org'
import type { CrmRequestStatus } from '@/types/crm'

export const metadata = { title: 'Support' }

type Props = {
  searchParams: Promise<{ status?: string }>
}

export default async function SupportRequestsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = isRequestStatus(status) ? status : 'all'

  return (
    <Page>
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
      <Suspense
        fallback={<DataTableSkeleton columns={REQUESTS_SKELETON_COLUMNS} />}
      >
        <RequestsData status={selectedStatus} />
      </Suspense>
    </Page>
  )
}

async function RequestsData({ status }: { status: CrmRequestStatus | 'all' }) {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  const result = await $876.requests.list(org.id, {
    status: status === 'all' ? undefined : status,
  })
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />
  if (result.error) throw new Error(result.error.message)

  return (
    <RequestsTable
      requestsHref="/support"
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
