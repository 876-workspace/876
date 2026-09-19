import { MetricsSummaryPanel } from '@876/projects-ui/platform/metrics-summary-panel'
import { AppError } from '@876/ui/app-error'

import { toUiMetricsSummary } from '../projects-integration-mappers'
import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Health dashboard, shared by every host.
 * Read-only: platform-wide automation, webhook, and import counts over the
 * last 24 hours and 7 days. No per-organization breakdown is exposed.
 */
export async function HealthData({
  organizationId,
}: {
  organizationId: string
}) {
  void organizationId
  const result = await projects.metrics.summary()

  if (result.error || !result.data) {
    return (
      <AppError
        title="Health data could not be loaded"
        error={result.error}
        variant="banner"
        showCode
      />
    )
  }

  return <MetricsSummaryPanel summary={toUiMetricsSummary(result.data)} />
}
