import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import {
  isRequestStatus,
  REQUEST_STATUS_OPTIONS,
} from '@/features/crm/request-status'

import { AllRequestsTableData } from './_components/all-requests-table-data'

export const metadata = { title: 'All requests' }

const ALL_REQUESTS_SKELETON_COLUMNS = [
  { label: 'Request' },
  { label: 'Organization' },
  { label: 'Status', cell: 'badge' },
  { label: 'Created' },
] satisfies DataTableSkeletonColumn[]

type Props = {
  searchParams: Promise<{ status?: string; after?: string }>
}

export default async function AllRequestsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = isRequestStatus(status) ? status : 'all'

  return (
    <Page>
      <ResourceToolbar
        title="All requests"
        titleFilter={
          <StatusFilterHeading
            label="All requests"
            value={selectedStatus}
            options={REQUEST_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ALL_REQUESTS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <AllRequestsTableData
          searchParams={searchParams}
          status={selectedStatus}
        />
      </Suspense>
    </Page>
  )
}
