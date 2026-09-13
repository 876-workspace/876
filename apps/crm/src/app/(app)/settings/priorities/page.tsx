import { Suspense } from 'react'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import {
  requireAppPermission,
  requireCrmContext,
} from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'

import { PRIORITIES_SKELETON_COLUMNS } from './_components/priorities-skeleton-columns'
import { PrioritySplit } from './_components/priority-split'
import { PrioritySplitSkeleton } from './_components/priority-split-skeleton'

export const metadata = { title: 'Priorities - Settings' }
const PRIORITY_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]
function isPriorityStatus(
  value: string | undefined
): value is 'active' | 'archived' {
  return value === 'active' || value === 'archived'
}
type Props = { searchParams: Promise<{ status?: string; priority?: string }> }

export default async function PrioritiesPage({ searchParams }: Props) {
  await requireAppPermission('priorities.view')

  const { status, priority } = await searchParams
  const selectedStatus = isPriorityStatus(status) ? status : 'all'
  const selectedPriorityId = priority
  return (
    <Page>
      <ResourceToolbar
        title="Priorities"
        titleFilter={
          <StatusFilterHeading
            label="Priorities"
            value={selectedStatus}
            options={PRIORITY_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={
          selectedStatus !== 'all'
            ? `/settings/priorities?status=${selectedStatus}&priority=new`
            : '/settings/priorities?priority=new'
        }
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          selectedPriorityId ? (
            <PrioritySplitSkeleton />
          ) : (
            <DataTableSkeleton columns={PRIORITIES_SKELETON_COLUMNS} />
          )
        }
      >
        <PrioritiesTableData
          status={selectedStatus}
          selectedPriorityId={selectedPriorityId}
        />
      </Suspense>
    </Page>
  )
}

async function PrioritiesTableData({
  status,
  selectedPriorityId,
}: {
  status: 'all' | 'active' | 'archived'
  selectedPriorityId?: string
}) {
  const context = await requireCrmContext()
  const activeOption =
    status === 'active' ? true : status === 'archived' ? false : undefined
  const result = await crm.requestPriorities.list(context.orgId, {
    active: activeOption,
  })
  if (result.error) throw new Error(result.error.message)
  return (
    <PrioritySplit
      priorities={result.data?.data ?? []}
      selectedId={selectedPriorityId}
    />
  )
}
