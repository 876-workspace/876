import { BudgetVarianceTable } from '@876/projects-ui/reports/budget-variance-table'
import { AppError } from '@876/ui/app-error'

import type { ReportPeriod } from '@/lib/period'
import { projects } from '@/lib/services/projects'

export async function BudgetVarianceData({
  orgId,
  period,
}: {
  orgId: string
  period: ReportPeriod
}) {
  const result = await projects.reports.budgetVariance(orgId, {
    from: period.from,
    to: period.to,
  })

  if (result.error || !result.data)
    return (
      <AppError
        title="The budget variance report could not be loaded"
        error={
          result.error ?? {
            code: 'projects/report-unavailable',
            message: 'The budget variance report could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  return <BudgetVarianceTable report={result.data} />
}
