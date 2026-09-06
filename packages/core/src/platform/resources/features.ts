import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import { resolveExperimentDecision } from '../experiments'
import type {
  PlatformExperimentDecision,
  PlatformFeature,
  PlatformFeatureEvaluationDecision,
  PlatformList,
} from '../types'

/** `platform.features.*` — feature-flag and experiment evaluation for a user/org/app scope. */
export function createPlatformFeaturesResource(runtime: PlatformRuntime) {
  return {
    /** Evaluates the enabled feature flags for a user/org/app scope. */
    evaluate(params: {
      userId?: string
      visitorId?: string
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
          visitorId: params.visitorId,
          organizationId: params.organizationId,
          appId: params.appId,
          appSlug: params.appSlug,
          includeGlobal: params.includeGlobal,
        },
      })
    },

    /** Explains every input contributing to feature evaluation, including experiment variants and payloads. */
    evaluateDetails(params: {
      userId?: string
      visitorId?: string
      organizationId?: string
      appId?: string
      appSlug?: string
      includeGlobal?: boolean
    }) {
      return platformRequest<PlatformList<PlatformFeatureEvaluationDecision>>(
        runtime,
        {
          method: 'GET',
          path: '/features/evaluate/details',
          query: {
            userId: params.userId,
            visitorId: params.visitorId,
            organizationId: params.organizationId,
            appId: params.appId,
            appSlug: params.appSlug,
            includeGlobal: params.includeGlobal,
          },
        }
      )
    },

    /**
     * Resolves a single experiment decision with variant and typed payload.
     */
    async getExperiment<T = unknown>(
      featureSlug: string,
      params: {
        userId?: string
        visitorId?: string
        organizationId?: string
        appId?: string
        appSlug?: string
      } = {}
    ): Promise<PlatformExperimentDecision<T>> {
      const { data, error } = await platformRequest<
        PlatformList<PlatformFeatureEvaluationDecision>
      >(runtime, {
        method: 'GET',
        path: '/features/evaluate/details',
        query: {
          userId: params.userId,
          visitorId: params.visitorId,
          organizationId: params.organizationId,
          appId: params.appId,
          appSlug: params.appSlug,
        },
      })

      return resolveExperimentDecision<T>(
        featureSlug,
        error || !data ? null : data.data
      )
    },
  }
}
