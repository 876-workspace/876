import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/platform/errors'

import type {
  FeatureFlagProvider,
  FeaturesDeps,
  FeaturesRepository,
} from '../features'
import {
  createFeature,
  deleteFeature,
  evaluate,
  featurePrefixForAppSlug,
  featureSlugMatchesApp,
  grantOrgFeature,
  grantUserFeature,
  listFeatureGrants,
  listFeatures,
  listOrgFeatures,
  listUserFeatures,
  requireApp,
  requireFeature,
  requireOrganization,
  requireUser,
  retrieveFeature,
  revokeOrgFeature,
  revokeUserFeature,
  searchFeatures,
  updateFeature,
  updateOrgFeature,
  updateUserFeature,
} from '../features'

const NOW = 1_785_000_000

function makeFeature(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'ftr_1',
    provider: 'posthog',
    providerFeatureId: 'ph_1',
    providerEnvironmentId: 'env_1',
    slug: 'platform_test_flag',
    name: 'Test Flag',
    description: null,
    tags: [],
    enabled: true,
    defaultValue: false,
    valueType: null,
    value: null,
    serverSideOnly: true,
    archivedAt: null,
    parentFeatureId: null,
    providerMetadata: {},
    consumerDefaultEnabled: false,
    scope: 'global',
    appId: null,
    syncedAt: BigInt(NOW),
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  } as unknown as Record<string, unknown>
}

function makeApp(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id: 'app_1',
    name: 'Test App',
    slug: '876-enterprise',
    appKind: 'product',
    ...overrides,
  } as Record<string, unknown>
}

function makeRepository(
  overrides: Partial<FeaturesRepository> = {}
): FeaturesRepository {
  return {
    getFeatureById: vi.fn().mockResolvedValue(null),
    getFeatureBySlug: vi.fn().mockResolvedValue(null),
    createFeature: vi.fn().mockImplementation((params) =>
      Promise.resolve(
        makeFeature({
          id: 'ftr_new',
          slug: params.slug,
          name: params.name,
          description: params.description,
          enabled: params.enabled,
          scope: params.scope,
          consumerDefaultEnabled: params.consumerDefaultEnabled,
          defaultValue: params.defaultValue,
          appId: params.appId,
          parentFeatureId: params.parentFeatureId,
          tags: params.tags,
          valueType: params.valueType,
          value: params.value,
          serverSideOnly: params.serverSideOnly,
          provider: params.provider,
          providerFeatureId: params.providerFeatureId,
          providerEnvironmentId: params.providerEnvironmentId,
          providerMetadata: params.providerMetadata,
        })
      )
    ),
    updateFeature: vi.fn().mockImplementation((id, data) =>
      Promise.resolve(
        makeFeature({
          id,
          ...(data as Record<string, unknown>),
        })
      )
    ),
    deleteFeature: vi.fn().mockResolvedValue(undefined),
    listFeatures: vi.fn().mockResolvedValue([[], false]),
    searchFeatures: vi.fn().mockResolvedValue([]),
    listOrgGrantsForFeature: vi.fn().mockResolvedValue([]),
    listUserGrantsForFeature: vi.fn().mockResolvedValue([]),
    listEvaluationFeatures: vi.fn().mockResolvedValue([]),
    listPlanModuleFeatureIds: vi.fn().mockResolvedValue(new Set()),
    listModuleFeatureIds: vi.fn().mockResolvedValue(new Set()),
    listUserFeatures: vi.fn().mockResolvedValue([]),
    listOrgFeatures: vi.fn().mockResolvedValue([]),
    getUserFeature: vi.fn().mockResolvedValue(null),
    getOrgFeature: vi.fn().mockResolvedValue(null),
    grantUserFeature: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: 'ufe_1',
        userId: params.userId,
        featureId: params.featureId,
        status: params.enabled ? 'enabled' : 'disabled',
        note: params.note,
        syncedAt: BigInt(NOW),
        createdAt: BigInt(NOW),
        updatedAt: BigInt(NOW),
      })
    ),
    revokeUserFeature: vi.fn().mockResolvedValue(undefined),
    grantOrgFeature: vi.fn().mockImplementation((params) =>
      Promise.resolve({
        id: 'ofe_1',
        organizationId: params.organizationId,
        featureId: params.featureId,
        status: params.enabled ? 'enabled' : 'disabled',
        note: params.note,
        syncedAt: BigInt(NOW),
        createdAt: BigInt(NOW),
        updatedAt: BigInt(NOW),
      })
    ),
    revokeOrgFeature: vi.fn().mockResolvedValue(undefined),
    findAppById: vi.fn().mockResolvedValue(null),
    findAppBySlug: vi.fn().mockResolvedValue(null),
    findUserById: vi.fn().mockResolvedValue(null),
    findOrganizationById: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as FeaturesRepository
}

function makeProvider(
  overrides: Partial<FeatureFlagProvider> = {}
): FeatureFlagProvider {
  return {
    create: vi.fn().mockResolvedValue({
      provider: 'posthog',
      providerFeatureId: 'ph_new',
      providerEnvironmentStateId: 'env_1',
      slug: 'platform_test_flag',
      name: 'Test Flag',
      description: null,
      enabled: true,
      metadata: { key: 'platform_test_flag' },
    }),
    update: vi.fn().mockResolvedValue({
      provider: 'posthog',
      providerFeatureId: 'ph_1',
      providerEnvironmentStateId: 'env_1',
      slug: 'platform_test_flag',
      name: 'Test Flag',
      description: null,
      enabled: true,
      metadata: { updated: true },
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as FeatureFlagProvider
}

let repository: FeaturesRepository
let provider: FeatureFlagProvider
let deps: FeaturesDeps

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  repository = makeRepository()
  provider = makeProvider()
  deps = { repository, provider }
})

// ---------------------------------------------------------------------------
// helper prefix tests
// ---------------------------------------------------------------------------

describe('featurePrefixForAppSlug', () => {
  it('returns the platform mapping for known slugs', () => {
    expect(featurePrefixForAppSlug('876-enterprise')).toBe('enterprise')
    expect(featurePrefixForAppSlug('876-couriers')).toBe('couriers')
  })

  it('falls back to normalized slug without 876- prefix', () => {
    expect(featurePrefixForAppSlug('876-custom-app')).toBe('custom_app')
    expect(featurePrefixForAppSlug('my-app')).toBe('my_app')
  })
})

describe('featureSlugMatchesApp', () => {
  it('matches when slug starts with prefix_', () => {
    expect(featureSlugMatchesApp('enterprise_billing', '876-enterprise')).toBe(
      true
    )
  })

  it('does not match wrong prefix', () => {
    expect(featureSlugMatchesApp('platform_flag', '876-enterprise')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// require helpers
// ---------------------------------------------------------------------------

describe('requireFeature', () => {
  it('returns feature when found', async () => {
    const f = makeFeature()
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    const result = await requireFeature(deps, 'ftr_1')
    expect(result.id).toBe('ftr_1')
  })

  it('throws feature/not-found when missing', async () => {
    repository.getFeatureById = vi.fn().mockResolvedValue(null)

    await expect(requireFeature(deps, 'missing')).rejects.toMatchObject({
      code: 'feature/not-found',
    })
    await expect(requireFeature(deps, 'missing')).rejects.toBeInstanceOf(
      AppHttpError
    )
  })
})

describe('requireApp', () => {
  it('returns app when found', async () => {
    repository.findAppById = vi.fn().mockResolvedValue(makeApp() as never)
    const app = await requireApp(deps, 'app_1')
    expect(app.id).toBe('app_1')
  })

  it('throws app/not-found when missing', async () => {
    repository.findAppById = vi.fn().mockResolvedValue(null)
    await expect(requireApp(deps, 'missing')).rejects.toMatchObject({
      code: 'app/not-found',
    })
  })
})

describe('requireUser', () => {
  it('throws feature/user-not-found when missing', async () => {
    repository.findUserById = vi.fn().mockResolvedValue(null)
    await expect(requireUser(deps, 'user_1')).rejects.toMatchObject({
      code: 'feature/user-not-found',
    })
  })

  it('returns user when found', async () => {
    repository.findUserById = vi
      .fn()
      .mockResolvedValue({ id: 'user_1' } as never)
    const user = await requireUser(deps, 'user_1')
    expect(user.id).toBe('user_1')
  })
})

describe('requireOrganization', () => {
  it('throws feature/organization-not-found when missing', async () => {
    repository.findOrganizationById = vi.fn().mockResolvedValue(null)
    await expect(requireOrganization(deps, 'org_1')).rejects.toMatchObject({
      code: 'feature/organization-not-found',
    })
  })
})

// ---------------------------------------------------------------------------
// createFeature
// ---------------------------------------------------------------------------

describe('createFeature', () => {
  it('creates a platform feature with normalized slug and calls provider', async () => {
    const feature = await createFeature(deps, {
      name: 'Platform My Feature',
      slug: 'platform_my_feature',
      description: 'desc',
      defaultEnabled: true,
      scope: 'global',
      consumerDefaultEnabled: false,
      defaultValue: null,
      appId: null,
      tags: [],
      valueType: null,
      value: null,
      serverSideOnly: true,
      parentFeatureId: null,
    })

    expect(provider.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'platform_my_feature',
        description: 'desc',
        defaultEnabled: true,
        serverSideOnly: true,
      })
    )
    expect(repository.createFeature).toHaveBeenCalled()
    expect(feature.slug).toBe('platform_test_flag')
  })

  it('rejects a platform feature whose slug normalizes away the prefix', async () => {
    // A slug that normalizes to nothing cannot start with `platform_`, and a
    // feature with no app must (services/features.py:526). The unnamed_feature
    // fallback only applies once the app/prefix rule has been satisfied.
    await expect(
      createFeature(deps, {
        name: '!!!',
        slug: '!!!',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: null,
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: null,
      })
    ).rejects.toMatchObject({ code: 'feature/platform-prefix-mismatch' })
  })

  it('throws feature/platform-prefix-mismatch for platform-wide non-platform_ slug', async () => {
    provider.create = vi.fn()

    await expect(
      createFeature(deps, {
        name: 'Bad',
        slug: 'bad_flag',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: null,
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: null,
      })
    ).rejects.toMatchObject({ code: 'feature/platform-prefix-mismatch' })
    expect(provider.create).not.toHaveBeenCalled()
  })

  it('throws feature/app-prefix-mismatch when app slug prefix does not match', async () => {
    repository.findAppById = vi.fn().mockResolvedValue(
      makeApp({
        id: 'app_1',
        name: 'Couriers',
        slug: '876-couriers',
      }) as never
    )

    await expect(
      createFeature(deps, {
        name: 'Bad',
        slug: 'enterprise_bad',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: 'app_1',
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: null,
      })
    ).rejects.toMatchObject({ code: 'feature/app-prefix-mismatch' })
  })

  it('throws app/not-found when appId does not exist', async () => {
    repository.findAppById = vi.fn().mockResolvedValue(null)

    await expect(
      createFeature(deps, {
        name: 'Test',
        slug: 'platform_test',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: 'missing',
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: null,
      })
    ).rejects.toMatchObject({ code: 'app/not-found' })
  })

  it('throws feature/parent-app-mismatch when parent belongs to different app', async () => {
    repository.findAppById = vi
      .fn()
      .mockResolvedValue(
        makeApp({ id: 'app_1', slug: '876-couriers' }) as never
      )
    const parent = makeFeature({
      id: 'ftr_parent',
      slug: 'couriers_parent',
      appId: 'app_other',
    })
    repository.getFeatureById = vi.fn().mockResolvedValue(parent as never)
    provider.create = vi.fn().mockResolvedValue({
      provider: 'posthog',
      providerFeatureId: 'ph_3',
      providerEnvironmentStateId: null,
      slug: 'couriers_parent_child',
      name: 'child',
      description: null,
      enabled: false,
      metadata: {},
    })

    await expect(
      createFeature(deps, {
        name: 'child',
        slug: 'couriers_parent_child',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: 'app_1',
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: 'ftr_parent',
      })
    ).rejects.toMatchObject({ code: 'feature/parent-app-mismatch' })
  })

  it('throws feature/parent-prefix-mismatch when child slug does not start with parent slug', async () => {
    repository.findAppById = vi
      .fn()
      .mockResolvedValue(
        makeApp({ id: 'app_1', slug: '876-couriers' }) as never
      )
    const parent = makeFeature({
      id: 'ftr_parent',
      slug: 'couriers_parent',
      appId: 'app_1',
    })
    repository.getFeatureById = vi.fn().mockResolvedValue(parent as never)

    await expect(
      createFeature(deps, {
        name: 'child',
        slug: 'couriers_other',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: 'app_1',
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: 'ftr_parent',
      })
    ).rejects.toMatchObject({ code: 'feature/parent-prefix-mismatch' })
  })

  it('throws feature/not-found when parentFeatureId does not exist', async () => {
    repository.getFeatureById = vi.fn().mockResolvedValue(null)

    await expect(
      createFeature(deps, {
        name: 'child',
        slug: 'platform_child',
        description: null,
        defaultEnabled: false,
        scope: null,
        consumerDefaultEnabled: false,
        defaultValue: null,
        appId: null,
        tags: [],
        valueType: null,
        value: null,
        serverSideOnly: true,
        parentFeatureId: 'missing_parent',
      })
    ).rejects.toMatchObject({ code: 'feature/not-found' })
  })
})

// ---------------------------------------------------------------------------
// retrieve / list / search / grants
// ---------------------------------------------------------------------------

describe('retrieveFeature', () => {
  it('returns feature when found', async () => {
    const f = makeFeature()
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)
    const result = await retrieveFeature(deps, 'ftr_1')
    expect(result.id).toBe('ftr_1')
  })
})

describe('listFeatureGrants', () => {
  it('returns feature with org and user grants', async () => {
    const f = makeFeature()
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)
    repository.listOrgGrantsForFeature = vi
      .fn()
      .mockResolvedValue([{ id: 'ofe_1' }] as never)
    repository.listUserGrantsForFeature = vi
      .fn()
      .mockResolvedValue([{ id: 'ufe_1' }] as never)

    const [feature, orgGrants, userGrants] = await listFeatureGrants(
      deps,
      'ftr_1'
    )
    expect(feature.id).toBe('ftr_1')
    expect(orgGrants).toHaveLength(1)
    expect(userGrants).toHaveLength(1)
  })

  it('throws when feature not found', async () => {
    repository.getFeatureById = vi.fn().mockResolvedValue(null)
    await expect(listFeatureGrants(deps, 'missing')).rejects.toMatchObject({
      code: 'feature/not-found',
    })
  })
})

describe('listFeatures', () => {
  it('delegates to repository with defaults', async () => {
    const rows = [makeFeature()]
    repository.listFeatures = vi.fn().mockResolvedValue([rows as never, false])
    const [data, hasMore] = await listFeatures(deps, { limit: 10 })
    expect(data).toHaveLength(1)
    expect(hasMore).toBe(false)
    expect(repository.listFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    )
  })
})

describe('searchFeatures', () => {
  it('delegates to repository', async () => {
    const rows = [makeFeature()]
    repository.searchFeatures = vi.fn().mockResolvedValue(rows as never)
    const result = await searchFeatures(deps, { query: 'test' })
    expect(result).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// updateFeature
// ---------------------------------------------------------------------------

describe('updateFeature', () => {
  it('updates description and syncs to provider', async () => {
    const f = makeFeature({ providerMetadata: { existing: 1 } })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    const updated = await updateFeature(deps, 'ftr_1', {
      description: 'new desc',
      descriptionSet: true,
    })

    expect(provider.update).toHaveBeenCalledWith(
      expect.objectContaining({
        providerFeatureId: 'ph_1',
        description: 'new desc',
      })
    )
    expect(repository.updateFeature).toHaveBeenCalled()
    expect(updated).toBeDefined()
  })

  it('mirrors enabled into defaultValue for widget flags when defaultValue not supplied', async () => {
    const f = makeFeature({
      tags: ['widget'],
      defaultValue: false,
      enabled: false,
    })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    await updateFeature(deps, 'ftr_1', { enabled: true })

    expect(repository.updateFeature).toHaveBeenCalledWith(
      'ftr_1',
      expect.objectContaining({ enabled: true, defaultValue: true })
    )
  })

  it('does not mirror enabled when defaultValue is explicitly provided', async () => {
    const f = makeFeature({ tags: ['widget'], defaultValue: false })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    await updateFeature(deps, 'ftr_1', { enabled: true, defaultValue: false })

    expect(repository.updateFeature).toHaveBeenCalledWith(
      'ftr_1',
      expect.objectContaining({ enabled: true, defaultValue: false })
    )
  })

  it('throws feature/invalid-parent when parent is self', async () => {
    const f = makeFeature({ id: 'ftr_1' })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    await expect(
      updateFeature(deps, 'ftr_1', {
        parentFeatureId: 'ftr_1',
        parentFeatureIdSet: true,
      })
    ).rejects.toMatchObject({ code: 'feature/invalid-parent' })
  })

  it('throws feature/parent-app-mismatch and feature/parent-prefix-mismatch', async () => {
    const f = makeFeature({
      id: 'ftr_1',
      slug: 'platform_test_flag',
      appId: 'app_1',
    })
    const parent = makeFeature({
      id: 'ftr_parent',
      slug: 'platform_other',
      appId: 'app_2',
    })
    repository.getFeatureById = vi.fn().mockImplementation((id) => {
      if (id === 'ftr_1') return Promise.resolve(f as never)
      if (id === 'ftr_parent') return Promise.resolve(parent as never)
      return Promise.resolve(null)
    })

    await expect(
      updateFeature(deps, 'ftr_1', {
        parentFeatureId: 'ftr_parent',
        parentFeatureIdSet: true,
      })
    ).rejects.toMatchObject({ code: 'feature/parent-app-mismatch' })

    // prefix mismatch: same app but child slug does not start with parent slug
    const parentSameApp = makeFeature({
      id: 'ftr_parent2',
      slug: 'platform_parent',
      appId: 'app_1',
    })
    repository.getFeatureById = vi.fn().mockImplementation((id) => {
      if (id === 'ftr_1')
        return Promise.resolve({ ...f, slug: 'platform_other_child' } as never)
      if (id === 'ftr_parent2') return Promise.resolve(parentSameApp as never)
      return Promise.resolve(null)
    })

    await expect(
      updateFeature(deps, 'ftr_1', {
        parentFeatureId: 'ftr_parent2',
        parentFeatureIdSet: true,
      })
    ).rejects.toMatchObject({ code: 'feature/parent-prefix-mismatch' })
  })

  it('throws feature/provider-not-configured when provider mapping missing but provider field changed', async () => {
    const f = makeFeature({ provider: 'flagsmith', providerFeatureId: null })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    await expect(
      updateFeature(deps, 'ftr_1', { enabled: true })
    ).rejects.toMatchObject({ code: 'feature/provider-not-configured' })
  })

  it('sets archivedAt when archived true and clears when false', async () => {
    const f = makeFeature()
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    await updateFeature(deps, 'ftr_1', { archived: true })
    expect(repository.updateFeature).toHaveBeenCalledWith(
      'ftr_1',
      expect.objectContaining({ archivedAt: BigInt(NOW) })
    )

    await updateFeature(deps, 'ftr_1', { archived: false })
    expect(repository.updateFeature).toHaveBeenCalledWith(
      'ftr_1',
      expect.objectContaining({ archivedAt: null })
    )
  })

  it('validates app prefix when appId is changed', async () => {
    const f = makeFeature({ slug: 'platform_flag' })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)
    repository.findAppById = vi
      .fn()
      .mockResolvedValue(
        makeApp({ slug: '876-couriers', name: 'Couriers' }) as never
      )

    await expect(
      updateFeature(deps, 'ftr_1', { appId: 'app_1', appIdSet: true })
    ).rejects.toMatchObject({ code: 'feature/app-prefix-mismatch' })
  })

  it('throws feature/not-found when feature does not exist', async () => {
    repository.getFeatureById = vi.fn().mockResolvedValue(null)
    await expect(updateFeature(deps, 'missing', {})).rejects.toMatchObject({
      code: 'feature/not-found',
    })
  })
})

// ---------------------------------------------------------------------------
// deleteFeature
// ---------------------------------------------------------------------------

describe('deleteFeature', () => {
  it('deletes via provider and repository and returns id', async () => {
    const f = makeFeature()
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)

    const id = await deleteFeature(deps, 'ftr_1')
    expect(id).toBe('ftr_1')
    expect(provider.delete).toHaveBeenCalledWith({ providerFeatureId: 'ph_1' })
    expect(repository.deleteFeature).toHaveBeenCalledWith('ftr_1')
  })

  it('throws feature/not-found when missing', async () => {
    repository.getFeatureById = vi.fn().mockResolvedValue(null)
    await expect(deleteFeature(deps, 'missing')).rejects.toMatchObject({
      code: 'feature/not-found',
    })
  })

  it('throws feature/provider-not-configured when no mapping', async () => {
    const f = makeFeature({ provider: 'flagsmith', providerFeatureId: null })
    repository.getFeatureById = vi.fn().mockResolvedValue(f as never)
    await expect(deleteFeature(deps, 'ftr_1')).rejects.toMatchObject({
      code: 'feature/provider-not-configured',
    })
  })
})

// ---------------------------------------------------------------------------
// User / Org grants
// ---------------------------------------------------------------------------

describe('grantUserFeature', () => {
  it('grants and returns with feature', async () => {
    repository.findUserById = vi
      .fn()
      .mockResolvedValue({ id: 'user_1' } as never)
    repository.getFeatureById = vi
      .fn()
      .mockResolvedValue(makeFeature({ scope: 'global' }) as never)

    const grant = await grantUserFeature(deps, 'user_1', 'ftr_1', {
      enabled: true,
      note: 'reason',
    })
    expect(grant.feature?.id).toBe('ftr_1')
    expect(grant.status).toBe('enabled')
  })

  it('throws feature/scope-mismatch for enterprise-scoped feature', async () => {
    repository.findUserById = vi
      .fn()
      .mockResolvedValue({ id: 'user_1' } as never)
    repository.getFeatureById = vi
      .fn()
      .mockResolvedValue(makeFeature({ scope: 'enterprise' }) as never)

    await expect(
      grantUserFeature(deps, 'user_1', 'ftr_1')
    ).rejects.toMatchObject({
      code: 'feature/scope-mismatch',
    })
  })

  it('throws feature/user-not-found when user missing', async () => {
    repository.findUserById = vi.fn().mockResolvedValue(null)
    await expect(
      grantUserFeature(deps, 'missing', 'ftr_1')
    ).rejects.toMatchObject({
      code: 'feature/user-not-found',
    })
  })
})

describe('grantOrgFeature', () => {
  it('throws feature/scope-mismatch for consumer-scoped feature', async () => {
    repository.findOrganizationById = vi
      .fn()
      .mockResolvedValue({ id: 'org_1' } as never)
    repository.getFeatureById = vi
      .fn()
      .mockResolvedValue(makeFeature({ scope: 'consumer' }) as never)

    await expect(grantOrgFeature(deps, 'org_1', 'ftr_1')).rejects.toMatchObject(
      {
        code: 'feature/scope-mismatch',
      }
    )
  })

  it('throws feature/organization-not-found when org missing', async () => {
    repository.findOrganizationById = vi.fn().mockResolvedValue(null)
    await expect(
      grantOrgFeature(deps, 'missing', 'ftr_1')
    ).rejects.toMatchObject({
      code: 'feature/organization-not-found',
    })
  })
})

describe('listUserFeatures / listOrgFeatures', () => {
  it('lists after verifying existence', async () => {
    repository.findUserById = vi
      .fn()
      .mockResolvedValue({ id: 'user_1' } as never)
    repository.listUserFeatures = vi
      .fn()
      .mockResolvedValue([{ id: 'ufe_1' }] as never)
    const result = await listUserFeatures(deps, 'user_1')
    expect(result).toHaveLength(1)
  })

  it('throws when user missing', async () => {
    repository.findUserById = vi.fn().mockResolvedValue(null)
    await expect(listUserFeatures(deps, 'missing')).rejects.toMatchObject({
      code: 'feature/user-not-found',
    })
  })

  it('lists org features after verifying existence', async () => {
    repository.findOrganizationById = vi
      .fn()
      .mockResolvedValue({ id: 'org_1' } as never)
    repository.listOrgFeatures = vi
      .fn()
      .mockResolvedValue([{ id: 'ofe_1' }] as never)
    const result = await listOrgFeatures(deps, 'org_1')
    expect(result).toHaveLength(1)
  })
})

describe('updateUserFeature', () => {
  it('throws user-feature/not-found when grant missing', async () => {
    repository.getUserFeature = vi.fn().mockResolvedValue(null)
    await expect(
      updateUserFeature(deps, 'user_1', 'ftr_1', {})
    ).rejects.toMatchObject({
      code: 'user-feature/not-found',
    })
  })

  it('updates enabled and note via re-grant', async () => {
    const grant = {
      id: 'ufe_1',
      userId: 'user_1',
      featureId: 'ftr_1',
      status: 'enabled',
      note: null,
    }
    repository.getUserFeature = vi.fn().mockResolvedValue(grant as never)
    repository.getFeatureById = vi
      .fn()
      .mockResolvedValue(makeFeature() as never)

    const updated = await updateUserFeature(deps, 'user_1', 'ftr_1', {
      enabled: false,
      note: 'off',
    })
    expect(repository.grantUserFeature).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_1', enabled: false, note: 'off' })
    )
    expect(updated.feature?.id).toBe('ftr_1')
  })
})

describe('revokeUserFeature', () => {
  it('revokes and returns grant id', async () => {
    repository.getUserFeature = vi
      .fn()
      .mockResolvedValue({ id: 'ufe_1' } as never)
    const id = await revokeUserFeature(deps, 'user_1', 'ftr_1')
    expect(id).toBe('ufe_1')
    expect(repository.revokeUserFeature).toHaveBeenCalledWith('user_1', 'ftr_1')
  })

  it('throws user-feature/not-found when missing', async () => {
    repository.getUserFeature = vi.fn().mockResolvedValue(null)
    await expect(
      revokeUserFeature(deps, 'user_1', 'ftr_1')
    ).rejects.toMatchObject({
      code: 'user-feature/not-found',
    })
  })
})

describe('updateOrgFeature', () => {
  it('throws org-feature/not-found when grant missing', async () => {
    repository.getOrgFeature = vi.fn().mockResolvedValue(null)
    await expect(
      updateOrgFeature(deps, 'org_1', 'ftr_1', {})
    ).rejects.toMatchObject({
      code: 'org-feature/not-found',
    })
  })

  it('updates enabled', async () => {
    const grant = {
      id: 'ofe_1',
      organizationId: 'org_1',
      featureId: 'ftr_1',
      status: 'enabled',
      note: null,
    }
    repository.getOrgFeature = vi.fn().mockResolvedValue(grant as never)
    repository.getFeatureById = vi
      .fn()
      .mockResolvedValue(makeFeature() as never)

    const updated = await updateOrgFeature(deps, 'org_1', 'ftr_1', {
      enabled: false,
    })
    expect(repository.grantOrgFeature).toHaveBeenCalled()
    expect(updated.feature?.id).toBe('ftr_1')
  })
})

describe('revokeOrgFeature', () => {
  it('revokes and returns grant id', async () => {
    repository.getOrgFeature = vi
      .fn()
      .mockResolvedValue({ id: 'ofe_1' } as never)
    const id = await revokeOrgFeature(deps, 'org_1', 'ftr_1')
    expect(id).toBe('ofe_1')
  })

  it('throws org-feature/not-found when missing', async () => {
    repository.getOrgFeature = vi.fn().mockResolvedValue(null)
    await expect(
      revokeOrgFeature(deps, 'org_1', 'ftr_1')
    ).rejects.toMatchObject({
      code: 'org-feature/not-found',
    })
  })
})

// ---------------------------------------------------------------------------
// evaluate
// ---------------------------------------------------------------------------

describe('evaluate', () => {
  it('returns enabled non-widget features', async () => {
    const f1 = makeFeature({ id: 'ftr_1', enabled: true, tags: [] })
    const f2 = makeFeature({ id: 'ftr_2', enabled: false, tags: [] })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([f1, f2] as never)

    const result = await evaluate(deps, {})
    expect(result.map((f) => f.id)).toEqual(['ftr_1'])
  })

  it('widget flags require both enabled and defaultValue', async () => {
    const widgetOn = makeFeature({
      id: 'ftr_w1',
      enabled: true,
      defaultValue: true,
      tags: ['widget'],
    })
    const widgetOff = makeFeature({
      id: 'ftr_w2',
      enabled: true,
      defaultValue: false,
      tags: ['widget'],
    })
    const widgetDisabled = makeFeature({
      id: 'ftr_w3',
      enabled: false,
      defaultValue: true,
      tags: ['widget'],
    })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([widgetOn, widgetOff, widgetDisabled] as never)

    const result = await evaluate(deps, {})
    expect(result.map((f) => f.id)).toEqual(['ftr_w1'])
  })

  it('plan gating: root gated flags enabled only when in moduleFeatureIds', async () => {
    const app = makeApp({ id: 'app_1', appKind: 'product' })
    repository.findAppById = vi.fn().mockResolvedValue(app as never)
    const root = makeFeature({
      id: 'ftr_root',
      enabled: true,
      appId: 'app_1',
      parentFeatureId: null,
    })
    const child = makeFeature({
      id: 'ftr_child',
      enabled: true,
      appId: 'app_1',
      parentFeatureId: 'ftr_root',
    })
    const ungated = makeFeature({
      id: 'ftr_ungated',
      enabled: true,
      appId: 'app_1',
      parentFeatureId: null,
    })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([root, child, ungated] as never)
    repository.listPlanModuleFeatureIds = vi
      .fn()
      .mockResolvedValue(new Set(['ftr_root']))
    repository.listModuleFeatureIds = vi
      .fn()
      .mockResolvedValue(new Set(['ftr_root']))

    const result = await evaluate(deps, {
      appId: 'app_1',
      organizationId: 'org_1',
    })
    expect(result.map((f) => f.id)).toContain('ftr_root')
    expect(result.map((f) => f.id)).toContain('ftr_child')
    expect(result.map((f) => f.id)).toContain('ftr_ungated')
  })

  it('plan gating: gated flag not in plan is excluded', async () => {
    const app = makeApp({ id: 'app_1', appKind: 'product' })
    repository.findAppById = vi.fn().mockResolvedValue(app as never)
    const gated = makeFeature({
      id: 'ftr_gated',
      enabled: true,
      appId: 'app_1',
    })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([gated] as never)
    repository.listPlanModuleFeatureIds = vi.fn().mockResolvedValue(new Set())
    repository.listModuleFeatureIds = vi
      .fn()
      .mockResolvedValue(new Set(['ftr_gated']))

    const result = await evaluate(deps, {
      appId: 'app_1',
      organizationId: 'org_1',
    })
    expect(result).toHaveLength(0)
  })

  it('platform flags (appId null) ignore plan gating', async () => {
    const app = makeApp({ id: 'app_1', appKind: 'product' })
    repository.findAppById = vi.fn().mockResolvedValue(app as never)
    const platform = makeFeature({ id: 'ftr_plat', enabled: true, appId: null })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([platform] as never)
    repository.listPlanModuleFeatureIds = vi.fn().mockResolvedValue(new Set())
    repository.listModuleFeatureIds = vi
      .fn()
      .mockResolvedValue(new Set(['ftr_plat']))

    const result = await evaluate(deps, {
      appId: 'app_1',
      organizationId: 'org_1',
    })
    expect(result.map((f) => f.id)).toEqual(['ftr_plat'])
  })

  it('org and user grants override decisions', async () => {
    const f = makeFeature({ id: 'ftr_1', enabled: false, tags: [] })
    repository.listEvaluationFeatures = vi.fn().mockResolvedValue([f] as never)
    repository.listOrgFeatures = vi
      .fn()
      .mockResolvedValue([{ featureId: 'ftr_1', status: 'enabled' }] as never)
    repository.listUserFeatures = vi
      .fn()
      .mockResolvedValue([{ featureId: 'ftr_1', status: 'disabled' }] as never)

    // Org enables, then user disables -> final disabled, and parent chain requires enabled
    const resultOrgOnly = await evaluate(deps, { organizationId: 'org_1' })
    // enabled false but org grant enables decision, but resolve still checks feature.enabled
    // Python: allowed = bool(feature.enabled and decisions[feature.id])
    // feature.enabled is false, so even with grant, result is false -> not returned
    expect(resultOrgOnly).toHaveLength(0)

    // Now enabled true, org disables etc
    const fEnabled = makeFeature({ id: 'ftr_1', enabled: true, tags: [] })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([fEnabled] as never)
    repository.listOrgFeatures = vi
      .fn()
      .mockResolvedValue([{ featureId: 'ftr_1', status: 'disabled' }] as never)
    repository.listUserFeatures = vi.fn().mockResolvedValue([] as never)
    const resultDisabled = await evaluate(deps, { organizationId: 'org_1' })
    expect(resultDisabled).toHaveLength(0)

    // User grant re-enables
    repository.listUserFeatures = vi
      .fn()
      .mockResolvedValue([{ featureId: 'ftr_1', status: 'enabled' }] as never)
    const resultUserEnabled = await evaluate(deps, {
      organizationId: 'org_1',
      userId: 'user_1',
    })
    expect(resultUserEnabled.map((f) => f.id)).toEqual(['ftr_1'])
  })

  it('parent chain: disabled parent excludes child even with grant', async () => {
    const parent = makeFeature({ id: 'ftr_parent', enabled: false, tags: [] })
    const child = makeFeature({
      id: 'ftr_child',
      enabled: true,
      parentFeatureId: 'ftr_parent',
      tags: [],
    })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([parent, child] as never)
    repository.listOrgFeatures = vi.fn().mockResolvedValue([
      { featureId: 'ftr_child', status: 'enabled' },
      { featureId: 'ftr_parent', status: 'enabled' },
    ] as never)

    const result = await evaluate(deps, { organizationId: 'org_1' })
    // parent.enabled is false, so resolve(parent) false -> child false
    expect(result).toHaveLength(0)
  })

  it('handles circular parent reference without infinite loop', async () => {
    const a = makeFeature({
      id: 'ftr_a',
      enabled: true,
      parentFeatureId: 'ftr_b',
    })
    const b = makeFeature({
      id: 'ftr_b',
      enabled: true,
      parentFeatureId: 'ftr_a',
    })
    repository.listEvaluationFeatures = vi
      .fn()
      .mockResolvedValue([a, b] as never)

    const result = await evaluate(deps, {})
    // Circular resolves to false for at least one due to resolving set guard
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('throws app/not-found when appId does not exist', async () => {
    repository.findAppById = vi.fn().mockResolvedValue(null)
    await expect(evaluate(deps, { appId: 'missing' })).rejects.toMatchObject({
      code: 'app/not-found',
    })
  })

  it('throws feature/app-mismatch when appId and appSlug differ', async () => {
    repository.findAppById = vi
      .fn()
      .mockResolvedValue(
        makeApp({ id: 'app_1', slug: '876-enterprise' }) as never
      )
    await expect(
      evaluate(deps, { appId: 'app_1', appSlug: '876-couriers' })
    ).rejects.toMatchObject({
      code: 'feature/app-mismatch',
    })
  })

  it('throws app/not-found when appSlug does not exist', async () => {
    repository.findAppBySlug = vi.fn().mockResolvedValue(null)
    await expect(evaluate(deps, { appSlug: 'unknown' })).rejects.toMatchObject({
      code: 'app/not-found',
    })
  })

  it('resolves app via slug when appId absent', async () => {
    const app = makeApp({ id: 'app_2', slug: '876-couriers' })
    repository.findAppBySlug = vi.fn().mockResolvedValue(app as never)
    repository.listEvaluationFeatures = vi.fn().mockResolvedValue([] as never)
    const result = await evaluate(deps, { appSlug: '876-couriers' })
    expect(result).toEqual([])
    expect(repository.listEvaluationFeatures).toHaveBeenCalledWith('app_2')
  })
})
