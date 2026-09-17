import { TimeReportTable } from '@876/projects-ui/reports/time-report-table'
import { AppError } from '@876/ui/app-error'

import type { ReportPeriod } from '@/types/reporting'
import { projects } from '@/lib/services/projects'

import type { ReportGroup } from '../report-query'

export async function TimeReportData({
  orgId,
  period,
  groupBy,
}: {
  orgId: string
  period: ReportPeriod
  groupBy: ReportGroup
}) {
  const result = await projects.reports.time(orgId, {
    groupBy,
    from: period.from,
    to: period.to,
  })

  if (result.error || !result.data)
    return (
      <AppError
        title="The time report could not be loaded"
        error={
          result.error ?? {
            code: 'projects/report-unavailable',
            message: 'The time report could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return <TimeReportTable report={result.data} />
}
