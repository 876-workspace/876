import { ClipboardList } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { EstimatesTable } from './estimates-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
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
    <Page>
      <ResourceToolbar
        title="Estimates"
        titleFilter={
          <StatusFilterHeading
            label="Estimates"
            value={selectedStatus}
            options={ESTIMATE_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('sales:write')
            ? 'New Estimate'
            : undefined
        }
        primaryHref={
          context.permissions.includes('sales:write')
            ? '/estimates/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

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
                Create a customer and item, then prepare the first draft
                estimate.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
