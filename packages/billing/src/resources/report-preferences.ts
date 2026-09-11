import { Request } from '../request'
import type { Runtime } from '../runtime'
import { ReportPreferencesSchema } from '../schemas'
import type {
  ReportPreferences,
  ReportPreferencesUpdateParams,
  RequestOptions,
} from '../types'

/** `$876.billing.reportPreferences.*` — tenant reporting settings. */
export function createReportPreferencesResource(runtime: Runtime) {
  return {
    /** Retrieves the workspace reporting timezone and fiscal start month. */
    retrieve(options?: RequestOptions) {
      return Request<ReportPreferences>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/report-preferences',
          signal: options?.signal,
        },
        ReportPreferencesSchema
      )
    },
    /** Updates the workspace reporting timezone and fiscal start month. */
    update(params: ReportPreferencesUpdateParams, options?: RequestOptions) {
      return Request<ReportPreferences>(
        runtime,
        {
          method: 'PATCH',
          path: '/api/v1/report-preferences',
          body: params,
          signal: options?.signal,
        },
        ReportPreferencesSchema
      )
    },
  }
}
