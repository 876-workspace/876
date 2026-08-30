import { toCursorQuery, type CursorPageParams } from '@876/core/client'

import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type { AdminAuthAttempt, AdminDevice, AdminListResponse } from '../types'

export function createAdminDevicesResource(runtime: AdminRuntime) {
  return {
    list(
      params?: CursorPageParams & {
        userId?: string
        fingerprint?: string
        deviceType?: string
        trusted?: boolean
        blocked?: boolean
        q?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminDevice>>(runtime, {
        method: 'GET',
        path: '/devices',
        query: {
          ...toCursorQuery(params),
          user_id: params?.userId,
          fingerprint: params?.fingerprint,
          device_type: params?.deviceType,
          trusted: params?.trusted,
          blocked: params?.blocked,
          q: params?.q,
        },
      })
    },
    retrieve(deviceId: string) {
      return adminRequest<AdminDevice>(runtime, {
        method: 'GET',
        path: `/devices/${deviceId}`,
      })
    },
    update(
      deviceId: string,
      params: {
        label?: string | null
        trusted?: boolean
        blocked?: boolean
        blockReason?: string | null
      }
    ) {
      return adminRequest<AdminDevice>(runtime, {
        method: 'POST',
        path: `/devices/${deviceId}`,
        body: {
          label: params.label,
          trusted: params.trusted,
          blocked: params.blocked,
          block_reason: params.blockReason,
        },
      })
    },
    listAttempts(deviceId: string, params?: CursorPageParams) {
      return adminRequest<AdminListResponse<AdminAuthAttempt>>(runtime, {
        method: 'GET',
        path: `/devices/${deviceId}/attempts`,
        query: toCursorQuery(params),
      })
    },
    listUsers(deviceId: string) {
      return adminRequest<
        AdminListResponse<{
          object: 'device_user'
          user_id: string
          device_id: string
          first_seen_at: number
          last_seen_at: number
          sign_in_count: number
        }>
      >(runtime, { method: 'GET', path: `/devices/${deviceId}/users` })
    },
  }
}
