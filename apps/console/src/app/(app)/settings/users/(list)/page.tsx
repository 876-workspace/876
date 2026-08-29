import { Suspense } from 'react'
import { Settings } from '@876/ui/icons'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { loadTeamListData } from '@/lib/access/team-list-data'
import type { TeamGrantStatus } from '@/lib/service/team/list'
import { TeamTableRow, type TeamRow } from '../_components/member-row'
import { TEAM_SKELETON_COLUMNS } from '../_components/team-skeleton-columns'

export const metadata = { title: 'Team - Settings' }

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
]

function isTeamGrantStatus(value: string | undefined): value is TeamGrantStatus {
  return value === 'active' || value === 'suspended' || value === 'expired'
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function TeamSettingsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = isTeamGrantStatus(status) ? status : 'all'

  return (
    <Page>
      <TrackMCEventOnMount event={AnalyticsEvent.TeamListViewed} />
      <ResourceToolbar
        title="Team"
        titleFilter={
          <StatusFilterHeading
            label="Team"
            value={selectedStatus}
            options={STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/settings/users/new"
        primaryVariant="info"
        refresh
      />
      <Suspense fallback={<DataTableSkeleton columns={TEAM_SKELETON_COLUMNS} />}>
        <TeamTableData status={selectedStatus === 'all' ? undefined : selectedStatus} />
      </Suspense>
    </Page>
  )
}

async function TeamTableData({ status }: { status?: TeamGrantStatus }) {
  const { rows, staffPositionsUnavailable } = await loadTeamListData(status)
  const teamMembers: TeamRow[] = rows

  if (teamMembers.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Settings /></EmptyMedia>
          <EmptyTitle>No team members</EmptyTitle>
          <EmptyDescription>No Console access grants match this view.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-3">
      {staffPositionsUnavailable ? (
        <div
          role="status"
          className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-[0.8125rem]"
        >
          Staff positions are temporarily unavailable. Access grants and other Team details are still current.
        </div>
      ) : null}
      <div className="876-card overflow-hidden">
        <Table>
          <TeamTableHeader />
          <TableBody>
            {teamMembers.map((user) => <TeamTableRow key={user.id} user={user} />)}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function TeamTableHeader() {
  return (
    <TableHeader className="876-header-row">
      <TableRow>
        <TableHead className="w-12 px-5 py-3.5"><span className="sr-only">Avatar</span></TableHead>
        <TableHead className="px-5 py-3.5">Name</TableHead>
        <TableHead className="px-5 py-3.5">Email</TableHead>
        <TableHead className="px-5 py-3.5">Position</TableHead>
        <TableHead className="px-5 py-3.5">Affiliation</TableHead>
        <TableHead className="px-5 py-3.5">Role</TableHead>
        <TableHead className="px-5 py-3.5">Expires</TableHead>
      </TableRow>
    </TableHeader>
  )
}
