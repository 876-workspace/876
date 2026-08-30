import { toCursorQuery, type CursorPageParams } from '@876/core/client'

import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminAuthAttempt,
  AdminAuthAttemptSummary,
  AdminListResponse,
} from '../types'

export function createAdminAuthAttemptsResource(runtime: AdminRuntime) {
  return {
    list(
      params?: CursorPageParams & {
        userId?: string
        identifier?: string
        event?: string
        outcome?: string
        ipAddress?: string
        countryCode?: string
        deviceFingerprint?: string
        appId?: string
        createdAfter?: number
        createdBefore?: number
        q?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminAuthAttempt>>(runtime, {
        method: 'GET',
        path: '/auth-attempts',
        query: {
          ...toCursorQuery(params),
          user_id: params?.userId,
          identifier: params?.identifier,
          event: params?.event,
          outcome: params?.outcome,
          ip_address: params?.ipAddress,
          ip_country_code: params?.countryCode,
          device_fingerprint: params?.deviceFingerprint,
          app_id: params?.appId,
          created_after: params?.createdAfter,
          created_before: params?.createdBefore,
          q: params?.q,
        },
      })
    },
    retrieve(attemptId: string) {
      return adminRequest<AdminAuthAttempt>(runtime, {
        method: 'GET',
        path: `/auth-attempts/${attemptId}`,
      })
    },
    retrieveSummary(params?: { window?: '24h' | '7d' | '30d' }) {
      return adminRequest<AdminAuthAttemptSummary>(runtime, {
        method: 'GET',
        path: '/auth-attempts/summary',
        query: { window: params?.window },
      })
    },
  }
}
