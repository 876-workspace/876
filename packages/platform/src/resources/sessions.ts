import { toCursorQuery, type CursorPageParams } from '@876/core/client'

import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminDeletedSession,
  AdminDeletedUserSessions,
  AdminListResponse,
  AdminSession,
} from '../types'

export function createAdminSessionsResource(runtime: AdminRuntime) {
  return {
    list(
      params?: CursorPageParams & {
        userId?: string
        active?: boolean
        status?: 'active' | 'revoked' | 'expired'
        deviceId?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminSession>>(runtime, {
        method: 'GET',
        path: '/sessions',
        query: {
          ...toCursorQuery(params),
          user_id: params?.userId,
          active: params?.active,
          status: params?.status,
          device_id: params?.deviceId,
        },
      })
    },
    retrieve(sessionId: string) {
      return adminRequest<AdminSession>(runtime, {
        method: 'GET',
        path: `/sessions/${sessionId}`,
      })
    },
    revoke(sessionId: string) {
      return adminRequest<AdminDeletedSession>(runtime, {
        method: 'DELETE',
        path: `/sessions/${sessionId}`,
      })
    },
    revokeForUser(userId: string) {
      return adminRequest<AdminDeletedUserSessions>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}/sessions`,
      })
    },
  }
}
