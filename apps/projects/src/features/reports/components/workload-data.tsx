import { WorkloadTable } from '@876/projects-ui/reports/workload-table'
import { AppError } from '@876/ui/app-error'

import type { ReportPeriod } from '@/lib/period'
import { projects } from '@/lib/services/projects'

export async function WorkloadReportData({
  orgId,
  period,
}: {
  orgId: string
  period: ReportPeriod
}) {
  const result = await projects.reports.workload(orgId, {
    from: period.from,
    to: period.to,
  })

  if (result.error || !result.data)
    return (
      <AppError
        title="The workload report could not be loaded"
        error={
          result.error ?? {
            code: 'projects/report-unavailable',
            message: 'The workload report could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return <WorkloadTable report={result.data} />
}
