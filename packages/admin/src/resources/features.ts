import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminDeletedFeature,
  AdminDeletedOrgFeature,
  AdminFeature,
  AdminFeatureCreateParams,
  AdminFeatureEvaluateParams,
  AdminFeatureSearchParams,
  AdminFeatureUpdateParams,
  AdminListResponse,
  AdminOrgFeature,
  AdminOrgFeatureGrantParams,
  AdminOrgFeatureUpdateParams,
} from '../types'

/** `$876.features.*` — platform feature-flag administration. */
export function createAdminFeaturesResource(runtime: AdminRuntime) {
  return {
    /** Returns a paginated list of all synced feature flags. Optionally filtered by appId. */
    list(params?: {
      limit?: number
      starting_after?: string
      ending_before?: string
      appId?: string
      search?: string
      rootOnly?: boolean
      includeTag?: string
      excludeTag?: string
    }) {
      return adminRequest<AdminListResponse<AdminFeature>>(runtime, {
        method: 'GET',
        path: '/features',
        query: params as Record<string, string | number | undefined>,
      })
    },

    /** Searches feature flags by name, slug, or description. */
    search(params: AdminFeatureSearchParams) {
      return adminRequest<AdminListResponse<AdminFeature>>(runtime, {
        method: 'GET',
        path: '/features',
        query: {
          search: params.query,
          limit: params.limit,
          appId: params.appId,
        },
      })
    },

    /** Evaluates enabled feature flags for a user, organization, app, or combined context. */
    evaluate(params: AdminFeatureEvaluateParams) {
      return adminRequest<AdminListResponse<AdminFeature>>(runtime, {
        method: 'GET',
        path: '/features/evaluate',
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /** Retrieves a single feature flag by ID. */
    retrieve(featureId: string) {
      return adminRequest<AdminFeature>(runtime, {
        method: 'GET',
        path: `/features/${featureId}`,
      })
    },

    /** Updates local metadata for a feature flag (scope, consumer_default_enabled, default_value). */
    update(featureId: string, body: AdminFeatureUpdateParams) {
      return adminRequest<AdminFeature>(runtime, {
        method: 'PATCH',
        path: `/features/${featureId}`,
        body,
      })
    },

    /** Creates a new feature flag. */
    create(params: AdminFeatureCreateParams) {
      return adminRequest<AdminFeature>(runtime, {
        method: 'POST',
        path: '/features',
        body: params,
      })
    },

    /** Deletes a feature flag by ID. */
    delete(featureId: string) {
      return adminRequest<AdminDeletedFeature>(runtime, {
        method: 'DELETE',
        path: `/features/${featureId}`,
      })
    },

    orgs: {
      /** Returns feature flag grants for an organization. */
      list(organizationId: string) {
        return adminRequest<AdminListResponse<AdminOrgFeature>>(runtime, {
          method: 'GET',
          path: `/features/organizations/${organizationId}/features`,
        })
      },

      /** Grants or disables a feature flag override for an organization. */
      grant(organizationId: string, params: AdminOrgFeatureGrantParams) {
        return adminRequest<AdminOrgFeature>(runtime, {
          method: 'POST',
          path: `/features/organizations/${organizationId}/features`,
          body: params,
        })
      },

      /** Updates an organization feature flag override. */
      update(
        organizationId: string,
        featureId: string,
        params: AdminOrgFeatureUpdateParams
      ) {
        return adminRequest<AdminOrgFeature>(runtime, {
          method: 'PATCH',
          path: `/features/organizations/${organizationId}/features/${featureId}`,
          body: params,
        })
      },

      /** Revokes an organization feature flag override. */
      revoke(organizationId: string, featureId: string) {
        return adminRequest<AdminDeletedOrgFeature>(runtime, {
          method: 'DELETE',
          path: `/features/organizations/${organizationId}/features/${featureId}`,
        })
      },
    },
  }
}
