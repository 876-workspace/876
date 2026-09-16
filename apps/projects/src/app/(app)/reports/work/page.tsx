import { CsvExportLink } from '@876/projects-ui/reports/csv-export-link'
import { ReportPeriodNav } from '@876/projects-ui/reports/report-period-nav'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ReportLinks } from '@/features/reports/components/report-links'
import { WorkReportData } from '@/features/reports/components/work-report-data'
import { csvExportHref } from '@/features/reports/report-query'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { resolvePeriod } from '@/lib/period'

export const metadata: Metadata = { title: 'Work report' }

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function WorkReportPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const period = resolvePeriod(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar title="Work report" refresh />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReportPeriodNav
            basePath="/reports/work"
            from={period.from}
            to={period.to}
          />
          <CsvExportLink
            href={csvExportHref('work', { period })}
            download="work-report.csv"
          />
        </div>
        <ReportLinks current="work" period={period} />

        <Suspense fallback={<div className="876-card h-64 animate-pulse" />}>
          <WorkReportData orgId={orgId} period={period} />
        </Suspense>
      </div>
    </div>
  )
}
