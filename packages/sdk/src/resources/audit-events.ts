import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  sdk876AuditEventCreateParamsSchema,
  sdk876AuditEventSchema,
} from '../types/audit-events.ts'
import type {
  AuditEventCreateParams,
  AuditEventResult,
} from '../types/audit-events.ts'
import { validateParams } from '../validation.ts'

/** `$876.auditEvents.*` — first-party analytics/telemetry event recording. */
export function createAuditEventsResource(runtime: SdkRuntime) {
  return {
    /**
     * Records a sanitized first-party analytics or client telemetry event.
     *
     * @see POST /audit-events
     */
    create(
      params: AuditEventCreateParams,
      requestOptions?: RequestOptions
    ): Promise<AuditEventResult> {
      const validation = validateParams(
        sdk876AuditEventCreateParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'POST',
        '/audit-events',
        validation.data,
        sdk876AuditEventSchema,
        requestOptions
      )
    },
  }
}
