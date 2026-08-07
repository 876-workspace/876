import { getSettings } from '@/config'
import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'
import { getPostHogClient } from '@/providers/posthog/client'
import * as svc from '@/services/features'
import * as svcRepo from '@/services/features.repository'

import * as localRepo from './features.repository'
import type {
  CreateFeatureBody,
  EvaluateFeaturesQuery,
  GrantOrgFeatureBody,
  GrantUserFeatureBody,
  ListFeaturesQuery,
  UpdateFeatureBody,
  UpdateOrgFeatureBody,
  UpdateUserFeatureBody,
} from './features.schemas'
import {
  serializeFeature,
  serializeOrgFeature,
  serializeOrgFeatureGrantItem,
  serializeUserFeature,
  serializeUserFeatureGrantItem,
} from './features.serializers'
import type { Feature, OrgFeature, UserFeature } from './features.schemas'

const log = getLogger('features')

function getDeps(): svc.FeaturesDeps {
  const settings = getSettings()

  const repository: svc.FeaturesRepository = {
    getFeatureById: svcRepo.getFeatureById,
    getFeatureBySlug: svcRepo.getFeatureBySlug,
    createFeature: svcRepo.createFeature,
    updateFeature: svcRepo.updateFeature,
    deleteFeature: svcRepo.deleteFeature,
    listFeatures: svcRepo.listFeatures,
    searchFeatures: svcRepo.searchFeatures,
    listOrgGrantsForFeature: svcRepo.listOrgGrantsForFeature,
    listUserGrantsForFeature: svcRepo.listUserGrantsForFeature,
    listEvaluationFeatures: svcRepo.listEvaluationFeatures,
    listPlanModuleFeatureIds: svcRepo.listPlanModuleFeatureIds,
    listModuleFeatureIds: svcRepo.listModuleFeatureIds,
    listUserFeatures: svcRepo.listUserFeatures,
    listOrgFeatures: svcRepo.listOrgFeatures,
    getUserFeature: svcRepo.getUserFeature,
    getOrgFeature: svcRepo.getOrgFeature,
    grantUserFeature: svcRepo.grantUserFeature,
    revokeUserFeature: svcRepo.revokeUserFeature,
    grantOrgFeature: svcRepo.grantOrgFeature,
    revokeOrgFeature: svcRepo.revokeOrgFeature,
    findAppById: svcRepo.findAppById,
    findAppBySlug: svcRepo.findAppBySlug,
    findUserById: svcRepo.findUserById,
    findOrganizationById: svcRepo.findOrganizationById,
  }

  const client = (() => {
    try {
      return getPostHogClient(settings)
    } catch {
      // In tests the provider is mocked; when unconfigured, return a stub that
      // throws the same 503 the real factory would, so create/update/delete
      // surface the correct error.
      return null as unknown as ReturnType<typeof getPostHogClient>
    }
  })()

  const provider: svc.FeatureFlagProvider = {
    create: async (params) => {
      if (!client) {
        throw new AppHttpError({
          code: 'provider/misconfigured',
          message:
            'PostHog feature management is not configured. Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST.',
          httpStatus: 503,
        })
      }
      const flag = await client.createFeature({
        key: params.slug,
        name: params.slug,
        description: params.description,
        enabled: params.defaultEnabled,
      })
      const key = String(
        (flag as Record<string, unknown>).key ??
          (flag as Record<string, unknown>).id ??
          params.slug
      )
      return {
        provider: 'posthog',
        providerFeatureId: String((flag as Record<string, unknown>).id),
        providerEnvironmentStateId: String(settings.posthog.projectId),
        slug: key,
        name: String((flag as Record<string, unknown>).name ?? key),
        description:
          ((flag as Record<string, unknown>).name as string | null) ??
          params.description,
        enabled: Boolean(
          (flag as Record<string, unknown>).active ?? params.defaultEnabled
        ),
        metadata: flag as Record<string, unknown>,
      }
    },
    update: async (params) => {
      if (!client) {
        throw new AppHttpError({
          code: 'provider/misconfigured',
          message:
            'PostHog feature management is not configured. Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST.',
          httpStatus: 503,
        })
      }
      const flag = await client.updateFeature(params.providerFeatureId, {
        description: params.description ?? undefined,
        enabled: params.defaultEnabled ?? undefined,
      })
      const key = String(
        (flag as Record<string, unknown>).key ?? params.providerFeatureId
      )
      return {
        provider: 'posthog',
        providerFeatureId: String(
          (flag as Record<string, unknown>).id ?? params.providerFeatureId
        ),
        providerEnvironmentStateId: String(settings.posthog.projectId),
        slug: key,
        name: String((flag as Record<string, unknown>).name ?? key),
        description:
          ((flag as Record<string, unknown>).name as string | null) ?? null,
        enabled: Boolean((flag as Record<string, unknown>).active ?? false),
        metadata: flag as Record<string, unknown>,
      }
    },
    delete: async (params) => {
      if (!client) {
        throw new AppHttpError({
          code: 'provider/misconfigured',
          message:
            'PostHog feature management is not configured. Set POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID, and POSTHOG_HOST.',
          httpStatus: 503,
        })
      }
      await client.deleteFeature(params.providerFeatureId)
    },
  }

  return { repository, provider }
}

export async function listFeatures(
  query: ListFeaturesQuery
): Promise<ListObject<Feature>> {
  const deps = getDeps()

  if (query.search) {
    const rows = await svc.searchFeatures(deps, {
      query: query.search,
      limit: query.limit,
      appId: query.appId ?? null,
      rootOnly: query.rootOnly ?? false,
      includeTag: query.includeTag ?? null,
      excludeTag: query.excludeTag ?? null,
    })
    return listObject({
      data: rows.map(serializeFeature),
      hasMore: false,
      url: '/features',
    })
  }

  const [rows, hasMore] = await svc.listFeatures(deps, {
    limit: query.limit,
    startingAfter: query.starting_after ?? null,
    endingBefore: query.ending_before ?? null,
    appId: query.appId ?? null,
    rootOnly: query.rootOnly ?? false,
    includeTag: query.includeTag ?? null,
    excludeTag: query.excludeTag ?? null,
  })

  return listObject({
    data: rows.map(serializeFeature),
    hasMore,
    url: '/features',
  })
}

export async function createFeature(body: CreateFeatureBody): Promise<Feature> {
  const deps = getDeps()
  const row = await svc.createFeature(deps, {
    name: body.name,
    slug: body.slug ?? null,
    description: body.description ?? null,
    defaultEnabled: body.default_enabled ?? false,
    scope: body.scope ?? null,
    consumerDefaultEnabled: body.consumer_default_enabled ?? false,
    defaultValue: body.default_value ?? null,
    appId: body.app_id ?? null,
    tags: body.tags ?? [],
    valueType: body.value_type ?? null,
    value: body.value ?? null,
    serverSideOnly: body.server_side_only ?? true,
    parentFeatureId: body.parent_feature_id ?? null,
  })
  return serializeFeature(row)
}

export async function retrieveFeature(featureId: string): Promise<Feature> {
  const deps = getDeps()
  const row = await svc.retrieveFeature(deps, featureId)
  return serializeFeature(row)
}

export async function listFeatureGrants(featureId: string) {
  const deps = getDeps()
  // The grants are read with their organization/user joined so the response can
  // name the principal without a second round trip per row.
  await svc.requireFeature(deps, featureId)
  const [orgRows, userRows] = await Promise.all([
    localRepo.listOrgGrantsWithOrg(featureId),
    localRepo.listUserGrantsWithUser(featureId),
  ])

  return {
    object: 'feature_grants' as const,
    feature_id: featureId,
    organizations: listObject({
      data: orgRows.map(serializeOrgFeatureGrantItem),
      hasMore: false,
      url: `/features/${featureId}/grants`,
    }),
    users: listObject({
      data: userRows.map(serializeUserFeatureGrantItem),
      hasMore: false,
      url: `/features/${featureId}/grants`,
    }),
  }
}

export async function updateFeature(
  featureId: string,
  body: UpdateFeatureBody,
  provided: Set<string>
): Promise<Feature> {
  const deps = getDeps()

  const params: Parameters<typeof svc.updateFeature>[2] = {}

  if (provided.has('description')) {
    ;(params as Record<string, unknown>).description = body.description ?? null
    ;(params as Record<string, unknown>).descriptionSet = true
  }
  if (provided.has('enabled')) {
    ;(params as Record<string, unknown>).enabled = body.enabled ?? null
  }
  if (provided.has('app_id')) {
    ;(params as Record<string, unknown>).appId = body.app_id ?? null
    ;(params as Record<string, unknown>).appIdSet = true
  }
  if (provided.has('tags')) {
    ;(params as Record<string, unknown>).tags = body.tags ?? null
  }
  if (provided.has('consumer_default_enabled')) {
    ;(params as Record<string, unknown>).consumerDefaultEnabled =
      body.consumer_default_enabled ?? null
  }
  if (provided.has('scope')) {
    ;(params as Record<string, unknown>).scope = body.scope ?? null
  }
  if (provided.has('default_value')) {
    ;(params as Record<string, unknown>).defaultValue =
      body.default_value ?? null
  }
  if (provided.has('value_type')) {
    ;(params as Record<string, unknown>).valueType = body.value_type ?? null
  }
  if (provided.has('value')) {
    ;(params as Record<string, unknown>).value = body.value ?? null
    ;(params as Record<string, unknown>).valueSet = true
  }
  if (provided.has('server_side_only')) {
    ;(params as Record<string, unknown>).serverSideOnly =
      body.server_side_only ?? null
  }
  if (provided.has('archived')) {
    ;(params as Record<string, unknown>).archived = body.archived ?? null
  }
  if (provided.has('parent_feature_id')) {
    ;(params as Record<string, unknown>).parentFeatureId =
      body.parent_feature_id ?? null
    ;(params as Record<string, unknown>).parentFeatureIdSet = true
  }

  const row = await svc.updateFeature(deps, featureId, params)
  return serializeFeature(row)
}

export async function deleteFeature(
  featureId: string
): Promise<{ object: string; id: string; deleted: true }> {
  const deps = getDeps()
  const deletedId = await svc.deleteFeature(deps, featureId)
  log.info({ feature_id: deletedId }, 'features.delete')
  return { object: 'feature', id: deletedId, deleted: true }
}

export async function evaluateFeatures(
  query: EvaluateFeaturesQuery
): Promise<ListObject<Feature>> {
  const deps = getDeps()
  const rows = await svc.evaluate(deps, {
    userId: query.userId ?? null,
    organizationId: query.organizationId ?? null,
    appId: query.appId ?? null,
    appSlug: query.appSlug ?? null,
  })
  return listObject({
    data: rows.map(serializeFeature),
    hasMore: false,
    url: '/features/evaluate',
  })
}

export async function evaluateMyFeatures(params: {
  userId: string
  organizationId?: string | null
  appId: string | null
  appSlug?: string | null
  internal: boolean
}): Promise<ListObject<Feature>> {
  const deps = getDeps()

  if (params.organizationId) {
    const membership = await localRepo.findMembership(
      params.organizationId,
      params.userId
    )
    if (!membership || membership.status !== 'active') {
      throw new AppHttpError({
        code: 'auth/forbidden',
        message: 'Forbidden.',
        httpStatus: 403,
      })
    }
  }

  if (!params.internal && !params.appId) {
    throw new AppHttpError({
      code: 'auth/forbidden',
      message: 'Forbidden.',
      httpStatus: 403,
    })
  }

  const rows = await svc.evaluate(deps, {
    userId: params.userId,
    organizationId: params.organizationId ?? null,
    appId: params.internal ? null : params.appId,
    appSlug: params.appSlug ?? null,
  })

  return listObject({
    data: rows.map(serializeFeature),
    hasMore: false,
    url: '/features/evaluate/me',
  })
}

export async function listUserFeatures(
  userId: string
): Promise<ListObject<UserFeature>> {
  const deps = getDeps()
  const rows = await svc.listUserFeatures(deps, userId)
  return listObject({
    data: rows.map(serializeUserFeature),
    hasMore: false,
    url: `/features/users/${userId}/features`,
  })
}

export async function grantUserFeature(
  userId: string,
  body: GrantUserFeatureBody
): Promise<UserFeature> {
  const deps = getDeps()
  const grant = await svc.grantUserFeature(deps, userId, body.feature_id, {
    enabled: body.enabled ?? true,
    note: body.note ?? null,
  })
  return serializeUserFeature(
    grant as unknown as import('./features.serializers').UserFeatureRow
  )
}

export async function updateUserFeature(
  userId: string,
  featureId: string,
  body: UpdateUserFeatureBody
): Promise<UserFeature> {
  const deps = getDeps()
  const grant = await svc.updateUserFeature(deps, userId, featureId, {
    enabled: body.enabled ?? undefined,
    note: body.note ?? undefined,
  })
  return serializeUserFeature(
    grant as unknown as import('./features.serializers').UserFeatureRow
  )
}

export async function revokeUserFeature(
  userId: string,
  featureId: string
): Promise<{ object: string; id: string; deleted: true }> {
  const deps = getDeps()
  const grantId = await svc.revokeUserFeature(deps, userId, featureId)
  return { object: 'user_feature', id: grantId, deleted: true }
}

export async function listOrgFeatures(
  organizationId: string
): Promise<ListObject<OrgFeature>> {
  const deps = getDeps()
  const rows = await svc.listOrgFeatures(deps, organizationId)
  return listObject({
    data: rows.map(serializeOrgFeature),
    hasMore: false,
    url: `/features/organizations/${organizationId}/features`,
  })
}

export async function grantOrgFeature(
  organizationId: string,
  body: GrantOrgFeatureBody
): Promise<OrgFeature> {
  const deps = getDeps()
  const grant = await svc.grantOrgFeature(
    deps,
    organizationId,
    body.feature_id,
    {
      enabled: body.enabled ?? true,
      note: body.note ?? null,
    }
  )
  return serializeOrgFeature(
    grant as unknown as import('./features.serializers').OrgFeatureRow
  )
}

export async function updateOrgFeature(
  organizationId: string,
  featureId: string,
  body: UpdateOrgFeatureBody
): Promise<OrgFeature> {
  const deps = getDeps()
  const grant = await svc.updateOrgFeature(deps, organizationId, featureId, {
    enabled: body.enabled ?? undefined,
    note: body.note ?? undefined,
  })
  return serializeOrgFeature(
    grant as unknown as import('./features.serializers').OrgFeatureRow
  )
}

export async function revokeOrgFeature(
  organizationId: string,
  featureId: string
): Promise<{ object: string; id: string; deleted: true }> {
  const deps = getDeps()
  const grantId = await svc.revokeOrgFeature(deps, organizationId, featureId)
  return { object: 'org_feature', id: grantId, deleted: true }
}
