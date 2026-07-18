import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type { AdminAuditEvent, AdminListResponse } from '../types'

export type AdminAuditEventCreateParams = {
  event: string
  app_name: string
  source?: string
  user_id?: string | null
  path?: string | null
  search?: string | null
  referrer?: string | null
  title?: string | null
  request_id?: string | null
  session_id?: string | null
  distinct_id?: string | null
  properties?: Record<string, unknown>
}

/** `$876.auditEvents.*` — platform audit-event reads (internal-key tier). */
export function createAdminAuditEventsResource(runtime: AdminRuntime) {
  return {
    /**
     * Records a sanitized first-party analytics or client telemetry event.
     *
     * @see POST /audit-events
     */
    create(params: AdminAuditEventCreateParams) {
      return adminRequest<AdminAuditEvent>(runtime, {
        method: 'POST',
        path: '/audit-events',
        body: params,
      })
    },

    /**
     * Returns a list of audit events.
     *
     * @param params - Optional pagination and filtering parameters.
     * @returns A result containing a list object of audit events, or an error.
     */
    list(params?: {
      limit?: number
      starting_after?: string
      ending_before?: string
      app_name?: string
      event?: string
      user_id?: string
      path?: string
      q?: string
    }) {
      return adminRequest<AdminListResponse<AdminAuditEvent>>(runtime, {
        method: 'GET',
        path: '/audit-events',
        query: params as Record<string, string | number | undefined>,
      })
    },
  }
}
