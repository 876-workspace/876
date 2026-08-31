import { toCursorQuery, type CursorPageParams } from '@876/core/client'

import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type { AdminAuditEvent, AdminListResponse } from '../types'

export type AdminAuditEventCreateParams = {
  event: string
  appName: string
  source?: string
  userId?: string | null
  path?: string | null
  search?: string | null
  referrer?: string | null
  title?: string | null
  requestId?: string | null
  sessionId?: string | null
  distinctId?: string | null
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
        body: {
          event: params.event,
          app_name: params.appName,
          source: params.source,
          user_id: params.userId,
          path: params.path,
          search: params.search,
          referrer: params.referrer,
          title: params.title,
          request_id: params.requestId,
          session_id: params.sessionId,
          distinct_id: params.distinctId,
          properties: params.properties,
        },
      })
    },

    /**
     * Returns a list of audit events.
     *
     * @param params - Optional pagination and filtering parameters.
     * @returns A result containing a list object of audit events, or an error.
     */
    list(
      params?: CursorPageParams & {
        appName?: string
        event?: string
        userId?: string
        path?: string
        q?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminAuditEvent>>(runtime, {
        method: 'GET',
        path: '/audit-events',
        query: {
          ...toCursorQuery(params),
          app_name: params?.appName,
          event: params?.event,
          user_id: params?.userId,
          path: params?.path,
          q: params?.q,
        },
      })
    },
  }
}
