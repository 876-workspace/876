import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSettings = vi.hoisted(() => ({
  environment: 'test',
  logLevel: 'silent',
  posthog: {
    personalApiKey: 'phx_personal_key',
    projectId: 1,
    host: 'https://us.i.posthog.com',
  },
  featureFlags: {
    syncIntervalSeconds: 300,
  },
}))
const posthogClient = vi.hoisted(() => ({ listFeatures: vi.fn() }))
const repository = vi.hoisted(() => ({
  listFeatureFlagsForSync: vi.fn(),
  updateFeatureFlagForSync: vi.fn(),
}))

vi.mock('@/config', () => ({ getSettings: vi.fn(() => mockSettings) }))
vi.mock('@/providers/posthog/client', () => ({
  getPostHogClient: vi.fn(() => posthogClient),
}))
vi.mock('../feature-flag-sync.repository', () => repository)

const NOW = 1_700_000_000

function localFeature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ftr_1',
    provider: 'posthog',
    providerFeatureId: 'ph_1',
    slug: 'platform_test_flag',
    enabled: true,
    providerMetadata: {
      active: true,
      filters: { groups: [] },
      rollout_percentage: null,
      variants: null,
      deleted: false,
    },
    ...overrides,
  }
}

function providerFeature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ph_1',
    key: 'platform_test_flag',
    active: true,
    filters: { groups: [] },
    rollout_percentage: null,
    variants: null,
    deleted: false,
    ...overrides,
  }
}

describe('feature-flag-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW * 1000)
    mockSettings.posthog.personalApiKey = 'phx_personal_key'
    mockSettings.posthog.projectId = 1
    mockSettings.posthog.host = 'https://us.i.posthog.com'
    posthogClient.listFeatures.mockResolvedValue([])
    repository.listFeatureFlagsForSync.mockResolvedValue([])
    repository.updateFeatureFlagForSync.mockResolvedValue(undefined)
  })

  it('does not update an unchanged local mirror row', async () => {
    posthogClient.listFeatures.mockResolvedValue([providerFeature()])
    repository.listFeatureFlagsForSync.mockResolvedValue([localFeature()])
    const { syncFeatureFlagsOnce } = await import('../feature-flag-sync')

    const result = await syncFeatureFlagsOnce()

    expect(result).toEqual({
      configured: true,
      scanned: 1,
      updated: 0,
      unmapped: 0,
      missing: 0,
    })
    expect(repository.updateFeatureFlagForSync).not.toHaveBeenCalled()
  })

  it('writes changed active state and sync timestamps', async () => {
    posthogClient.listFeatures.mockResolvedValue([
      providerFeature({ active: false }),
    ])
    repository.listFeatureFlagsForSync.mockResolvedValue([localFeature()])
    const { syncFeatureFlagsOnce } = await import('../feature-flag-sync')

    const result = await syncFeatureFlagsOnce()

    expect(result).toEqual({
      configured: true,
      scanned: 1,
      updated: 1,
      unmapped: 0,
      missing: 0,
    })
    expect(repository.updateFeatureFlagForSync).toHaveBeenCalledWith('ftr_1', {
      provider: 'posthog',
      providerFeatureId: 'ph_1',
      enabled: false,
      providerMetadata: {
        active: false,
        filters: { groups: [] },
        rollout_percentage: null,
        variants: null,
        deleted: false,
      },
      syncedAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    })
  })

  it('counts an unmapped provider key without writing a row', async () => {
    posthogClient.listFeatures.mockResolvedValue([
      providerFeature({ key: 'platform_unmapped' }),
    ])
    repository.listFeatureFlagsForSync.mockResolvedValue([])
    const { syncFeatureFlagsOnce } = await import('../feature-flag-sync')

    const result = await syncFeatureFlagsOnce()

    expect(result).toEqual({
      configured: true,
      scanned: 1,
      updated: 0,
      unmapped: 1,
      missing: 0,
    })
    expect(repository.updateFeatureFlagForSync).not.toHaveBeenCalled()
  })

  it('counts a missing provider flag without modifying the local row', async () => {
    repository.listFeatureFlagsForSync.mockResolvedValue([localFeature()])
    const { syncFeatureFlagsOnce } = await import('../feature-flag-sync')

    const result = await syncFeatureFlagsOnce()

    expect(result).toEqual({
      configured: true,
      scanned: 0,
      updated: 0,
      unmapped: 0,
      missing: 1,
    })
    expect(repository.updateFeatureFlagForSync).not.toHaveBeenCalled()
  })

  it('returns unconfigured without calling PostHog or the repository', async () => {
    mockSettings.posthog.personalApiKey = ''
    const { syncFeatureFlagsOnce } = await import('../feature-flag-sync')

    const result = await syncFeatureFlagsOnce()

    expect(result).toEqual({
      configured: false,
      scanned: 0,
      updated: 0,
      unmapped: 0,
      missing: 0,
    })
    expect(posthogClient.listFeatures).not.toHaveBeenCalled()
    expect(repository.listFeatureFlagsForSync).not.toHaveBeenCalled()
  })
})
