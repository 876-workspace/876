import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { TimesheetDetailData } from '@/features/projects/components/timesheet-detail-data'
import { formatOperatorDate } from '@/features/projects/components/operator-format'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

type Props = { params: Promise<{ timesheetId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { timesheetId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.timesheets.retrieve(
    organizationId,
    decodeURIComponent(timesheetId)
  )
  if (!result.data) return { title: 'Timesheet' }

  return {
    title: `${formatOperatorDate(result.data.periodStart)} – ${formatOperatorDate(result.data.periodEnd)} • Timesheets`,
  }
}

export default async function PlatformTimesheetDetailPage({ params }: Props) {
  const { timesheetId } = await params

  return (
    <Page>
      <Suspense fallback={<TimesheetDetailFallback />}>
        <TimesheetDetailSection timesheetId={timesheetId} />
      </Suspense>
    </Page>
  )
}

async function TimesheetDetailSection({
  timesheetId,
}: {
  timesheetId: string
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <TimesheetDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      timesheetId={timesheetId}
    />
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
