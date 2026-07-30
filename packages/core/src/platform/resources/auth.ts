import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type { PlatformRoutingMembership } from '../types'

/** Routing-membership transport composed as `$876.memberships.listRouting()`. */
export function createPlatformAuthResource(runtime: PlatformRuntime) {
  return {
    /** Resolves a user's org memberships for session routing. */
    getRoutingMemberships(params: {
      userId: string
      orgSlug?: string
      status?: string
    }) {
      return platformRequest<{ data: PlatformRoutingMembership[] }>(runtime, {
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
