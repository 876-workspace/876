import { ClipboardList } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { EstimatesTable } from '../_components/estimates-table'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import { service } from '@/lib/service'
import type { EstimateStatus } from '@/types/estimate'

export const metadata = {
  title: 'Estimates',
  description: 'Sales estimates and their line snapshots.',
}

const ESTIMATE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Estimates' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Estimates' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Estimates' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Estimates' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Estimates' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Estimates' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Estimates' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function EstimatesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status ?? '')
    ? status!
    : 'all'

  return (
    <Page>
      <StreamingResourceToolbar
        title="Estimates"
        status={selectedStatus}
        options={ESTIMATE_STATUS_OPTIONS}
        primary={{
          label: 'New Estimate',
          href: '/estimates/new',
          permission: 'sales:write',
        }}
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Estimate', cell: 'avatar' },
              { label: 'Customer' },
              { label: 'Amount' },
              { label: 'Status', cell: 'badge' },
            ]}
            rows={5}
          />
        }
      >
        <EstimatesTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function EstimatesTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status ?? '')
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as EstimateStatus)

  const context = await getWorkspaceContext()
  if (!context) return null

  const estimates = await service.estimates.list(
    context.tenant.id,
    filterStatus
  )

  return (
    <EstimatesTable
      estimates={estimates}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No estimates yet</EmptyTitle>
            <EmptyDescription>
              Create a customer and item, then prepare the first draft estimate.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
