import { ProjectHealthTable } from '@876/projects-ui/reports/project-health-table'
import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/services/projects'

export async function HealthReportData({
  orgId,
  projectHrefBase,
}: {
  orgId: string
  projectHrefBase: string
}) {
  const result = await projects.reports.health(orgId)

  if (result.error || !result.data)
    return (
      <AppError
        title="The health report could not be loaded"
        error={
          result.error ?? {
            code: 'projects/report-unavailable',
            message: 'The health report could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return (
    <ProjectHealthTable
      report={result.data}
      projectHrefBase={projectHrefBase}
    />
  )
}
