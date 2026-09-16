import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { nowUnixSeconds } from '@876/core/timestamps'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { resolveOrg } from '@/features/orgs/org-data'
import { CalendarData } from '@/features/projects/components/calendar-data'
import { CALENDAR_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'

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

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ from?: string; to?: string; project?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Calendar' }

  return { title: `${org.name ?? org.slug} • Calendar - Organizations` }
}

export default async function OrganizationCalendarPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug } = await params
  const query = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const now = nowUnixSeconds()
  const fallbackFrom = startOfMonthUtc(now)
  const fallbackTo = startOfNextMonthUtc(now)
  const from = parseTimestamp(query.from) ?? fallbackFrom
  const to = parseTimestamp(query.to) ?? fallbackTo
  const valid = from < to && to - from <= MAX_RANGE_DAYS * DAY_SECONDS

  return (
    <div>
      <ResourceToolbar title="Calendar" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CALENDAR_SKELETON_COLUMNS} rows={5} />
        }
      >
        <CalendarData
          organizationId={org.id}
          from={valid ? from : fallbackFrom}
          to={valid ? to : fallbackTo}
          projectId={query.project?.trim() || undefined}
        />
      </Suspense>
    </div>
  )
}
