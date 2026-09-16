import {
  integrationRequest,
  type IntegrationRuntime,
} from '../integration-request'
import {
  metricsSummarySchema,
  type IntegrationRequestOptions,
} from '../integration-schemas'

export function createIntegrationMetricsResource(runtime: IntegrationRuntime) {
  return {
    summary(options: IntegrationRequestOptions = {}) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'GET',
          path: '/internal/metrics/summary',
          signal: options.signal,
        },
        metricsSummarySchema
      )
    },
  }
}
