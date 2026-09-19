import { MetricsSummaryPanel } from '@876/projects-ui/platform/metrics-summary-panel'
import { AppError } from '@876/ui/app-error'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppAccess } from '@/lib/auth/require-projects-context'
import { toUiMetricsSummary } from '@/lib/integration-mappers'
import { integration } from '@/lib/clients/integration'

export const metadata = { title: 'Platform health' }

export default async function HealthPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const result = await integration.getMetricsSummary()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Health</h1>
      {result.error || !result.data ? (
        <AppError
          title="Metrics could not be loaded"
          error={
            result.error ?? {
              code: 'projects/metrics-unavailable',
              message: 'Metrics could not be loaded.',
            }
          }
          variant="banner"
        />
      ) : (
        <div className="max-w-4xl">
          <MetricsSummaryPanel summary={toUiMetricsSummary(result.data)} />
        </div>
      )}
    </div>
  )
}
