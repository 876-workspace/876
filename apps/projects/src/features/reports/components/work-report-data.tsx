import { WorkReportPanel } from '@876/projects-ui/reports/work-report-panel'
import { AppError } from '@876/ui/app-error'

import type { ReportPeriod } from '@/types/reporting'
import { projects } from '@/lib/clients/projects'

export async function WorkReportData({
  orgId,
  period,
}: {
  orgId: string
  period: ReportPeriod
}) {
  const result = await projects.reports.work(orgId, {
    from: period.from,
    to: period.to,
  })

  if (result.error || !result.data)
    return (
      <AppError
        title="The work report could not be loaded"
        error={
          result.error ?? {
            code: 'projects/report-unavailable',
            message: 'The work report could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return <WorkReportPanel report={result.data} />
}
