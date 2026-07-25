import { toCursorQuery, type CursorPageParams } from '../../client'
import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type { PlatformList, PlatformMembership } from '../types'

/** `platform.memberships.*` — org membership reads. */
export function createPlatformMembershipsResource(runtime: PlatformRuntime) {
  return {
    /** Lists memberships, filterable by organization and user. */
    list(
      params: CursorPageParams & {
        organizationId?: string
        userId?: string
      }
    ) {
      return platformRequest<PlatformList<PlatformMembership>>(runtime, {
        method: 'GET',
        path: '/memberships',
        query: {
          ...toCursorQuery(params),
          organization_id: params.organizationId,
          user_id: params.userId,
        },
      })
    },
  }
}
