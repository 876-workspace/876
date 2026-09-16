import { CsvExportLink } from '@876/projects-ui/reports/csv-export-link'
import { ReportPeriodNav } from '@876/projects-ui/reports/report-period-nav'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ReportLinks } from '@/features/reports/components/report-links'
import { WORKLOAD_SKELETON_COLUMNS } from '@/features/reports/components/report-skeleton-columns'
import { WorkloadReportData } from '@/features/reports/components/workload-data'
import { csvExportHref } from '@/features/reports/report-query'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { resolvePeriod } from '@/lib/period'

export const metadata: Metadata = { title: 'Workload' }

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function WorkloadReportPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId } = await requireProjectsContext()
  const period = resolvePeriod(await searchParams)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar title="Workload" refresh />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReportPeriodNav
            basePath="/reports/workload"
            from={period.from}
            to={period.to}
          />
          <CsvExportLink
            href={csvExportHref('workload', { period })}
            download="workload-report.csv"
          />
        </div>
        <ReportLinks current="workload" period={period} />

        <Suspense
          fallback={
            <DataTableSkeleton columns={WORKLOAD_SKELETON_COLUMNS} rows={5} />
          }
        >
          <WorkloadReportData orgId={orgId} period={period} />
        </Suspense>
      </div>
    </div>
  )
}
