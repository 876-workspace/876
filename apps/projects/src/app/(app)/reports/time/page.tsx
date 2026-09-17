import { CsvExportLink } from '@876/projects-ui/reports/csv-export-link'
import { ReportPeriodNav } from '@876/projects-ui/reports/report-period-nav'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { ReportLinks } from '@/features/reports/components/report-links'
import { timeReportSkeletonColumns } from '@/features/reports/components/report-skeleton-columns'
import { TimeReportData } from '@/features/reports/components/time-report-data'
import {
  csvExportHref,
  parseReportGroup,
  reportGroupLabel,
  reportHref,
} from '@/features/reports/report-query'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { resolvePeriod } from '@/lib/period'
import { REPORT_GROUPS } from '@/types/reporting'

export const metadata: Metadata = { title: 'Time report' }

type Props = {
  searchParams: Promise<{ from?: string; to?: string; groupBy?: string }>
}

export default async function TimeReportPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const query = await searchParams
  const period = resolvePeriod(query)
  const groupBy = parseReportGroup(query.groupBy)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar title="Time report" refresh />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReportPeriodNav
            basePath={`/reports/time?groupBy=${groupBy}`}
            from={period.from}
            to={period.to}
          />
          <CsvExportLink
            href={csvExportHref('time', { period, groupBy })}
            download="time-report.csv"
          />
        </div>
        <ReportLinks current="time" period={period} />

        <nav
          aria-label="Group time by"
          className="flex flex-wrap items-center gap-4"
        >
          <span className="text-muted-foreground text-sm">Group by</span>
          {REPORT_GROUPS.map((group) =>
            group === groupBy ? (
              <span
                key={group}
                aria-current="true"
                className="text-sm font-semibold"
              >
                {reportGroupLabel(group)}
              </span>
            ) : (
              <Link
                key={group}
                href={reportHref('/reports/time', period, group)}
                className="text-sm font-medium underline underline-offset-4"
              >
                {reportGroupLabel(group)}
              </Link>
            )
          )}
        </nav>

        <Suspense
          fallback={
            <DataTableSkeleton
              columns={timeReportSkeletonColumns(groupBy)}
              rows={5}
            />
          }
        >
          <TimeReportData orgId={orgId} period={period} groupBy={groupBy} />
        </Suspense>
      </div>
    </div>
  )
}
