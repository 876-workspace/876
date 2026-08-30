import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import Link from 'next/link'
import { Plus } from '@876/ui/icons'
import { buttonVariants } from '@876/ui/button'
import { Page, PageBreadcrumb } from '@876/ui/page'

import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { loadTeamListData } from '@/lib/access/team-list-data'
import type { TeamGrantStatus } from '@/lib/service/team/list'
import type { TeamRow } from '../_components/member-row'
import { TEAM_SKELETON_COLUMNS } from '../_components/team-skeleton-columns'
import { TeamSplit } from '../_components/team-split'
import { TeamSplitSkeleton } from '../_components/team-split-skeleton'

export const metadata = { title: 'Users - Settings' }

const STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Users' },
  { value: 'active', label: 'Active', headingLabel: 'Active Users' },
  { value: 'suspended', label: 'Suspended', headingLabel: 'Suspended Users' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Users' },
]

function isTeamGrantStatus(
  value: string | undefined
): value is TeamGrantStatus {
  return value === 'active' || value === 'suspended' || value === 'expired'
}

type Props = {
  searchParams: Promise<{ status?: string; member?: string }>
}

export default async function TeamSettingsPage({ searchParams }: Props) {
  const params = await searchParams
  const selectedStatus = isTeamGrantStatus(params.status)
    ? params.status
    : undefined
  const statusParam = selectedStatus ?? 'all'
  const selectedMemberId = params.member

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-6 flex items-center justify-between gap-4">
        <StatusFilterHeading
          label="Users"
          value={statusParam}
          options={STATUS_OPTIONS}
        />
        <Link
          href="/settings/users/new"
          className={buttonVariants({ variant: 'info', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add
        </Link>
      </div>
      <TrackMCEventOnMount event={AnalyticsEvent.TeamListViewed} />
      <Suspense
        fallback={
          selectedMemberId ? (
            <TeamSplitSkeleton />
          ) : (
            <DataTableSkeleton columns={TEAM_SKELETON_COLUMNS} />
          )
        }
      >
        <TeamTableData
          status={selectedStatus}
          selectedMemberId={selectedMemberId}
        />
      </Suspense>
    </Page>
  )
}

async function TeamTableData({
  status,
  selectedMemberId,
}: {
  status?: TeamGrantStatus
  selectedMemberId?: string
}) {
  const { rows, staffPositionsUnavailable } = await loadTeamListData(status)
  const teamMembers: TeamRow[] = rows

  return (
    <div className="space-y-3">
      {staffPositionsUnavailable ? (
        <div
          role="status"
          className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-[0.8125rem]"
        >
          Staff positions are temporarily unavailable. Access grants and other
          Team details are still current.
        </div>
      ) : null}
      <TeamSplit members={teamMembers} selectedId={selectedMemberId} />
    </div>
  )
}
