import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type { PlatformList, PlatformMembership } from '../types'

/** `platform.memberships.*` — org membership reads. */
export function createPlatformMembershipsResource(runtime: PlatformRuntime) {
  return {
    /** Lists memberships, filterable by organization and user. */
    list(params: {
      limit?: number
      starting_after?: string
      ending_before?: string
      organization_id?: string
      user_id?: string
    }) {
      return platformRequest<PlatformList<PlatformMembership>>(runtime, {
        method: 'GET',
        path: '/memberships',
        query: params,
      })
    },
  }
}
