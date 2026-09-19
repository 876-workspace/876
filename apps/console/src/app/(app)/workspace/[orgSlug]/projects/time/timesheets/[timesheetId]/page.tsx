import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { TimesheetDetailData } from '@/features/projects/components/timesheet-detail-data'
import { formatOperatorDate } from '@/features/projects/components/operator-format'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; timesheetId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, timesheetId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Timesheet' }

  const result = await projects.timesheets.retrieve(
    org.id,
    decodeURIComponent(timesheetId)
  )
  if (!result.data) return { title: 'Timesheet' }

  return {
    title: `${formatOperatorDate(result.data.periodStart)} – ${formatOperatorDate(result.data.periodEnd)} • Timesheets - Organizations`,
  }
}

export default async function OrganizationTimesheetDetailPage({
  params,
}: Props) {
  const { orgSlug, timesheetId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<TimesheetDetailFallback />}>
      <TimesheetDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        timesheetId={timesheetId}
      />
    </Suspense>
  )
}

function TimesheetDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
