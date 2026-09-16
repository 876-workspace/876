import { Suspense } from 'react'
import { nowUnixSeconds } from '@876/core/timestamps'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { CalendarData } from '@/features/projects/components/calendar-data'
import { CALENDAR_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Calendar' }

const DAY_SECONDS = 86400
const MAX_RANGE_DAYS = 366

function startOfMonthUtc(now: number): number {
  const date = new Date(now * 1000)
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000
  )
}

function startOfNextMonthUtc(now: number): number {
  const date = new Date(now * 1000)
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1000
  )
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export default async function PlatformCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; project?: string }>
}) {
  const org = await getPlatformOrganization()
  const params = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  const now = nowUnixSeconds()
  const fallbackFrom = startOfMonthUtc(now)
  const fallbackTo = startOfNextMonthUtc(now)
  const from = parseTimestamp(params.from) ?? fallbackFrom
  const to = parseTimestamp(params.to) ?? fallbackTo
  const valid =
    from < to && to - from <= MAX_RANGE_DAYS * DAY_SECONDS

  return (
    <Page>
      <ResourceToolbar title="Calendar" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CALENDAR_SKELETON_COLUMNS} rows={8} />
        }
      >
        <CalendarData
          organizationId={org.id}
          from={valid ? from : fallbackFrom}
          to={valid ? to : fallbackTo}
          projectId={params.project?.trim() || undefined}
        />
      </Suspense>
    </Page>
  )
}
