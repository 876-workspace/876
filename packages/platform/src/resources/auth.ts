import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type { AdminListResponse, AdminRoutingMembership } from '../types'

/** `$876.auth.*` — privileged auth/session bootstrap reads. */
export function createAdminAuthResource(runtime: AdminRuntime) {
  return {
    getRoutingMemberships(params: {
      userId: string
      orgSlug?: string
      status?: string
    }) {
      return adminRequest<AdminListResponse<AdminRoutingMembership>>(runtime, {
        method: 'GET',
        path: '/auth/routing/memberships',
        query: {
          userId: params.userId,
          orgSlug: params.orgSlug,
          status: params.status,
        },
      })
    },
  }
}
