import { AppHttpError } from '@/platform/errors'
import { normalizeSlug } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'

/**
 * Feature-flag service — provider sync, scoped grants, and evaluation.
 *
 * Mirrors `services/features.py`. Every function is behaviour-identical to the
 * Python original, including error codes and HTTP statuses, so the Express
 * route layer can swap without changing contracts.
 *
 * The service is injected with a narrow `FeaturesRepository` and
 * `FeatureFlagProvider` surface rather than importing adapters directly, so
 * tests drive it without a database or vendor.
 */

const log = getLogger('features')

// ---------------------------------------------------------------------------
// Provider surface
// ---------------------------------------------------------------------------

export type ProviderFeature = {
  provider: string
  providerFeatureId: string
  providerEnvironmentStateId: string | null
  slug: string
  name: string
  description: string | null
  enabled: boolean
  metadata: Record<string, unknown>
}

export type FeatureFlagProvider = {
  create(params: {
    slug: string
    description: string | null
    defaultEnabled: boolean
    serverSideOnly: boolean
  }): Promise<ProviderFeature>

  update(params: {
    providerFeatureId: string
    description?: string | null
    defaultEnabled?: boolean | null
    serverSideOnly?: boolean | null
  }): Promise<ProviderFeature>

  delete(params: { providerFeatureId: string }): Promise<void>
}

// ---------------------------------------------------------------------------
// Repository surface
// ---------------------------------------------------------------------------

import type {
  AppRow,
  FeatureRow,
  OrgFeatureRow,
  OrganizationRow,
  UserFeatureRow,
  UserRow,
} from './features.repository'

export type FeaturesRepository = {
  getFeatureById(featureId: string): Promise<FeatureRow | null>
  getFeatureBySlug(slug: string): Promise<FeatureRow | null>
  createFeature(params: {
    provider: string
    providerFeatureId: string | null
    providerEnvironmentId: string | null
    slug: string
    name: string
    description: string | null
    enabled: boolean
    scope: string
    consumerDefaultEnabled: boolean
    defaultValue: boolean
    appId: string | null
    parentFeatureId: string | null
    tags: string[]
    valueType: string | null
    value: unknown
    serverSideOnly: boolean
    providerMetadata: unknown
  }): Promise<FeatureRow>
  updateFeature(
    featureId: string,
    data: Partial<{
      description: string | null
      enabled: boolean
      consumerDefaultEnabled: boolean
      scope: string
      defaultValue: boolean
      tags: string[]
      valueType: string | null
      value: unknown
      serverSideOnly: boolean
      archivedAt: bigint | null
      parentFeatureId: string | null
      appId: string | null
      syncedAt: bigint
      providerMetadata: unknown
      updatedAt: bigint
    }>
  ): Promise<FeatureRow>
  deleteFeature(featureId: string): Promise<void>
  listFeatures(params: {
    limit: number
    startingAfter?: string | null
    endingBefore?: string | null
    appId?: string | null
    rootOnly?: boolean
    includeTag?: string | null
    excludeTag?: string | null
  }): Promise<[FeatureRow[], boolean]>
  searchFeatures(params: {
    query: string
    limit: number
    appId?: string | null
    rootOnly?: boolean
    includeTag?: string | null
    excludeTag?: string | null
  }): Promise<FeatureRow[]>
  listOrgGrantsForFeature(featureId: string): Promise<OrgFeatureRow[]>
  listUserGrantsForFeature(featureId: string): Promise<UserFeatureRow[]>
  listEvaluationFeatures(appId: string | null): Promise<FeatureRow[]>
  listPlanModuleFeatureIds(
    organizationId: string,
    appId: string
  ): Promise<Set<string>>
  listModuleFeatureIds(appId: string): Promise<Set<string>>
  listUserFeatures(userId: string): Promise<UserFeatureRow[]>
  listOrgFeatures(organizationId: string): Promise<OrgFeatureRow[]>
  getUserFeature(
    userId: string,
    featureId: string
  ): Promise<UserFeatureRow | null>
  getOrgFeature(
    organizationId: string,
    featureId: string
  ): Promise<OrgFeatureRow | null>
  grantUserFeature(params: {
    userId: string
    featureId: string
    enabled: boolean
    note: string | null
  }): Promise<UserFeatureRow>
  revokeUserFeature(userId: string, featureId: string): Promise<void>
  grantOrgFeature(params: {
    organizationId: string
    featureId: string
    enabled: boolean
    note: string | null
  }): Promise<OrgFeatureRow>
  revokeOrgFeature(organizationId: string, featureId: string): Promise<void>
  findAppById(appId: string): Promise<AppRow | null>
  findAppBySlug(slug: string): Promise<AppRow | null>
  findUserById(userId: string): Promise<UserRow | null>
  findOrganizationById(organizationId: string): Promise<OrganizationRow | null>
}

export type FeaturesDeps = {
  repository: FeaturesRepository
  provider: FeatureFlagProvider
}

// ---------------------------------------------------------------------------
// Platform app helpers — mirrors core/platform_apps.py
// ---------------------------------------------------------------------------

type PlatformApp = {
  name: string
  slug: string
  appKind: string
  featurePrefix: string
}

const PLATFORM_APPS: PlatformApp[] = [
  {
    name: '876',
    slug: '876-consumer',
    appKind: 'platform',
    featurePrefix: 'app',
  },
  {
    name: '876 Enterprise',
    slug: '876-enterprise',
    appKind: 'platform',
    featurePrefix: 'enterprise',
  },
  {
    name: 'Console',
    slug: 'console',
    appKind: 'internal',
    featurePrefix: 'console',
  },
  {
    name: '876 Couriers',
    slug: '876-couriers',
    appKind: 'product',
    featurePrefix: 'couriers',
  },
  {
    name: '876 Billing',
    slug: '876-billing',
    appKind: 'product',
    featurePrefix: 'billing',
  },
]

const PLATFORM_APP_BY_SLUG = new Map(
  PLATFORM_APPS.map((app) => [app.slug, app])
)

function getPlatformApp(appSlug: string): PlatformApp | null {
  return PLATFORM_APP_BY_SLUG.get(appSlug) ?? null
}

export function featurePrefixForAppSlug(appSlug: string): string {
  const platformApp = getPlatformApp(appSlug)
  if (platformApp) return platformApp.featurePrefix
  return normalizeSlug(appSlug.replace(/^876-/, '')).replace(/-/g, '_')
}

export function featureSlugMatchesApp(
  featureSlug: string,
  appSlug: string
): boolean {
  const prefix = featurePrefixForAppSlug(appSlug)
  return Boolean(prefix) && featureSlug.startsWith(`${prefix}_`)
}

// ---------------------------------------------------------------------------
// Evaluation context
// ---------------------------------------------------------------------------

export type FeatureEvaluationContext = {
  userId?: string | null
  organizationId?: string | null
  appId?: string | null
  appSlug?: string | null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requirePosthogMapping(feature: FeatureRow): string {
  if (feature.provider === 'posthog' && feature.providerFeatureId) {
    return feature.providerFeatureId
  }
  throw new AppHttpError({
    code: 'feature/provider-not-configured',
    message: 'This feature is not mapped to PostHog.',
    httpStatus: 409,
  })
}

function enforceUserFeatureScope(feature: FeatureRow): void {
  if (feature.scope === 'enterprise') {
    throw new AppHttpError({
      code: 'feature/scope-mismatch',
      message: 'This feature cannot be granted to the specified target type.',
      httpStatus: 400,
    })
  }
}

function enforceOrgFeatureScope(feature: FeatureRow): void {
  if (feature.scope === 'consumer') {
    throw new AppHttpError({
      code: 'feature/scope-mismatch',
      message: 'This feature cannot be granted to the specified target type.',
      httpStatus: 400,
    })
  }
}

function validateFeatureApp(featureSlug: string, app: AppRow | null): void {
  if (app === null) {
    if (featureSlug.startsWith('platform_')) return
    throw new AppHttpError({
      code: 'feature/platform-prefix-mismatch',
      message: "Platform-wide feature keys must start with 'platform_'.",
      httpStatus: 422,
    })
  }

  if (featureSlugMatchesApp(featureSlug, app.slug)) return
  const prefix = featurePrefixForAppSlug(app.slug)
  throw new AppHttpError({
    code: 'feature/app-prefix-mismatch',
    message: `Feature keys for ${app.name} must start with '${prefix}_'.`,
    httpStatus: 422,
  })
}

function validateFeatureParent(
  featureSlug: string,
  appId: string | null,
  parent: FeatureRow | null
): void {
  if (parent === null) return
  if (parent.appId !== appId) {
    throw new AppHttpError({
      code: 'feature/parent-app-mismatch',
      message: 'A parent feature must belong to the same application.',
      httpStatus: 422,
    })
  }
  if (featureSlug.startsWith(`${parent.slug}_`)) return
  throw new AppHttpError({
    code: 'feature/parent-prefix-mismatch',
    message: `Child feature keys must start with '${parent.slug}_'.`,
    httpStatus: 422,
  })
}

function mergeGrants(
  decisions: Map<string, boolean>,
  grants: Array<{ featureId: string; status: string }>
): void {
  for (const grant of grants) {
    if (!decisions.has(grant.featureId)) continue
    decisions.set(grant.featureId, grant.status === 'enabled')
  }
}

// ---------------------------------------------------------------------------
// Exported operations
// ---------------------------------------------------------------------------

export async function requireFeature(
  deps: FeaturesDeps,
  featureId: string
): Promise<FeatureRow> {
  const feature = await deps.repository.getFeatureById(featureId)
  if (!feature) {
    throw new AppHttpError({
      code: 'feature/not-found',
      message: 'No feature exists with the provided identifier.',
      httpStatus: 404,
    })
  }
  return feature
}

export async function requireApp(
  deps: FeaturesDeps,
  appId: string
): Promise<AppRow> {
  const app = await deps.repository.findAppById(appId)
  if (app) return app
  throw new AppHttpError({
    code: 'app/not-found',
    message: 'App not found.',
    httpStatus: 404,
  })
}

export async function requireUser(
  deps: FeaturesDeps,
  userId: string
): Promise<UserRow> {
  const user = await deps.repository.findUserById(userId)
  if (!user) {
    throw new AppHttpError({
      code: 'feature/user-not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  }
  return user
}

export async function requireOrganization(
  deps: FeaturesDeps,
  organizationId: string
): Promise<OrganizationRow> {
  const org = await deps.repository.findOrganizationById(organizationId)
  if (!org) {
    throw new AppHttpError({
      code: 'feature/organization-not-found',
      message: 'No organization exists with the provided identifier.',
      httpStatus: 404,
    })
  }
  return org
}

export async function createFeature(
  deps: FeaturesDeps,
  params: {
    name: string
    slug?: string | null
    description?: string | null
    defaultEnabled: boolean
    scope?: string | null
    consumerDefaultEnabled: boolean
    defaultValue?: boolean | null
    appId?: string | null
    tags: string[]
    valueType?: string | null
    value?: unknown
    serverSideOnly: boolean
    parentFeatureId?: string | null
  }
): Promise<FeatureRow> {
  let resolvedSlug = normalizeSlug(params.slug ?? params.name).replace(
    /-/g,
    '_'
  )
  if (!resolvedSlug) resolvedSlug = 'unnamed_feature'

  const app = params.appId ? await requireApp(deps, params.appId) : null
  validateFeatureApp(resolvedSlug, app)

  const parent = params.parentFeatureId
    ? await requireFeature(deps, params.parentFeatureId)
    : null
  validateFeatureParent(resolvedSlug, params.appId ?? null, parent)

  const providerFeature = await deps.provider.create({
    slug: resolvedSlug,
    description: params.description ?? null,
    defaultEnabled: params.defaultEnabled,
    serverSideOnly: params.serverSideOnly,
  })

  const feature = await deps.repository.createFeature({
    provider: providerFeature.provider,
    providerFeatureId: providerFeature.providerFeatureId,
    providerEnvironmentId: providerFeature.providerEnvironmentStateId,
    slug: providerFeature.slug,
    name: params.name || providerFeature.name,
    description: params.description ?? null,
    enabled: params.defaultEnabled,
    scope: params.scope ?? 'global',
    consumerDefaultEnabled: params.consumerDefaultEnabled,
    defaultValue: params.defaultValue ?? false,
    appId: params.appId ?? null,
    parentFeatureId: params.parentFeatureId ?? null,
    tags: params.tags,
    valueType: params.valueType ?? null,
    value: params.value ?? null,
    serverSideOnly: params.serverSideOnly,
    providerMetadata: providerFeature.metadata,
  })

  log.info(
    {
      feature_id: feature.id,
      slug: feature.slug,
      scope: feature.scope,
      app_id: feature.appId,
      provider: feature.provider,
      provider_feature_id: feature.providerFeatureId,
    },
    'features.create'
  )

  return feature
}

export async function retrieveFeature(
  deps: FeaturesDeps,
  featureId: string
): Promise<FeatureRow> {
  return requireFeature(deps, featureId)
}

export async function listFeatureGrants(
  deps: FeaturesDeps,
  featureId: string
): Promise<[FeatureRow, OrgFeatureRow[], UserFeatureRow[]]> {
  const feature = await requireFeature(deps, featureId)
  const orgGrants = await deps.repository.listOrgGrantsForFeature(featureId)
  const userGrants = await deps.repository.listUserGrantsForFeature(featureId)
  return [feature, orgGrants, userGrants]
}

export async function listFeatures(
  deps: FeaturesDeps,
  params: {
    limit?: number
    startingAfter?: string | null
    endingBefore?: string | null
    appId?: string | null
    rootOnly?: boolean
    includeTag?: string | null
    excludeTag?: string | null
  } = {}
): Promise<[FeatureRow[], boolean]> {
  return deps.repository.listFeatures({
    limit: params.limit ?? 20,
    startingAfter: params.startingAfter ?? null,
    endingBefore: params.endingBefore ?? null,
    appId: params.appId ?? null,
    rootOnly: params.rootOnly ?? false,
    includeTag: params.includeTag ?? null,
    excludeTag: params.excludeTag ?? null,
  })
}

export async function searchFeatures(
  deps: FeaturesDeps,
  params: {
    query: string
    limit?: number
    appId?: string | null
    rootOnly?: boolean
    includeTag?: string | null
    excludeTag?: string | null
  }
): Promise<FeatureRow[]> {
  return deps.repository.searchFeatures({
    query: params.query,
    limit: params.limit ?? 20,
    appId: params.appId ?? null,
    rootOnly: params.rootOnly ?? false,
    includeTag: params.includeTag ?? null,
    excludeTag: params.excludeTag ?? null,
  })
}

export async function updateFeature(
  deps: FeaturesDeps,
  featureId: string,
  params: {
    description?: string | null
    descriptionSet?: boolean
    enabled?: boolean | null
    appId?: string | null
    appIdSet?: boolean
    consumerDefaultEnabled?: boolean | null
    scope?: string | null
    defaultValue?: boolean | null
    tags?: string[] | null
    valueType?: string | null
    value?: unknown
    valueSet?: boolean
    serverSideOnly?: boolean | null
    archived?: boolean | null
    parentFeatureId?: string | null
    parentFeatureIdSet?: boolean
  }
): Promise<FeatureRow> {
  const feature = await requireFeature(deps, featureId)

  const providerUpdate: {
    description?: string | null
    defaultEnabled?: boolean | null
    serverSideOnly?: boolean | null
  } = {}

  const hasPosthogMapping = (): boolean =>
    feature.provider === 'posthog' && Boolean(feature.providerFeatureId)

  // Build update payload mirroring Python's mutation-then-flush pattern.
  const updates: Parameters<FeaturesRepository['updateFeature']>[1] = {}

  if (params.descriptionSet) {
    updates.description = params.description ?? null
    providerUpdate.description = params.description ?? ''
  }

  if (params.enabled !== undefined && params.enabled !== null) {
    updates.enabled = params.enabled
    providerUpdate.defaultEnabled = params.enabled
    // Python checks widget tag on the pre-update feature and mirrors enabled into
    // defaultValue when default_value param was not supplied.
    const currentTags: string[] = (feature.tags as string[] | null) ?? []
    if (currentTags.includes('widget') && params.defaultValue === undefined) {
      updates.defaultValue = params.enabled
    }
  }

  if (params.appIdSet) {
    const app = params.appId ? await requireApp(deps, params.appId) : null
    validateFeatureApp(feature.slug, app)
    updates.appId = params.appId ?? null

    // Re-validate parent against new appId
    const parentForAppCheck = feature.parentFeatureId
      ? await requireFeature(deps, feature.parentFeatureId)
      : null
    validateFeatureParent(
      feature.slug,
      updates.appId ?? null,
      parentForAppCheck
    )
  }

  if (
    params.consumerDefaultEnabled !== undefined &&
    params.consumerDefaultEnabled !== null
  ) {
    updates.consumerDefaultEnabled = params.consumerDefaultEnabled
  }

  if (params.scope !== undefined && params.scope !== null) {
    updates.scope = params.scope
  }

  if (params.defaultValue !== undefined && params.defaultValue !== null) {
    updates.defaultValue = params.defaultValue
  }

  if (params.tags !== undefined && params.tags !== null) {
    updates.tags = params.tags
  }

  if (params.valueType !== undefined && params.valueType !== null) {
    updates.valueType = params.valueType
  }

  if (params.valueSet) {
    updates.value = params.value ?? null
  }

  if (params.serverSideOnly !== undefined && params.serverSideOnly !== null) {
    updates.serverSideOnly = params.serverSideOnly
    providerUpdate.serverSideOnly = params.serverSideOnly
  }

  if (params.archived !== undefined && params.archived !== null) {
    updates.archivedAt = params.archived ? BigInt(nowUnixSeconds()) : null
  }

  if (params.parentFeatureIdSet) {
    if (params.parentFeatureId === feature.id) {
      throw new AppHttpError({
        code: 'feature/invalid-parent',
        message: 'A feature cannot be its own parent.',
        httpStatus: 400,
      })
    }
    if (params.parentFeatureId) {
      const parent = await requireFeature(deps, params.parentFeatureId)
      // Use effective appId after potential app change, else feature's current.
      const effectiveAppId =
        params.appIdSet && params.appId !== undefined
          ? (params.appId ?? null)
          : feature.appId
      validateFeatureParent(feature.slug, effectiveAppId, parent)
    }
    updates.parentFeatureId = params.parentFeatureId ?? null
  }

  // Sync to provider when any provider-relevant field changed.
  if (Object.keys(providerUpdate).length > 0) {
    if (!hasPosthogMapping()) {
      // Match Python: _require_posthog_mapping raises even when provider has no mapping.
      requirePosthogMapping(feature)
    }
    const providerFeatureId = feature.providerFeatureId as string
    const providerFeature = await deps.provider.update({
      providerFeatureId,
      description: providerUpdate.description,
      defaultEnabled: providerUpdate.defaultEnabled ?? undefined,
      serverSideOnly: providerUpdate.serverSideOnly ?? undefined,
    })

    const existingMetadata =
      (feature.providerMetadata as Record<string, unknown> | null) ?? {}
    updates.providerMetadata = {
      ...existingMetadata,
      ...providerFeature.metadata,
    }
    updates.syncedAt = BigInt(nowUnixSeconds())
  }

  updates.updatedAt = BigInt(nowUnixSeconds())

  // If nothing to persist beyond timestamps, still update timestamps.
  const updated = await deps.repository.updateFeature(featureId, updates)
  return updated
}

export async function deleteFeature(
  deps: FeaturesDeps,
  featureId: string
): Promise<string> {
  const feature = await requireFeature(deps, featureId)
  const providerFeatureId = requirePosthogMapping(feature)
  await deps.provider.delete({ providerFeatureId })
  await deps.repository.deleteFeature(featureId)
  log.info({ feature_id: featureId, slug: feature.slug }, 'features.delete')
  return featureId
}

// ---------------------------------------------------------------------------
// Grants — user
// ---------------------------------------------------------------------------

export async function listUserFeatures(
  deps: FeaturesDeps,
  userId: string
): Promise<UserFeatureRow[]> {
  await requireUser(deps, userId)
  return deps.repository.listUserFeatures(userId)
}

export async function grantUserFeature(
  deps: FeaturesDeps,
  userId: string,
  featureId: string,
  params: { enabled?: boolean; note?: string | null } = {}
): Promise<UserFeatureRow & { feature?: FeatureRow }> {
  await requireUser(deps, userId)
  const feature = await requireFeature(deps, featureId)
  enforceUserFeatureScope(feature)
  const grant = await deps.repository.grantUserFeature({
    userId,
    featureId,
    enabled: params.enabled ?? true,
    note: params.note ?? null,
  })
  return { ...grant, feature }
}

export async function updateUserFeature(
  deps: FeaturesDeps,
  userId: string,
  featureId: string,
  params: { enabled?: boolean | null; note?: string | null } = {}
): Promise<UserFeatureRow & { feature?: FeatureRow }> {
  const grant = await deps.repository.getUserFeature(userId, featureId)
  if (!grant) {
    throw new AppHttpError({
      code: 'user-feature/not-found',
      message: 'No feature grant exists for this user and feature.',
      httpStatus: 404,
    })
  }
  const feature = await requireFeature(deps, featureId)
  const now = BigInt(nowUnixSeconds())

  const updates: Partial<UserFeatureRow> = {}
  // The repository upsert would handle this, but we need to mutate the grant
  // to mirror Python's flush behaviour. Delegate to repository via grant update
  // by re-using grantUserFeature semantics? Instead, do direct update via
  // repository's grant and then apply in-memory mutations.

  // For parity with Python: Python mutates grant.status/synced_at/note/updated_at
  // and flushes. We replicate by calling grantUserFeature if enabled changes,
  // but to keep repository surface minimal we implement mutation here and
  // persist via a dedicated update path. Since no dedicated update exists,
  // re-grant with new enabled value.

  let updatedGrant: UserFeatureRow = grant

  if (params.enabled !== undefined && params.enabled !== null) {
    const enabled = params.enabled
    updatedGrant = await deps.repository.grantUserFeature({
      userId,
      featureId,
      enabled,
      note:
        params.note !== undefined
          ? (params.note ?? null)
          : (grant.note ?? null),
    })
    // grantUserFeature already set note; if only enabled changed but note not,
    // it preserves grant note via fallback above.
    // For pure note-only update, handle below.
    if (params.note === undefined) {
      // already correct
    }
  } else if (params.note !== undefined) {
    // Note-only update — need to persist note with current enabled state.
    const enabled = grant.status === 'enabled'
    updatedGrant = await deps.repository.grantUserFeature({
      userId,
      featureId,
      enabled,
      note: params.note ?? null,
    })
  }

  // Mimic Python's synced_at/updated_at handling for enabled toggle.
  // grantUserFeature already sets syncedAt/updatedAt via now; the above covers it.

  // When neither param changed, return as-is but update updatedAt via re-grant
  // to keep timestamp semantics. Python always sets updatedAt even when no enabled
  // change but note change. Our path already does.

  void now // keep for clarity — timestamps handled in repository

  return { ...updatedGrant, feature }
}

export async function revokeUserFeature(
  deps: FeaturesDeps,
  userId: string,
  featureId: string
): Promise<string> {
  const grant = await deps.repository.getUserFeature(userId, featureId)
  if (!grant) {
    throw new AppHttpError({
      code: 'user-feature/not-found',
      message: 'No feature grant exists for this user and feature.',
      httpStatus: 404,
    })
  }
  const grantId = grant.id
  await deps.repository.revokeUserFeature(userId, featureId)
  return grantId
}

// ---------------------------------------------------------------------------
// Grants — org
// ---------------------------------------------------------------------------

export async function listOrgFeatures(
  deps: FeaturesDeps,
  organizationId: string
): Promise<OrgFeatureRow[]> {
  await requireOrganization(deps, organizationId)
  return deps.repository.listOrgFeatures(organizationId)
}

export async function grantOrgFeature(
  deps: FeaturesDeps,
  organizationId: string,
  featureId: string,
  params: { enabled?: boolean; note?: string | null } = {}
): Promise<OrgFeatureRow & { feature?: FeatureRow }> {
  await requireOrganization(deps, organizationId)
  const feature = await requireFeature(deps, featureId)
  enforceOrgFeatureScope(feature)
  const grant = await deps.repository.grantOrgFeature({
    organizationId,
    featureId,
    enabled: params.enabled ?? true,
    note: params.note ?? null,
  })
  return { ...grant, feature }
}

export async function updateOrgFeature(
  deps: FeaturesDeps,
  organizationId: string,
  featureId: string,
  params: { enabled?: boolean | null; note?: string | null } = {}
): Promise<OrgFeatureRow & { feature?: FeatureRow }> {
  const grant = await deps.repository.getOrgFeature(organizationId, featureId)
  if (!grant) {
    throw new AppHttpError({
      code: 'org-feature/not-found',
      message: 'No feature grant exists for this organization and feature.',
      httpStatus: 404,
    })
  }
  const feature = await requireFeature(deps, featureId)

  let updatedGrant: OrgFeatureRow = grant

  if (params.enabled !== undefined && params.enabled !== null) {
    updatedGrant = await deps.repository.grantOrgFeature({
      organizationId,
      featureId,
      enabled: params.enabled,
      note:
        params.note !== undefined
          ? (params.note ?? null)
          : (grant.note ?? null),
    })
  } else if (params.note !== undefined) {
    const enabled = grant.status === 'enabled'
    updatedGrant = await deps.repository.grantOrgFeature({
      organizationId,
      featureId,
      enabled,
      note: params.note ?? null,
    })
  }

  return { ...updatedGrant, feature }
}

export async function revokeOrgFeature(
  deps: FeaturesDeps,
  organizationId: string,
  featureId: string
): Promise<string> {
  const grant = await deps.repository.getOrgFeature(organizationId, featureId)
  if (!grant) {
    throw new AppHttpError({
      code: 'org-feature/not-found',
      message: 'No feature grant exists for this organization and feature.',
      httpStatus: 404,
    })
  }
  const grantId = grant.id
  await deps.repository.revokeOrgFeature(organizationId, featureId)
  return grantId
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

async function resolveApp(
  deps: FeaturesDeps,
  context: FeatureEvaluationContext
): Promise<AppRow | null> {
  if (context.appId) {
    const app = await deps.repository.findAppById(context.appId)
    if (!app) {
      throw new AppHttpError({
        code: 'app/not-found',
        message: 'App not found.',
        httpStatus: 404,
      })
    }
    if (context.appSlug && app.slug !== context.appSlug) {
      throw new AppHttpError({
        code: 'feature/app-mismatch',
        message:
          'The provided app ID and app slug identify different applications.',
        httpStatus: 409,
      })
    }
    return app
  }

  if (!context.appSlug) return null

  const app = await deps.repository.findAppBySlug(context.appSlug)
  if (!app) {
    throw new AppHttpError({
      code: 'app/not-found',
      message: 'App not found.',
      httpStatus: 404,
    })
  }
  return app
}

export async function evaluate(
  deps: FeaturesDeps,
  context: FeatureEvaluationContext
): Promise<FeatureRow[]> {
  const app = await resolveApp(deps, context)
  const features = await deps.repository.listEvaluationFeatures(app?.id ?? null)

  const usesPlan = Boolean(
    app && app.appKind === 'product' && context.organizationId
  )

  let moduleFeatureIds = new Set<string>()
  let gatedFeatureIds = new Set<string>()

  if (usesPlan && app && context.organizationId) {
    moduleFeatureIds = await deps.repository.listPlanModuleFeatureIds(
      context.organizationId,
      app.id
    )
    gatedFeatureIds = await deps.repository.listModuleFeatureIds(app.id)
  }

  const featuresById = new Map(features.map((f) => [f.id, f]))

  function rootFeatureId(feature: FeatureRow): string {
    let current = feature
    const seen = new Set<string>()
    while (current.parentFeatureId && !seen.has(current.id)) {
      seen.add(current.id)
      const parent = featuresById.get(current.parentFeatureId)
      if (!parent) break
      current = parent
    }
    return current.id
  }

  const decisions = new Map<string, boolean>()
  for (const feature of features) {
    const tags: string[] = (feature.tags as string[] | null) ?? []
    if (tags.includes('widget')) {
      decisions.set(
        feature.id,
        Boolean(feature.enabled && feature.defaultValue)
      )
    } else if (usesPlan && feature.appId !== null) {
      const rootId = rootFeatureId(feature)
      if (gatedFeatureIds.has(rootId)) {
        decisions.set(feature.id, moduleFeatureIds.has(rootId))
      } else {
        decisions.set(feature.id, feature.enabled)
      }
    } else {
      decisions.set(feature.id, feature.enabled)
    }
  }

  if (context.organizationId) {
    const orgGrants = await deps.repository.listOrgFeatures(
      context.organizationId
    )
    mergeGrants(
      decisions,
      orgGrants.map((g) => ({ featureId: g.featureId, status: g.status }))
    )
  }

  if (context.userId) {
    const userGrants = await deps.repository.listUserFeatures(context.userId)
    mergeGrants(
      decisions,
      userGrants.map((g) => ({ featureId: g.featureId, status: g.status }))
    )
  }

  const effective = new Map<string, boolean>()
  const resolving = new Set<string>()

  function resolve(feature: FeatureRow): boolean {
    if (effective.has(feature.id)) return effective.get(feature.id) as boolean
    if (resolving.has(feature.id)) return false
    resolving.add(feature.id)
    let allowed = Boolean(
      feature.enabled && (decisions.get(feature.id) ?? false)
    )
    if (feature.parentFeatureId) {
      const parent = featuresById.get(feature.parentFeatureId)
      allowed = Boolean(parent && allowed && resolve(parent))
    }
    resolving.delete(feature.id)
    effective.set(feature.id, allowed)
    return allowed
  }

  return features.filter((feature) => resolve(feature))
}
