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

/** Maps camelCase create params onto the `/audit-events` wire contract. */
function toAuditEventCreateBody(
  params: AuditEventCreateParams
): Record<string, unknown> {
  return {
    event: params.event,
    source: params.source,
    app_name: params.appName,
    user_id: params.userId,
    path: params.path,
    search: params.search,
    referrer: params.referrer,
    title: params.title,
    request_id: params.requestId,
    session_id: params.sessionId,
    distinct_id: params.distinctId,
    properties: params.properties,
  }
}

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
        toAuditEventCreateBody(validation.data),
        sdk876AuditEventSchema,
        requestOptions
      )
    },
  }
}
