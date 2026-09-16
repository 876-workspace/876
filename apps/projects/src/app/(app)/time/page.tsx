import { nowUnixSeconds } from '@876/core/timestamps'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { MyTimeData } from '@/features/time/components/my-time-data'
import { TimePeriodNav } from '@/features/time/components/time-period-nav'
import { TIME_ENTRY_SKELETON_COLUMNS } from '@/features/time/components/time-entry-rows'
import { timePeriodHref, withEntryParam } from '@/features/time/components/time-links'
import {
  defaultTimePeriod,
  resolveTimePeriod,
} from '@/features/time/components/time-period'
import { canAccess } from '@/lib/auth/access-context'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Time' }

type Props = {
  searchParams: Promise<{ from?: string; to?: string; entry?: string }>
}

export default async function TimePage({ searchParams }: Props) {
  const access = await requireAppAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  const { orgId, userId } = await requireProjectsContext()
  const { from, to, entry } = await searchParams
  const now = nowUnixSeconds()
  const period = resolveTimePeriod({ from, to }, now)
  const canEdit = canAccess(access, 'projects.edit')

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Time"
        primaryLabel="Add"
        primaryHref={withEntryParam(timePeriodHref(period), 'new')}
        primaryVariant="info"
        refresh
        dropdownActions={
          canEdit ? [{ label: 'Approvals', href: '/time/approvals' }] : []
        }
      />
      <TimePeriodNav period={period} current={defaultTimePeriod(now)} />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TIME_ENTRY_SKELETON_COLUMNS} rows={6} />
        }
      >
        <MyTimeData
          orgId={orgId}
          userId={userId}
          period={period}
          entryParam={entry}
          canEdit={canEdit}
        />
      </Suspense>
    </div>
  )
}
