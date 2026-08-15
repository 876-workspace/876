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
          userId: params?.userId,
          identifier: params?.identifier,
          event: params?.event,
          outcome: params?.outcome,
          ipAddress: params?.ipAddress,
          ipCountryCode: params?.countryCode,
          deviceFingerprint: params?.deviceFingerprint,
          appId: params?.appId,
          createdAfter: params?.createdAfter,
          createdBefore: params?.createdBefore,
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
