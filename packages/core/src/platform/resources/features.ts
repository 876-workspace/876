import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type { PlatformFeature, PlatformList } from '../types'

/** `platform.features.*` — feature-flag evaluation for a user/org/app scope. */
export function createPlatformFeaturesResource(runtime: PlatformRuntime) {
  return {
    /** Evaluates the enabled feature flags for a user/org/app scope. */
    evaluate(params: {
      userId?: string
      organizationId?: string
      appId?: string
      appSlug?: string
      includeGlobal?: boolean
    }) {
      return platformRequest<PlatformList<PlatformFeature>>(runtime, {
        method: 'GET',
        path: '/features/evaluate',
        query: {
          userId: params.userId,
          organizationId: params.organizationId,
          appId: params.appId,
          appSlug: params.appSlug,
          includeGlobal: params.includeGlobal,
        },
      })
    },
  }
}
