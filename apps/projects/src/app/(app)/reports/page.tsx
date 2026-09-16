import { CsvExportLink } from '@876/projects-ui/reports/csv-export-link'
import { ReportPeriodNav } from '@876/projects-ui/reports/report-period-nav'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { HealthReportData } from '@/features/reports/components/health-report-data'
import { ReportLinks } from '@/features/reports/components/report-links'
import { HEALTH_REPORT_SKELETON_COLUMNS } from '@/features/reports/components/report-skeleton-columns'
import { WorkReportData } from '@/features/reports/components/work-report-data'
import { csvExportHref } from '@/features/reports/report-query'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { resolvePeriod } from '@/lib/period'

export const metadata: Metadata = { title: 'Reports' }

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function ReportsPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const period = resolvePeriod(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar title="Reports" refresh />

      <div className="space-y-6">
        <ReportPeriodNav
          basePath="/reports"
          from={period.from}
          to={period.to}
        />
        <ReportLinks current={null} period={period} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Project health</h2>
            <CsvExportLink
              href={csvExportHref('health')}
              download="health-report.csv"
            />
          </div>
          <Suspense
            fallback={
              <DataTableSkeleton
                columns={HEALTH_REPORT_SKELETON_COLUMNS}
                rows={5}
              />
            }
          >
            <HealthReportData orgId={orgId} projectHrefBase="/projects" />
          </Suspense>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Work in this period</h2>
            <CsvExportLink
              href={csvExportHref('work', { period })}
              download="work-report.csv"
            />
          </div>
          <Suspense fallback={<div className="876-card h-64 animate-pulse" />}>
            <WorkReportData orgId={orgId} period={period} />
          </Suspense>
        </section>
      </div>
    </div>
  )
}
